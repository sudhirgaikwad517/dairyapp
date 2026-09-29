import { Request, Response } from 'express';
import crypto from 'crypto';
import { customerAuthService } from '../services/CustomerAuthService';
import { activityLogService } from '../services/ActivityLogService';
import { razorpayService } from '../services/RazorpayService';
import prisma from '../db/prisma';

// "Pay Online" credits the wallet instantly against a verified Razorpay
// payment. "Request Cash" instead lets a customer flag that they'll hand cash
// to the delivery staff — it stays pending (held in reservedBalance) until an
// admin approves it, at which point it becomes a normal wallet_transactions
// credit, same as an online top-up.
const ONLINE_TOPUP_MIN = 1;
const ONLINE_TOPUP_MAX = 30000;
const CASH_REQUEST_MIN = 1;
const CASH_REQUEST_MAX = 10000;

export class WalletController {
  public async show(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);

      if (!customer) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });
      }

      const [wallet, transactions, cashRequests] = await Promise.all([
        prisma.customer_wallets.findUnique({ where: { customer_id: customer.id } }),
        prisma.wallet_transactions.findMany({
          where: { customer_id: customer.id },
          orderBy: { created_at: 'desc' },
          take: 50
        }),
        prisma.wallet_cash_requests.findMany({
          where: { customer_id: customer.id },
          orderBy: { created_at: 'desc' },
          take: 20
        })
      ]);

      const balance = wallet ? Number(wallet.balance) : 0;

      // Only pending requests hold money aside; once approved the credit
      // shows up as a normal transaction, and once rejected nothing is held.
      const reservedBalance = cashRequests
        .filter((r: any) => r.status === 'pending')
        .reduce((sum: number, r: any) => sum + Number(r.amount), 0);

      const mappedTransactions = transactions.map((tx: any) => ({
        id: tx.id,
        kind: 'transaction',
        type: tx.type,
        amount: Number(tx.amount),
        balanceAfter: Number(tx.balance_after),
        referenceType: tx.reference_type,
        referenceId: tx.reference_id,
        notes: tx.notes,
        status: 'completed',
        createdAt: tx.created_at
      }));

      // An approved request already has its own wallet_transactions row
      // (reference_type "topup_cash") — showing it again here would duplicate
      // the same credit in the history list.
      const mappedCashRequests = cashRequests
        .filter((r: any) => r.status !== 'approved')
        .map((r: any) => ({
          id: r.id,
          kind: 'cash_request',
          type: 'credit',
          amount: Number(r.amount),
          balanceAfter: null,
          referenceType: 'cash_request',
          referenceId: null,
          notes: r.status === 'rejected'
            ? (r.notes || 'Cash request was declined')
            : `Cash pickup requested for ${r.requested_date.toISOString().slice(0, 10)}`,
          status: r.status,
          createdAt: r.created_at
        }));

      const history = [...mappedTransactions, ...mappedCashRequests].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return res.status(200).json({
        success: true,
        data: {
          balance,
          reservedBalance,
          transactions: mappedTransactions,
          cashRequests: mappedCashRequests,
          history,
          limits: {
            online: { min: ONLINE_TOPUP_MIN, max: ONLINE_TOPUP_MAX },
            cash: { min: CASH_REQUEST_MIN, max: CASH_REQUEST_MAX }
          }
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async topUp(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);

      if (!customer) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });
      }

      const { amount, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      if (!amount || typeof amount !== 'number' || amount < ONLINE_TOPUP_MIN || amount > ONLINE_TOPUP_MAX) {
        return res.status(422).json({
          success: false,
          message: `Amount must be between ${ONLINE_TOPUP_MIN} and ${ONLINE_TOPUP_MAX}`
        });
      }

      // A top-up may only credit the wallet against a payment Razorpay actually
      // signed — otherwise anyone logged in could hand themselves free balance.
      if (!razorpayService.isConfigured) {
        return res.status(503).json({
          success: false,
          errorCode: 'RAZORPAY_NOT_CONFIGURED',
          message: 'Online payment is not available right now'
        });
      }

      if (!razorpayService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
        return res.status(422).json({
          success: false,
          errorCode: 'PAYMENT_VERIFICATION_FAILED',
          message: 'Payment could not be verified'
        });
      }

      // Signature alone only proves the payload was signed — also confirm with
      // Razorpay that the money was actually collected before crediting.
      if (!(await razorpayService.isPaymentCaptured(razorpayPaymentId))) {
        return res.status(422).json({
          success: false,
          errorCode: 'PAYMENT_NOT_CAPTURED',
          message: 'Payment has not been completed'
        });
      }

      // Trust Razorpay's amount, never the client's.
      const paidOrder = await razorpayService.fetchOrder(razorpayOrderId);
      if (!paidOrder) {
        return res.status(422).json({ success: false, errorCode: 'PAYMENT_NOT_FOUND', message: 'Payment could not be verified' });
      }
      const paidAmount = Math.round(paidOrder.amount) / 100;
      if (paidAmount !== amount) {
        return res.status(422).json({
          success: false,
          errorCode: 'AMOUNT_MISMATCH',
          message: 'Paid amount does not match the requested top-up'
        });
      }

      // Guard against the same payment being submitted twice.
      const alreadyCredited = await prisma.wallet_transactions.findFirst({
        where: { customer_id: customer.id, reference_id: razorpayPaymentId }
      });
      if (alreadyCredited) {
        const wallet = await prisma.customer_wallets.findUnique({ where: { customer_id: customer.id } });
        return res.status(200).json({
          success: true,
          data: { balance: wallet ? Number(wallet.balance) : 0, alreadyCredited: true }
        });
      }

      // Add balance in a transaction
      const updatedBalance = await prisma.$transaction(async (tx: any) => {
        let wallet = await tx.customer_wallets.findUnique({ where: { customer_id: customer.id } });
        if (!wallet) {
          wallet = await tx.customer_wallets.create({
            data: { id: crypto.randomUUID(), customer_id: customer.id, balance: 0, created_at: new Date(), updated_at: new Date() }
          });
        }

        const newBalance = Number(wallet.balance) + amount;
        await tx.customer_wallets.update({
          where: { customer_id: customer.id },
          data: { balance: newBalance, updated_at: new Date() }
        });

        await tx.wallet_transactions.create({
          data: {
            id: crypto.randomUUID(),
            customer_id: customer.id,
            type: 'credit',
            amount,
            balance_after: newBalance,
            reference_type: 'topup_online',
            reference_id: razorpayPaymentId,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        return newBalance;
      });

      await activityLogService.log({
        type: 'wallet',
        title: 'Wallet Credited',
        message: `${customer.name || customer.phone} added ₹${amount} into the wallet.`,
        customerId: customer.id
      });

      return res.status(200).json({ success: true, data: { balance: updatedBalance } });
    } catch (error) {
      console.error(error);
      return res.status(422).json({ success: false, errorCode: 'WALLET_ERROR', message: 'Unable to top up wallet' });
    }
  }

  /// "Request Cash" — flags that the customer will hand cash to the delivery
  /// staff. Creates a pending request; nothing is credited until an admin
  /// approves it from the admin panel.
  public async requestCash(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);

      if (!customer) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });
      }

      const { amount, requestedDate, email } = req.body;
      if (!amount || typeof amount !== 'number' || amount < CASH_REQUEST_MIN || amount > CASH_REQUEST_MAX) {
        return res.status(422).json({
          success: false,
          message: `Amount must be between ${CASH_REQUEST_MIN} and ${CASH_REQUEST_MAX}`
        });
      }

      const parsedDate = new Date(requestedDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(422).json({ success: false, message: 'Please choose a valid date' });
      }
      // A pickup can't be requested for a day that has already passed.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate < today) {
        return res.status(422).json({ success: false, message: 'Pickup date cannot be in the past' });
      }

      const trimmedEmail = typeof email === 'string' ? email.trim() : '';
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(422).json({ success: false, message: 'Please enter a valid email' });
      }

      const now = new Date();
      await prisma.wallet_cash_requests.create({
        data: {
          id: crypto.randomUUID(),
          customer_id: customer.id,
          amount: Math.round(amount),
          requested_date: parsedDate,
          email: trimmedEmail || null,
          status: 'pending',
          created_at: now,
          updated_at: now
        }
      });

      await activityLogService.log({
        type: 'wallet',
        title: 'Cash Pickup Requested',
        message: `${customer.name || customer.phone} requested a ₹${amount} cash pickup for the wallet.`,
        customerId: customer.id
      });

      return res.status(200).json({ success: true, message: 'Your cash request has been sent for approval.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Unable to submit your request' });
    }
  }
}

export const walletController = new WalletController();
