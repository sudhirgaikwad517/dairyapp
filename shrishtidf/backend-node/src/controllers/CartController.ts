import { Request, Response } from 'express';
import { cartService } from '../services/CartService';

export class CartController {
  public async show(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id || 'default-session';
      const cart = await cartService.getCartBySession(sessionId);
      
      res.set('Cache-Control', 'private, no-store');
      return res.status(200).json({ success: true, data: cart });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        errorCode: 'CART_ERROR',
        message: 'Unable to load cart'
      });
    }
  }

  public async store(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id || 'default-session';
      const { productId, variantId, purchaseType, quantity } = req.body;

      if (!productId || typeof productId !== 'string') {
        return res.status(422).json({ success: false, message: 'Invalid product ID' });
      }

      const type = purchaseType === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'BUY_ONCE';
      const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

      const result = await cartService.addCartItem(sessionId, productId, type, qty, variantId);
      
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'PRODUCT_NOT_FOUND' || error.message === 'VARIANT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          errorCode: 'NOT_FOUND',
          message: 'Product not found'
        });
      }
      if (error.message === 'OUT_OF_STOCK') {
        return res.status(409).json({
          success: false,
          errorCode: 'OUT_OF_STOCK',
          message: 'This item is out of stock right now.'
        });
      }
      if (error.message === 'PRODUCT_UNAVAILABLE') {
        return res.status(409).json({
          success: false,
          errorCode: 'PRODUCT_UNAVAILABLE',
          message: 'This item is no longer available.'
        });
      }
      console.error(error);
      return res.status(500).json({
        success: false,
        errorCode: 'CART_ERROR',
        message: 'Unable to add item to cart'
      });
    }
  }

  public async updateItem(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id || 'default-session';
      const itemId = req.params.itemId as string;
      const { quantity } = req.body;

      if (typeof quantity !== 'number') {
        return res.status(422).json({ success: false, message: 'Quantity is required' });
      }

      const result = await cartService.updateCartItemQuantity(sessionId, itemId, quantity);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'CART_NOT_FOUND') {
        return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Cart not found' });
      }
      console.error(error);
      return res.status(500).json({ success: false, errorCode: 'CART_ERROR', message: 'Unable to update cart item' });
    }
  }

  public async destroyItem(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id || 'default-session';
      const itemId = req.params.itemId as string;

      const result = await cartService.removeCartItem(sessionId, itemId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'CART_NOT_FOUND') {
        return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Cart not found' });
      }
      console.error(error);
      return res.status(500).json({ success: false, errorCode: 'CART_ERROR', message: 'Unable to remove cart item' });
    }
  }

  public async destroy(req: Request, res: Response) {
    try {
      const sessionId = req.headers['session-id'] as string || req.cookies?.session_id || 'default-session';
      const result = await cartService.clearCart(sessionId);
      
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        errorCode: 'CART_ERROR',
        message: 'Unable to clear cart'
      });
    }
  }
}

export const cartController = new CartController();
