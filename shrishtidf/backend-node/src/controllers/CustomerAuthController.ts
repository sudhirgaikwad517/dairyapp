import { Request, Response } from 'express';
import { customerAuthService } from '../services/CustomerAuthService';

export class CustomerAuthController {
  public async sendOtp(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      if (!phone || typeof phone !== 'string' || phone.length > 20) {
        return res.status(422).json({ success: false, message: 'Invalid phone number' });
      }

      const payload = await customerAuthService.sendOtp(phone);
      return res.status(200).json({ success: true, data: payload });
    } catch (error: any) {
      if (error.message === 'INVALID_PHONE') {
        return res.status(422).json({
          success: false,
          errorCode: 'INVALID_PHONE',
          message: 'Enter a valid 10-digit mobile number'
        });
      }
      console.error(error);
      return res.status(500).json({
        success: false,
        errorCode: 'OTP_ERROR',
        message: 'Unable to send OTP'
      });
    }
  }

  public async verifyOtp(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id; // Usually passed in header
      const { phone, otp } = req.body;

      if (!phone || typeof phone !== 'string' || phone.length > 20 || !otp || typeof otp !== 'string' || otp.length !== 6) {
        return res.status(422).json({ success: false, message: 'Invalid request data' });
      }

      if (!sessionId) {
        return res.status(401).json({ success: false, message: 'Missing session ID' });
      }

      const { customer, isNewUser } = await customerAuthService.verifyOtp(phone, otp, sessionId);
      return res.status(200).json({ success: true, data: { customer, isNewUser } });
    } catch (error: any) {
      if (error.message === 'INVALID_OTP') {
        return res.status(422).json({
          success: false,
          errorCode: 'INVALID_OTP',
          message: 'Invalid or expired OTP'
        });
      }
      console.error(error);
      return res.status(500).json({
        success: false,
        errorCode: 'AUTH_ERROR',
        message: 'Unable to verify OTP'
      });
    }
  }

  public async me(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);

      if (!customer) {
        return res.status(401).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Not logged in'
        });
      }

      const mappedCustomer = customerAuthService.mapCustomer(customer);
      const orders = await customerAuthService.ordersForCustomer(mappedCustomer.phone);

      return res.status(200).json({
        success: true,
        data: {
          customer: mappedCustomer,
          orders
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async updateProfile(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      const customer = await customerAuthService.customerForSession(sessionId);

      if (!customer) {
        return res.status(401).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Not logged in'
        });
      }

      const updated = await customerAuthService.updateProfile(customer.id, req.body);
      return res.status(200).json({ success: true, data: { customer: updated } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
      if (sessionId) {
        await customerAuthService.logout(sessionId);
      }
      return res.status(200).json({ success: true, data: { loggedOut: true } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const customerAuthController = new CustomerAuthController();
