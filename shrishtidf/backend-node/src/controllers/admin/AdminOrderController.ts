import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { formatDateOnly } from '../../services/CutoffService';
import { parseDateOnly } from '../../services/SubscriptionLifecycleService';

const ORDER_INCLUDE = {
  delivery_routes: { include: { hubs: true, delivery_boys: true } }
};

function mapOrderRow(o: any) {
  return {
    id: o.id,
    invoiceNumber: o.invoice_number,
    orderDate: o.created_at,
    deliveryDate: o.delivery_date,
    customerId: o.customer_id,
    customerName: o.customer_name,
    phone: o.phone,
    address: o.address,
    hub: o.delivery_routes?.hubs?.name || null,
    deliveryBoy: o.delivery_routes?.delivery_boys?.name || null,
    total: Number(o.total_amount),
    status: o.status,
    narration: o.narration,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status
  };
}

function buildOrderWhere(query: Record<string, any>) {
  const { customerId, dateFrom, dateTo, deliveryBoyId, city } = query;
  const where: any = {};
  if (customerId) where.customer_id = customerId;
  if (deliveryBoyId) where.delivery_routes = { driver_id: deliveryBoyId };
  if (city) {
    where.OR = [
      { address: { contains: city, mode: 'insensitive' } },
      { customers: { city: { contains: city, mode: 'insensitive' } } }
    ];
  }
  if (dateFrom || dateTo) {
    where.delivery_date = {};
    if (dateFrom) where.delivery_date.gte = parseDateOnly(dateFrom);
    if (dateTo) where.delivery_date.lte = parseDateOnly(dateTo);
  }
  return where;
}

export class AdminOrderController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildOrderWhere(query);
      where.status = query.status || 'PENDING';

      const [total, rows, totalAgg] = await Promise.all([
        prisma.orders.count({ where }),
        prisma.orders.findMany({
          where,
          include: ORDER_INCLUDE,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.orders.aggregate({ where, _sum: { total_amount: true } })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          rows: rows.map(mapOrderRow),
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
          totalAmount: totalAgg._sum.total_amount || 0
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportOrders(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where = buildOrderWhere(query);
      where.status = query.status || 'PENDING';

      const rows = await prisma.orders.findMany({ where, include: ORDER_INCLUDE, orderBy: { created_at: 'desc' } });
      const mapped = rows.map(mapOrderRow);

      const header = ['Order No', 'Order Date', 'Customer Name', 'Hub', 'Total(Rs)', 'Status', 'Delivery Boy', 'Narration'];
      const csvRows = mapped.map((o: any) => [
        o.invoiceNumber || '', o.orderDate ? formatDateOnly(new Date(o.orderDate)) : '', o.customerName || '',
        o.hub || '', o.total, o.status, o.deliveryBoy || '', o.narration || ''
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ecom-orders-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const order = await prisma.orders.findUnique({
        where: { id: req.params.id as string },
        include: { ...ORDER_INCLUDE, order_items: { include: { product_variants: true } }, customers: true }
      });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      return res.status(200).json({
        success: true,
        data: {
          ...mapOrderRow(order),
          customerEmail: (order as any).customers?.email || null,
          subtotal: Number(order.subtotal),
          taxAmount: Number(order.tax_amount),
          deliveryFee: Number(order.delivery_fee),
          walletAmountUsed: Number(order.wallet_amount_used),
          razorpayOrderId: order.razorpay_order_id,
          razorpayPaymentId: order.razorpay_payment_id,
          items: order.order_items.map((it: any) => ({
            id: it.id,
            productName: it.product_name,
            size: it.size,
            quantity: it.quantity,
            unitPrice: it.unit_price,
            lineTotal: it.line_total,
            purchaseType: it.purchase_type,
            batchNumber: it.batch_number
          }))
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      const validStatuses = ['PENDING', 'IN_PROCESS', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(422).json({ success: false, message: 'Invalid order status' });
      }

      const order = await prisma.orders.update({
        where: { id: req.params.id as string },
        data: { status, updated_at: new Date() },
        include: ORDER_INCLUDE
      });
      return res.status(200).json({ success: true, data: mapOrderRow(order) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async cancel(req: Request, res: Response) {
    try {
      const { narration } = req.body;
      const order = await prisma.orders.update({
        where: { id: req.params.id as string },
        data: { status: 'CANCELLED', narration: narration || undefined, updated_at: new Date() },
        include: ORDER_INCLUDE
      });
      return res.status(200).json({ success: true, data: mapOrderRow(order) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async updateNarration(req: Request, res: Response) {
    try {
      const { narration } = req.body;
      const order = await prisma.orders.update({
        where: { id: req.params.id as string },
        data: { narration: narration || null, updated_at: new Date() },
        include: ORDER_INCLUDE
      });
      return res.status(200).json({ success: true, data: mapOrderRow(order) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminOrderController = new AdminOrderController();
