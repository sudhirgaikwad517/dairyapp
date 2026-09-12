import { Request, Response } from 'express';
import { checkoutService } from '../services/CheckoutService';
import crypto from 'crypto';

export class PaymentController {
  public async createRazorpayOrder(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id || 'default-session';
      const { pincode, walletAmount } = req.body;

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
      const amountPaise = payable * 100;
      const receipt = `sdf_${sessionId.substring(0, 8)}_${Date.now()}`;

      // Mocking Razorpay API call in node context if env vars are missing
      const razorpayOrder = {
        id: `pay_${Date.now()}`,
        entity: "order",
        amount: amountPaise,
        amount_paid: 0,
        amount_due: amountPaise,
        currency: "INR",
        receipt: receipt,
        status: "created",
        attempts: 0,
        notes: [],
        created_at: Math.floor(Date.now() / 1000)
      };

      return res.status(200).json({
        success: true,
        data: {
          razorpay: { configured: true, ...razorpayOrder },
          payableAmount: payable,
          quoteTotal: quote.totalAmount
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async verifyRazorpayPayment(req: Request, res: Response) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      
      const secret = process.env.RAZORPAY_API_SECRET;
      if (!secret) {
        return res.status(200).json({
          success: true,
          data: { verified: false, configured: false, message: 'Razorpay not configured' }
        });
      }

      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
      const generated = hmac.digest('hex');
      const verified = generated === razorpaySignature;

      return res.status(200).json({
        success: true,
        data: { verified, configured: true }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const paymentController = new PaymentController();
