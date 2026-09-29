import { Request, Response } from 'express';
import { checkoutService } from '../services/CheckoutService';
import { customerAuthService } from '../services/CustomerAuthService';
import { razorpayService } from '../services/RazorpayService';
import { computeSubscriptionQuote } from '../services/SubscriptionPricingService';

export class PaymentController {
  /** Creates a Razorpay order for the current cart (checkout flow). */
  public async createRazorpayOrder(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id || 'default-session';
      const { pincode, walletAmount } = req.body;

      if (!razorpayService.isConfigured) {
        return res.status(503).json({
          success: false,
          errorCode: 'RAZORPAY_NOT_CONFIGURED',
          message: 'Online payment is not available right now'
        });
      }

      if (!pincode) return res.status(422).json({ success: false, message: 'Pincode required' });

      let quote;
      try {
        quote = await checkoutService.quote(sessionId, pincode);
      } catch (e) {
        return res.status(400).json({ success: false, errorCode: 'CHECKOUT_ERROR', message: 'Unable to calculate order total' });
      }

      if (quote.cart.items.length === 0) {
        return res.status(400).json({ success: false, errorCode: 'CART_EMPTY', message: 'Cart is empty' });
      }
      if (!quote.pincode.serviceable) {
        return res.status(422).json({ success: false, errorCode: 'PINCODE_NOT_SERVICEABLE', message: 'Delivery not available' });
      }
      if (!quote.meetsMinimum) {
        return res.status(422).json({ success: false, errorCode: 'BELOW_MINIMUM_ORDER', message: 'Order does not meet minimum value' });
      }

      const wallet = Math.max(0, Number(walletAmount) || 0);
      const payable = Math.max(1, quote.totalAmount - wallet);
      const receipt = `sdf_${sessionId.substring(0, 8)}_${Date.now()}`;

      const order = await razorpayService.createOrder(payable * 100, receipt, { purpose: 'order' });

      return res.status(200).json({
        success: true,
        data: {
          razorpay: {
            configured: true,
            keyId: razorpayService.publishableKeyId,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
          },
          payableAmount: payable,
          quoteTotal: quote.totalAmount
        }
      });
    } catch (error: any) {
      if (error.message === 'RAZORPAY_ORDER_FAILED' || error.message === 'RAZORPAY_NOT_CONFIGURED') {
        return res.status(502).json({
          success: false,
          errorCode: error.message,
          message: 'Unable to start the payment. Please try again.'
        });
      }
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  /** Creates a Razorpay order for a wallet top-up. */
  public async createWalletTopUpOrder(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });
      }

      if (!razorpayService.isConfigured) {
        return res.status(503).json({
          success: false,
          errorCode: 'RAZORPAY_NOT_CONFIGURED',
          message: 'Online payment is not available right now'
        });
      }

      const amount = Number(req.body?.amount);
      if (!amount || amount < 100 || amount > 50000) {
        return res.status(422).json({ success: false, message: 'Amount must be between 100 and 50000' });
      }

      const receipt = `sdf_wallet_${customer.id.substring(0, 8)}_${Date.now()}`;
      const order = await razorpayService.createOrder(Math.round(amount) * 100, receipt, {
        purpose: 'wallet_topup',
        customerId: customer.id
      });

      return res.status(200).json({
        success: true,
        data: {
          configured: true,
          keyId: razorpayService.publishableKeyId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency
        }
      });
    } catch (error: any) {
      if (error.message === 'RAZORPAY_ORDER_FAILED' || error.message === 'RAZORPAY_NOT_CONFIGURED') {
        return res.status(502).json({
          success: false,
          errorCode: error.message,
          message: 'Unable to start the payment. Please try again.'
        });
      }
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  /** Creates a Razorpay order for a prepaid subscription's upfront total. */
  public async createSubscriptionOrder(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });
      }

      if (!razorpayService.isConfigured) {
        return res.status(503).json({
          success: false,
          errorCode: 'RAZORPAY_NOT_CONFIGURED',
          message: 'Online payment is not available right now'
        });
      }

      // The amount is never taken from the client — it's the same quote
      // `POST /subscriptions` will independently recompute and verify.
      const result = await computeSubscriptionQuote(customer.id, req.body);
      if (!result.ok) {
        return res.status(result.failure.status).json({
          success: false,
          errorCode: result.failure.errorCode,
          message: result.failure.message
        });
      }
      if (!result.quote.isPrepaid || result.quote.totalCost <= 0) {
        return res.status(422).json({ success: false, message: 'This plan has nothing to pay upfront' });
      }

      const receipt = `sdf_sub_${customer.id.substring(0, 8)}_${Date.now()}`;
      const order = await razorpayService.createOrder(Math.round(result.quote.totalCost) * 100, receipt, {
        purpose: 'subscription_prepaid',
        customerId: customer.id
      });

      return res.status(200).json({
        success: true,
        data: {
          configured: true,
          keyId: razorpayService.publishableKeyId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          totalCost: result.quote.totalCost,
          occurrences: result.quote.occurrences
        }
      });
    } catch (error: any) {
      if (error.message === 'RAZORPAY_ORDER_FAILED' || error.message === 'RAZORPAY_NOT_CONFIGURED') {
        return res.status(502).json({
          success: false,
          errorCode: error.message,
          message: 'Unable to start the payment. Please try again.'
        });
      }
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  /** Tells the app whether online payment can be offered at all. */
  public async status(_req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      data: {
        configured: razorpayService.isConfigured,
        keyId: razorpayService.publishableKeyId
      }
    });
  }

  public async verifyRazorpayPayment(req: Request, res: Response) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      if (!razorpayService.isConfigured) {
        return res.status(503).json({
          success: false,
          errorCode: 'RAZORPAY_NOT_CONFIGURED',
          message: 'Online payment is not available right now'
        });
      }

      const verified = razorpayService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      return res.status(200).json({ success: true, data: { verified, configured: true } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const paymentController = new PaymentController();
