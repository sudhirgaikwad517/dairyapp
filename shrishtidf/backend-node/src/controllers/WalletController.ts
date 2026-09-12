import { Request, Response } from 'express';
import { customerAuthService } from '../services/CustomerAuthService';
import { activityLogService } from '../services/ActivityLogService';
import prisma from '../db/prisma';

export class WalletController {
  public async show(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);

      if (!customer) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });
      }

      const wallet = await prisma.customer_wallets.findUnique({
        where: { customer_id: customer.id }
      });
      const balance = wallet ? Number(wallet.balance) : 0;

      const transactions = await prisma.wallet_transactions.findMany({
        where: { customer_id: customer.id },
        orderBy: { created_at: 'desc' },
        take: 50
      });

      return res.status(200).json({
        success: true,
        data: {
          balance,
          transactions: transactions.map((tx: any) => ({
            id: tx.id,
            type: tx.type,
            amount: Number(tx.amount),
            balanceAfter: Number(tx.balance_after),
            referenceType: tx.reference_type,
            referenceId: tx.reference_id,
            notes: tx.notes,
            createdAt: tx.created_at
          }))
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

      const { amount } = req.body;
      if (!amount || typeof amount !== 'number' || amount < 100 || amount > 50000) {
        return res.status(422).json({ success: false, message: 'Amount must be between 100 and 50000' });
      }

      // Add balance in a transaction
      const updatedBalance = await prisma.$transaction(async (tx: any) => {
        let wallet = await tx.customer_wallets.findUnique({ where: { customer_id: customer.id } });
        if (!wallet) {
          wallet = await tx.customer_wallets.create({
            data: { id: require('crypto').randomUUID(), customer_id: customer.id, balance: 0, created_at: new Date(), updated_at: new Date() }
          });
        }

        const newBalance = Number(wallet.balance) + amount;
        await tx.customer_wallets.update({
          where: { customer_id: customer.id },
          data: { balance: newBalance, updated_at: new Date() }
        });

        await tx.wallet_transactions.create({
          data: {
            id: require('crypto').randomUUID(),
            customer_id: customer.id,
            type: 'credit',
            amount,
            balance_after: newBalance,
            reference_type: 'topup_online',
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
}

export const walletController = new WalletController();
