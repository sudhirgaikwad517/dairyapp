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

  /// A standalone, printable invoice page — opened in the phone's browser
  /// from the app (or any browser from the admin panel), where "Print" /
  /// "Share" already offers "Save as PDF" without this backend needing a PDF
  /// rendering library of its own.
  public async invoiceHtml(req: Request, res: Response) {
    try {
      // Opened directly in the device's browser (so its native "Print / Save
      // as PDF" is available), which can't attach our normal auth header —
      // the app instead passes the same session id as a query param here.
      const sessionId = (req.headers['session-id'] as string) || req.cookies?.session_id || (req.query.session as string);
      const customer = await customerAuthService.customerForSession(sessionId);
      if (!customer) return res.status(401).send('<h1>Please log in to view this invoice.</h1>');

      const order = await prisma.orders.findUnique({
        where: { id: req.params.id as string },
        include: { order_items: true }
      });

      if (!order || order.customer_id !== customer.id) {
        return res.status(404).send('<h1>Invoice not found</h1>');
      }

      const money = (n: any) => `Rs. ${Number(n).toFixed(0)}`;
      const rows = order.order_items
        .map(
          (item: any) => `
            <tr>
              <td>${item.product_name}${item.size ? ` (${item.size})` : ''}</td>
              <td class="right">${item.quantity}</td>
              <td class="right">${money(item.unit_price)}</td>
              <td class="right">${money(item.line_total)}</td>
            </tr>`
        )
        .join('');

      const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${order.invoice_number || order.id}</title>
<style>
  body { font-family: -apple-system, Roboto, Arial, sans-serif; color: #101828; margin: 0; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #101828; padding-bottom: 16px; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #667085; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid #EAECF0; font-size: 13px; }
  th { color: #667085; font-size: 11px; text-transform: uppercase; }
  .right { text-align: right; }
  .totals { width: 260px; margin-left: auto; margin-top: 16px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals .grand { font-weight: bold; font-size: 16px; border-top: 1px solid #101828; margin-top: 6px; padding-top: 8px; }
  .print-btn { margin-top: 24px; padding: 12px 20px; background: #6156F1; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Shrishti Dairy Farm</h1>
      <div class="muted">Invoice ${order.invoice_number || '-'}</div>
    </div>
    <div class="muted" style="text-align:right">
      <div>${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      <div>${order.status}</div>
    </div>
  </div>

  <div class="muted">Billed to</div>
  <div>${order.customer_name || ''}</div>
  <div class="muted">${order.address || ''}</div>
  <div class="muted">${order.phone || ''}</div>

  <table>
    <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
    <div><span>Tax</span><span>${money(order.tax_amount)}</span></div>
    <div><span>Delivery Fee</span><span>${money(order.delivery_fee)}</span></div>
    ${Number(order.wallet_amount_used) > 0 ? `<div><span>Wallet Used</span><span>-${money(order.wallet_amount_used)}</span></div>` : ''}
    <div class="grand"><span>Total</span><span>${money(order.total_amount)}</span></div>
  </div>

  <button class="print-btn" id="printBtn">Print / Save as PDF</button>
  <script>document.getElementById('printBtn').addEventListener('click', function () { window.print(); });</script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (error) {
      console.error(error);
      return res.status(500).send('<h1>Unable to load invoice</h1>');
    }
  }
}

export const orderController = new OrderController();
