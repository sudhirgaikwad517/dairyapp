import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../db/prisma';
import { signDeliveryBoyToken } from '../../middleware/deliveryAuth';

export class DeliveryBoyAuthController {
  public async login(req: Request, res: Response) {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone and password are required' });
      }

      // We support phone or username login
      const deliveryBoy = await prisma.delivery_boys.findFirst({
        where: {
          OR: [
            { phone: phone },
            { username: phone }
          ]
        },
        include: {
          hubs: true
        }
      });

      if (!deliveryBoy || !deliveryBoy.is_active) {
        return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
      }

      if (!deliveryBoy.password) {
        return res.status(401).json({ success: false, message: 'Password not set. Please contact admin.' });
      }

      const isValid = await bcrypt.compare(password, deliveryBoy.password);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = signDeliveryBoyToken(deliveryBoy.id, deliveryBoy.phone || '');

      return res.status(200).json({
        success: true,
        data: {
          token,
          deliveryBoy: {
            id: deliveryBoy.id,
            name: deliveryBoy.name,
            phone: deliveryBoy.phone,
            hub: deliveryBoy.hubs?.name
          }
        }
      });
    } catch (error) {
      console.error('DeliveryBoy Login Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async me(req: Request, res: Response) {
    try {
      if (!req.deliveryBoy) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const deliveryBoy = await prisma.delivery_boys.findUnique({
        where: { id: req.deliveryBoy.id },
        include: { hubs: true }
      });

      if (!deliveryBoy || !deliveryBoy.is_active) {
        return res.status(401).json({ success: false, message: 'Account is inactive or deleted' });
      }

      return res.status(200).json({
        success: true,
        data: {
          deliveryBoy: {
            id: deliveryBoy.id,
            name: deliveryBoy.name,
            phone: deliveryBoy.phone,
            hub: deliveryBoy.hubs?.name
          }
        }
      });
    } catch (error) {
      console.error('DeliveryBoy Me Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      if (req.deliveryBoy?.jti) {
        // reuse revokeToken from adminAuth, since they share the same revoked_admin_tokens table
        const { revokeToken } = await import('../../middleware/adminAuth');
        await revokeToken(req.deliveryBoy.jti);
      }
      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('DeliveryBoy Logout Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const deliveryBoyAuthController = new DeliveryBoyAuthController();
