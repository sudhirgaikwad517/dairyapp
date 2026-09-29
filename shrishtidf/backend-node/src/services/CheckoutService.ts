import prisma from '../db/prisma';
import { cartService } from './CartService';
import { randomUUID } from 'crypto';
import { activityLogService } from './ActivityLogService';
import { formatDateOnly } from './CutoffService';
import { razorpayService } from './RazorpayService';

export class CheckoutService {
  private async getSettings() {
    const minOrderRow = await prisma.site_settings.findUnique({ where: { key: 'min_order_value' } });
    const freeDeliveryRow = await prisma.site_settings.findUnique({ where: { key: 'free_delivery_threshold' } });
    const walletEnabledRow = await prisma.site_settings.findUnique({ where: { key: 'wallet_enabled' } });

    return {
      minOrderValue: minOrderRow ? Number(minOrderRow.value) : 20000,
      freeDeliveryThreshold: freeDeliveryRow ? Number(freeDeliveryRow.value) : 50000,
      walletEnabled: walletEnabledRow ? Boolean(walletEnabledRow.value) : true
    };
  }

  public async getActiveSlots() {
    const slots = await prisma.delivery_slots.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' }
    });

    return slots.map(slot => ({
      id: slot.id,
      label: slot.label,
      startTime: slot.start_time,
      endTime: slot.end_time,
      routeId: slot.route_id
    }));
  }

  public async validatePincode(pincode: string) {
    pincode = pincode.replace(/\D+/g, '');
    const settings = await this.getSettings();

    if (pincode.length !== 6) {
      return {
        serviceable: false,
        pincode,
        city: null,
        areaName: null,
        deliveryFee: 0,
        minOrderValue: settings.minOrderValue,
        routeId: null,
        message: 'Enter a valid 6-digit PIN code'
      };
    }

    const zone = await prisma.delivery_zones.findUnique({ where: { pincode } });

    if (!zone || !zone.is_serviceable) {
      return {
        serviceable: false,
        pincode,
        city: zone?.city || null,
        areaName: zone?.area_name || null,
        deliveryFee: 0,
        minOrderValue: settings.minOrderValue,
        routeId: null,
        message: 'Sorry, we do not deliver to this PIN code yet.'
      };
    }

    return {
      serviceable: true,
      pincode,
      city: zone.city,
      areaName: zone.area_name,
      deliveryFee: zone.delivery_fee,
      minOrderValue: zone.min_order_value !== null ? Number(zone.min_order_value) : settings.minOrderValue,
      routeId: zone.route_id,
      message: null
    };
  }

  public async quote(sessionId: string, pincode: string) {
    const cart = await cartService.getCartBySession(sessionId);
    const zone = await this.validatePincode(pincode);
    const settings = await this.getSettings();

    const lines = await this.buildLineTotals(cart.items);

    // `subtotal` is the pre-tax base (what "minimum order value" and the free
    // delivery threshold are measured against, matching how those settings
    // are configured) — it, `taxAmount` and `deliveryFee` add up exactly to
    // `totalAmount`, so the bill shown to the customer is fully transparent.
    const subtotal = lines.reduce((acc, line) => acc + line.baseAmount, 0);
    const taxAmount = lines.reduce((acc, line) => acc + line.taxAmount, 0);
    // What the customer actually spends on the items themselves, tax included
    // — the figure "minimum order value" and "free delivery threshold" are
    // meant to be measured against, unaffected by this fix to how `subtotal`
    // is broken down for display.
    const itemsTotal = subtotal + taxAmount;

    let deliveryFee = 0;
    if (zone.serviceable && itemsTotal < settings.freeDeliveryThreshold) {
      deliveryFee = zone.deliveryFee;
    }

    const minOrderValue = zone.minOrderValue;

    return {
      cart,
      pincode: zone,
      subtotal,
      taxAmount,
      deliveryFee,
      totalAmount: subtotal + taxAmount + deliveryFee,
      minOrderValue,
      meetsMinimum: itemsTotal >= minOrderValue,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      walletEnabled: settings.walletEnabled
    };
  }

  public async placeOrder(sessionId: string, input: any, customer: any) {
    const cart = await cartService.getCartBySession(sessionId);
    if (cart.items.length === 0) {
      throw new Error('CART_EMPTY');
    }

    const pincode = (input.pincode || '').replace(/\D+/g, '');
    const zone = await this.validatePincode(pincode);
    if (!zone.serviceable) {
      throw new Error('PINCODE_NOT_SERVICEABLE');
    }

    const lines = await this.buildLineTotals(cart.items);
    const subtotal = lines.reduce((acc, line) => acc + line.baseAmount, 0);
    const taxAmount = lines.reduce((acc, line) => acc + line.taxAmount, 0);
    const itemsTotal = subtotal + taxAmount;
    const minOrder = zone.minOrderValue;

    if (itemsTotal < minOrder) {
      throw new Error('BELOW_MINIMUM_ORDER');
    }

    const settings = await this.getSettings();
    let deliveryFee = 0;
    if (itemsTotal < settings.freeDeliveryThreshold) {
      deliveryFee = zone.deliveryFee;
    }

    const paymentMethod = input.paymentMethod || 'cod';
    const totalAmount = itemsTotal + deliveryFee;

    // Paying by wallet means the wallet covers the whole order — the amount is
    // computed here rather than taken from the request, so a client can't ask
    // for a "wallet" order while deducting nothing.
    let walletUse = paymentMethod === 'wallet'
      ? totalAmount
      : Math.max(0, Number(input.walletAmount) || 0);

    if (walletUse > 0 && !customer) {
      throw new Error('WALLET_REQUIRES_LOGIN');
    }

    if (walletUse > totalAmount) {
      walletUse = totalAmount;
    }

    let customerWallet = null;
    if (walletUse > 0 && customer) {
      customerWallet = await prisma.customer_wallets.findUnique({ where: { customer_id: customer.id } });
      const balance = customerWallet ? Number(customerWallet.balance) : 0;
      if (balance < walletUse) {
        throw new Error('INSUFFICIENT_WALLET_BALANCE');
      }
    }

    if (paymentMethod === 'wallet' && walletUse < totalAmount) {
      throw new Error('INSUFFICIENT_WALLET_BALANCE');
    }

    if (paymentMethod === 'razorpay') {
      const verified = await this.verifyRazorpayPayment(
        input.razorpayOrderId || '',
        input.razorpayPaymentId || '',
        input.razorpaySignature || ''
      );
      if (!verified) {
        throw new Error('RAZORPAY_VERIFICATION_FAILED');
      }
    }

    return await prisma.$transaction(async (tx) => {
      let paymentStatus = 'pending';
      if (paymentMethod === 'razorpay' || walletUse >= totalAmount) {
        paymentStatus = 'paid';
      }

      const orderId = randomUUID();
      const invoiceNumber = `SDF-${formatDateOnly(new Date()).replace(/-/g, '')}-${orderId.substring(0, 8).toUpperCase()}`;

      const order = await tx.orders.create({
        data: {
          id: orderId,
          session_id: sessionId,
          customer_id: customer?.id || null,
          customer_name: (input.customerName || customer?.name || '').trim(),
          phone: (input.phone || customer?.phone || '').replace(/\D+/g, ''),
          address: (input.address || customer?.address || '').trim(),
          pincode,
          delivery_date: input.deliveryDate ? new Date(input.deliveryDate) : new Date(Date.now() + 86400000),
          delivery_slot_id: input.deliverySlotId || null,
          route_id: zone.routeId,
          status: 'PENDING',
          subtotal,
          tax_amount: taxAmount,
          delivery_fee: deliveryFee,
          wallet_amount_used: walletUse,
          total_amount: totalAmount - walletUse,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          razorpay_order_id: paymentMethod === 'razorpay' ? input.razorpayOrderId : null,
          razorpay_payment_id: paymentMethod === 'razorpay' ? input.razorpayPaymentId : null,
          invoice_number: invoiceNumber,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      for (const line of lines) {
        let batchNumber = null;
        
        // Very basic batch assignment
        const batch = await tx.inventory_batches.findFirst({
          where: {
            product_id: line.productId,
            ...(line.variantId ? { variant_id: line.variantId } : {}),
            expiry_date: { gt: new Date() },
            quantity: { gt: 0 }
          },
          orderBy: { expiry_date: 'asc' }
        });

        if (batch) {
          batchNumber = batch.batch_number;
          await tx.inventory_batches.update({
            where: { id: batch.id },
            data: { quantity: Math.max(0, batch.quantity - 1) }
          });
        }

        await tx.order_items.create({
          data: {
            id: randomUUID(),
            order_id: order.id,
            product_id: line.productId,
            variant_id: line.variantId,
            product_name: line.name,
            size: line.size,
            batch_number: batchNumber,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            purchase_type: line.purchaseType,
            line_total: line.lineTotal,
            gst_rate: line.gstRate,
            tax_amount: line.taxAmount,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }

      if (cart.id) {
        await tx.cart_items.deleteMany({ where: { cart_id: cart.id } });
      }

      if (walletUse > 0 && customer) {
        const currentBalance = customerWallet ? Number(customerWallet.balance) : 0;
        await tx.customer_wallets.update({
          where: { customer_id: customer.id },
          data: { balance: currentBalance - walletUse, updated_at: new Date() }
        });

        await tx.wallet_transactions.create({
          data: {
            id: randomUUID(),
            customer_id: customer.id,
            type: 'debit',
            amount: walletUse,
            balance_after: currentBalance - walletUse,
            reference_type: 'order',
            reference_id: order.id,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }

      if (customer) {
        await tx.customers.update({
          where: { id: customer.id },
          data: { orders_count: { increment: 1 } }
        });
      }

      const finalOrder = await tx.orders.findUnique({
        where: { id: order.id },
        include: { order_items: true }
      });

      return this.mapOrder(finalOrder);
    }).then(async (mappedOrder) => {
      const hasOneTimeItems = mappedOrder.items.some((i: any) => i.purchaseType === 'BUY_ONCE');
      if (hasOneTimeItems) {
        await activityLogService.log({
          type: 'one_time_order',
          title: 'One Time Order Request',
          message: `${mappedOrder.customerName || 'Customer'}, order for ${mappedOrder.items.map((i: any) => i.productName).join(', ')} placed successfully (${mappedOrder.invoiceNumber}).`,
          customerId: customer?.id || null
        });
      }
      return mappedOrder;
    });
  }

  private async buildLineTotals(items: any[]) {
    const lines = [];

    for (const item of items) {
      const product = await prisma.products.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      let variant = null;
      if (item.variantId) {
        variant = await prisma.product_variants.findUnique({ where: { id: item.variantId } });
      }

      const purchaseType = item.purchaseType || 'BUY_ONCE';
      let unitPrice = 0;
      if (variant) {
        unitPrice = purchaseType === 'SUBSCRIPTION' ? Number(variant.subscription) : Number(variant.buy_once);
      } else {
        unitPrice = purchaseType === 'SUBSCRIPTION' ? Number(product.subscription) : Number(product.buy_once);
      }

      // Calculate Tax. `baseAmount` (pre-tax) and `taxAmount` always add up to
      // `lineTotal` (what's actually charged) — kept separate so the bill
      // breakdown shown to the customer is additive (base + tax + delivery =
      // total) instead of silently double-counting or hiding the tax already
      // folded into a tax-inclusive price.
      const gstRate = Number(product.gst_rate || 0);
      const isTaxInclusive = product.is_tax_inclusive !== false;
      const amount = unitPrice * item.quantity;
      let taxAmount = 0;
      let totalAmount = amount;
      let baseAmount = amount;

      if (gstRate > 0) {
        if (isTaxInclusive) {
          const base = (amount * 100) / (100 + gstRate);
          taxAmount = Math.round(amount - base);
          baseAmount = amount - taxAmount;
        } else {
          taxAmount = Math.round((amount * gstRate) / 100);
          totalAmount = amount + taxAmount;
          baseAmount = amount;
        }
      }

      lines.push({
        productId: item.productId,
        variantId: item.variantId || null,
        name: item.name,
        size: variant?.size_label || item.size,
        quantity: item.quantity,
        unitPrice,
        purchaseType,
        lineTotal: totalAmount,
        baseAmount,
        taxAmount,
        gstRate
      });
    }

    return lines;
  }

  /// Fails closed: an order is only marked paid when Razorpay's own signature
  /// checks out AND Razorpay confirms the payment was actually collected.
  private async verifyRazorpayPayment(orderId: string, paymentId: string, signature: string) {
    if (!razorpayService.verifySignature(orderId, paymentId, signature)) return false;
    return razorpayService.isPaymentCaptured(paymentId);
  }

  private mapOrder(order: any) {
    return {
      id: order.id,
      invoiceNumber: order.invoice_number,
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
        batchNumber: item.batch_number,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        purchaseType: item.purchase_type,
        lineTotal: Number(item.line_total),
        gstRate: Number(item.gst_rate),
        taxAmount: Number(item.tax_amount)
      })),
      createdAt: order.created_at
    };
  }
}

export const checkoutService = new CheckoutService();
