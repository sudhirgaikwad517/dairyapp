import { Request, Response } from 'express';
import { cartService } from '../services/CartService';
import { checkoutService } from '../services/CheckoutService';
import { customerAuthService } from '../services/CustomerAuthService';
import prisma from '../db/prisma';

export class OrderController {
  public async store(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id || 'default-session';
      const body = req.body;

      if (!body.customerName || !body.phone || !body.address) {
        return res.status(422).json({ success: false, message: 'Missing fields' });
      }

      // We can reuse checkoutService placeOrder for simplicity since it handles all the cart -> order conversion
      const order = await checkoutService.placeOrder(sessionId, body, null);
      
      return res.status(201).json({ success: true, data: order });
    } catch (error: any) {
      if (error.message === 'CART_EMPTY') {
        return res.status(400).json({ success: false, errorCode: 'CART_EMPTY', message: 'Cart is empty' });
      }
      console.error(error);
      return res.status(500).json({ success: false, errorCode: 'ORDER_ERROR', message: 'Unable to place order' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const orderId = req.params.id as string;
      const order = await prisma.orders.findUnique({
        where: { id: orderId },
        include: { order_items: true }
      });

      if (!order) {
        return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Order not found' });
      }

      const formattedOrder = {
        id: order.id,
        status: order.status,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.tax_amount),
        deliveryFee: Number(order.delivery_fee),
        walletAmountUsed: Number(order.wallet_amount_used),
        totalAmount: Number(order.total_amount),
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        deliveryDate: order.delivery_date,
        customerName: order.customer_name,
        phone: order.phone,
        address: order.address,
        pincode: order.pincode,
        items: order.order_items.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          size: item.size,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          purchaseType: item.purchase_type,
          lineTotal: Number(item.line_total),
        })),
        createdAt: order.created_at
      };

      return res.status(200).json({ success: true, data: formattedOrder });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const orderController = new OrderController();
