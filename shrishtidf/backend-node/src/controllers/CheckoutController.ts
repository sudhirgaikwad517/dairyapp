import { Request, Response } from 'express';
import { checkoutService } from '../services/CheckoutService';
import { customerAuthService } from '../services/CustomerAuthService';

export class CheckoutController {
  public async options(req: Request, res: Response) {
    try {
      const settings = {
        minOrderValue: 20000,
        freeDeliveryThreshold: 50000,
        walletEnabled: true
      };
      const deliverySlots = await checkoutService.getActiveSlots();

      return res.status(200).json({
        success: true,
        data: { settings, deliverySlots }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async validatePincode(req: Request, res: Response) {
    try {
      const { pincode } = req.body;
      if (!pincode || typeof pincode !== 'string') {
        return res.status(422).json({ success: false, message: 'Pincode is required' });
      }

      const result = await checkoutService.validatePincode(pincode);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async quote(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id || 'default-session';
      const { pincode } = req.body;

      if (!pincode || typeof pincode !== 'string') {
        return res.status(422).json({ success: false, message: 'Pincode is required' });
      }

      const quote = await checkoutService.quote(sessionId, pincode);
      return res.status(200).json({ success: true, data: quote });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async place(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id || 'default-session';
      const customer = await customerAuthService.customerForSession(sessionId);

      const body = req.body;
      if (!body.customerName || !body.phone || !body.address || !body.pincode) {
        return res.status(422).json({ success: false, message: 'Missing required address fields' });
      }

      const order = await checkoutService.placeOrder(sessionId, body, customer);
      
      return res.status(201).json({ success: true, data: order });
    } catch (error: any) {
      const msg = error.message;
      const errorMap: Record<string, { code: number; message: string }> = {
        'CART_EMPTY': { code: 400, message: 'Cart is empty' },
        'PINCODE_NOT_SERVICEABLE': { code: 422, message: 'Delivery not available for this PIN code' },
        'BELOW_MINIMUM_ORDER': { code: 422, message: 'Order does not meet minimum value' },
        'WALLET_REQUIRES_LOGIN': { code: 401, message: 'Login required to use wallet' },
        'INSUFFICIENT_WALLET_BALANCE': { code: 422, message: 'Insufficient wallet balance' },
        'RAZORPAY_VERIFICATION_FAILED': { code: 422, message: 'Payment verification failed' }
      };

      if (errorMap[msg]) {
        return res.status(errorMap[msg].code).json({
          success: false,
          errorCode: msg,
          message: errorMap[msg].message
        });
      }

      console.error(error);
      return res.status(500).json({
        success: false,
        errorCode: 'CHECKOUT_ERROR',
        message: 'Unable to place order'
      });
    }
  }
}

export const checkoutController = new CheckoutController();
