import prisma from '../db/prisma';
import { randomUUID } from 'crypto';

export class CartService {
  public async getCartBySession(sessionId: string) {
    const cart = await prisma.carts.findUnique({
      where: { session_id: sessionId },
      include: {
        cart_items: {
          include: {
            products: {
              include: { product_categories: true }
            },
            product_variants: true
          }
        }
      }
    });

    return cart ? this.mapCart(cart) : this.emptyCart(sessionId);
  }

  public async addCartItem(sessionId: string, productId: string, purchaseType = 'BUY_ONCE', quantity = 1, variantId: string | null = null) {
    const product = await prisma.products.findUnique({ where: { id: productId } });
    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    return await prisma.$transaction(async (tx) => {
      let cart = await tx.carts.findUnique({ where: { session_id: sessionId } });
      if (!cart) {
        cart = await tx.carts.create({
          data: {
            id: randomUUID(),
            session_id: sessionId,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }

      let item = await tx.cart_items.findFirst({
        where: {
          cart_id: cart.id,
          product_id: productId,
          variant_id: variantId,
          purchase_type: purchaseType
        }
      });

      if (item) {
        await tx.cart_items.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity + quantity,
            updated_at: new Date()
          }
        });
      } else {
        await tx.cart_items.create({
          data: {
            id: randomUUID(),
            cart_id: cart.id,
            product_id: productId,
            variant_id: variantId,
            purchase_type: purchaseType,
            quantity,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }

      const updatedCart = await tx.carts.findUnique({
        where: { id: cart.id },
        include: {
          cart_items: {
            include: {
              products: {
                include: { product_categories: true }
              },
              product_variants: true
            }
          }
        }
      });

      return this.mapCart(updatedCart);
    });
  }

  public async updateCartItemQuantity(sessionId: string, itemId: string, quantity: number) {
    const cart = await prisma.carts.findUnique({ where: { session_id: sessionId } });
    if (!cart) {
      throw new Error('CART_NOT_FOUND');
    }

    if (quantity <= 0) {
      await prisma.cart_items.deleteMany({
        where: { cart_id: cart.id, id: itemId }
      });
    } else {
      await prisma.cart_items.updateMany({
        where: { cart_id: cart.id, id: itemId },
        data: { quantity, updated_at: new Date() }
      });
    }

    return await this.getCartBySession(sessionId);
  }

  public async removeCartItem(sessionId: string, itemId: string) {
    const cart = await prisma.carts.findUnique({ where: { session_id: sessionId } });
    if (!cart) {
      throw new Error('CART_NOT_FOUND');
    }

    await prisma.cart_items.deleteMany({
      where: { cart_id: cart.id, id: itemId }
    });

    return await this.getCartBySession(sessionId);
  }

  public async clearCart(sessionId: string) {
    const cart = await prisma.carts.findUnique({ where: { session_id: sessionId } });
    if (!cart) return this.emptyCart(sessionId);

    await prisma.cart_items.deleteMany({
      where: { cart_id: cart.id }
    });

    return await this.getCartBySession(sessionId);
  }

  public emptyCart(sessionId: string) {
    return {
      id: '',
      sessionId,
      items: [],
      itemCount: 0,
      totalAmount: 0
    };
  }

  private mapCart(cart: any) {
    const items = cart.cart_items.map((item: any) => this.mapCartItem(item));
    
    return {
      id: cart.id,
      sessionId: cart.session_id,
      items,
      itemCount: items.reduce((acc: number, curr: any) => acc + curr.quantity, 0),
      totalAmount: items.reduce((acc: number, curr: any) => acc + curr.lineTotal, 0)
    };
  }

  private mapCartItem(item: any) {
    const product = item.products;
    const variant = item.product_variants;
    
    let unitPrice = 0;
    if (variant) {
      unitPrice = item.purchase_type === 'SUBSCRIPTION' ? Number(variant.subscription) : Number(variant.buy_once);
    } else {
      unitPrice = item.purchase_type === 'SUBSCRIPTION' ? Number(product.subscription) : Number(product.buy_once);
    }

    return {
      id: item.id,
      productId: product.id,
      variantId: variant?.id || null,
      name: product.name,
      size: variant?.size_label || product.size,
      categoryLabel: product.product_categories?.label,
      badge: product.badge || '',
      quantity: item.quantity,
      purchaseType: item.purchase_type,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      storageType: product.storage_type || 'chilled',
      shelfLifeType: product.shelf_life_type || 'short'
    };
  }
}

export const cartService = new CartService();
