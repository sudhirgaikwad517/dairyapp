import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { formatDateOnly } from '../../services/CutoffService';
import { parseDateOnly, subscriptionLifecycleService } from '../../services/SubscriptionLifecycleService';

const PLANNER_INCLUDE = {
  customers: { include: { hubs: true, delivery_boys: true } },
  products: true,
  product_variants: true,
  delivery_modes: true
};

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: formatDateOnly(from), to: formatDateOnly(to) };
}

export class AdminReportController {
  // Ecom / website orders revenue & sales statistics — the "Revenue Report" screen.
  public async revenue(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const { from: defaultFrom, to: defaultTo } = defaultRange();
      const dateFrom = query.dateFrom || defaultFrom;
      const dateTo = query.dateTo || defaultTo;

      const where: any = {
        created_at: { gte: parseDateOnly(dateFrom), lte: new Date(`${dateTo}T23:59:59.999Z`) }
      };
      if (query.city) {
        where.OR = [
          { address: { contains: query.city, mode: 'insensitive' } },
          { customers: { city: { contains: query.city, mode: 'insensitive' } } }
        ];
      }
      if (query.hubId) {
        where.delivery_routes = { hub_id: query.hubId };
      }

      const orders = await prisma.orders.findMany({
        where,
        include: { order_items: true },
        orderBy: { created_at: 'asc' }
      });

      const liveOrders = orders.filter((o: any) => o.status !== 'CANCELLED');
      const cancelledOrders = orders.filter((o: any) => o.status === 'CANCELLED');

      const totalRevenue = liveOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
      const totalOrders = orders.length;
      const cancelledRevenueLost = cancelledOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
      const totalItemsSold = liveOrders.reduce((sum: number, o: any) => sum + o.order_items.reduce((s: number, it: any) => s + it.quantity, 0), 0);
      const avgOrderValue = liveOrders.length > 0 ? totalRevenue / liveOrders.length : 0;

      const statusMap = new Map<string, { count: number; revenue: number }>();
      for (const o of orders) {
        const entry = statusMap.get(o.status) || { count: 0, revenue: 0 };
        entry.count += 1;
        entry.revenue += Number(o.total_amount);
        statusMap.set(o.status, entry);
      }

      const paymentMap = new Map<string, { count: number; revenue: number }>();
      for (const o of liveOrders) {
        const key = o.payment_method || 'unknown';
        const entry = paymentMap.get(key) || { count: 0, revenue: 0 };
        entry.count += 1;
        entry.revenue += Number(o.total_amount);
        paymentMap.set(key, entry);
      }

      const dailyMap = new Map<string, { orders: number; revenue: number }>();
      for (const o of liveOrders) {
        const day = formatDateOnly(new Date(o.created_at || Date.now()));
        const entry = dailyMap.get(day) || { orders: 0, revenue: 0 };
        entry.orders += 1;
        entry.revenue += Number(o.total_amount);
        dailyMap.set(day, entry);
      }

      const productMap = new Map<string, { qty: number; revenue: number }>();
      for (const o of liveOrders) {
        for (const it of o.order_items) {
          const entry = productMap.get(it.product_name) || { qty: 0, revenue: 0 };
          entry.qty += it.quantity;
          entry.revenue += it.line_total;
          productMap.set(it.product_name, entry);
        }
      }
      const topProducts = Array.from(productMap.entries())
        .map(([productName, v]) => ({ productName, qty: v.qty, revenue: v.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return res.status(200).json({
        success: true,
        data: {
          range: { from: dateFrom, to: dateTo },
          summary: { totalOrders, liveOrders: liveOrders.length, totalRevenue, avgOrderValue, totalItemsSold, cancelledOrders: cancelledOrders.length, cancelledRevenueLost },
          statusBreakdown: Array.from(statusMap.entries()).map(([status, v]) => ({ status, ...v })),
          paymentBreakdown: Array.from(paymentMap.entries()).map(([method, v]) => ({ method, ...v })),
          dailyTrend: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
          topProducts
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportRevenue(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const { from: defaultFrom, to: defaultTo } = defaultRange();
      const dateFrom = query.dateFrom || defaultFrom;
      const dateTo = query.dateTo || defaultTo;

      const orders = await prisma.orders.findMany({
        where: { created_at: { gte: parseDateOnly(dateFrom), lte: new Date(`${dateTo}T23:59:59.999Z`) } },
        orderBy: { created_at: 'asc' }
      });

      const header = ['Order Date', 'Invoice No', 'Customer', 'Status', 'Payment Method', 'Total(Rs)'];
      const csvRows = orders.map((o: any) => [
        formatDateOnly(new Date(o.created_at || Date.now())), o.invoice_number || '', o.customer_name || '', o.status, o.payment_method, Number(o.total_amount)
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="revenue-report-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  // ---- Audit Trail ----
  private auditTrailWhere(query: Record<string, string>) {
    const where: any = {};
    if (query.customerId) where.customer_id = query.customerId;
    if (query.dateFrom || query.dateTo) {
      where.created_at = {};
      if (query.dateFrom) where.created_at.gte = parseDateOnly(query.dateFrom);
      if (query.dateTo) where.created_at.lte = new Date(`${query.dateTo}T23:59:59.999Z`);
    }
    return where;
  }

  public async auditTrail(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));
      const where = this.auditTrailWhere(query);

      const [total, rows] = await Promise.all([
        prisma.activity_logs.count({ where }),
        prisma.activity_logs.findMany({
          where,
          include: { customers: true },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const mapped = rows.map((r: any, idx: number) => ({
        srNo: (page - 1) * pageSize + idx + 1,
        date: r.created_at,
        user: r.actor === 'admin' ? 'Admin' : r.customers?.name || 'System',
        actionTakenOn: r.title,
        narration: r.message
      }));

      return res.status(200).json({
        success: true,
        data: { rows: mapped, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportAuditTrail(req: Request, res: Response) {
    try {
      const where = this.auditTrailWhere(req.query as Record<string, string>);
      const rows = await prisma.activity_logs.findMany({ where, include: { customers: true }, orderBy: { created_at: 'desc' } });

      const header = ['Sr No', 'Date', 'User', 'Action Taken On', 'Narration'];
      const csvRows = rows.map((r: any, idx: number) => [
        idx + 1, r.created_at ? formatDateOnly(new Date(r.created_at)) : '', r.actor === 'admin' ? 'Admin' : r.customers?.name || 'System', r.title, r.message
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  // ---- Pause / Resume Request Report ----
  private async computePauseResumeRows(query: Record<string, string>) {
    const pauseWhere: any = { type: 'subscription', subtype: 'pause' };
    if (query.customerId) pauseWhere.customer_id = query.customerId;
    if (query.pauseDate) pauseWhere.effective_date = parseDateOnly(query.pauseDate);

    const [pauseLogs, resumeLogs] = await Promise.all([
      prisma.activity_logs.findMany({
        where: pauseWhere,
        include: { customers: true, subscriptions: { include: { products: true, product_variants: true } } },
        orderBy: { created_at: 'asc' }
      }),
      prisma.activity_logs.findMany({
        where: { type: 'subscription', subtype: 'resume', ...(query.customerId ? { customer_id: query.customerId } : {}) },
        orderBy: { created_at: 'asc' }
      })
    ]);

    const resumesBySub = new Map<string, any[]>();
    for (const r of resumeLogs) {
      if (!r.subscription_id) continue;
      if (!resumesBySub.has(r.subscription_id)) resumesBySub.set(r.subscription_id, []);
      resumesBySub.get(r.subscription_id)!.push(r);
    }

    let rows = pauseLogs.map((p: any) => {
      const candidates = resumesBySub.get(p.subscription_id || '') || [];
      const matchedResume = candidates.find((r: any) => new Date(r.created_at) > new Date(p.created_at));
      return {
        customerName: p.customers?.name,
        plan: p.subscriptions ? `${p.subscriptions.products?.name}${p.subscriptions.product_variants ? ` - ${p.subscriptions.product_variants.size_label}` : ''}` : null,
        pauseRequestDate: p.created_at,
        pauseDate: p.effective_date,
        resumeRequestDate: matchedResume?.created_at || null,
        resumeDate: matchedResume?.effective_date || null
      };
    });

    if (query.resumeDate) {
      const target = formatDateOnly(parseDateOnly(query.resumeDate));
      rows = rows.filter((r) => r.resumeDate && formatDateOnly(new Date(r.resumeDate)) === target);
    }
    return rows;
  }

  public async pauseResume(req: Request, res: Response) {
    try {
      const rows = await this.computePauseResumeRows(req.query as Record<string, string>);
      return res.status(200).json({ success: true, data: { rows, total: rows.length } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportPauseResume(req: Request, res: Response) {
    try {
      const rows = await this.computePauseResumeRows(req.query as Record<string, string>);
      const header = ['Customer Name', 'Plan', 'Pause Request Date', 'Pause Date', 'Resume Request Date', 'Resume Date'];
      const csvRows = rows.map((r: any) => [
        r.customerName || '', r.plan || '',
        r.pauseRequestDate ? formatDateOnly(new Date(r.pauseRequestDate)) : '',
        r.pauseDate ? formatDateOnly(new Date(r.pauseDate)) : '',
        r.resumeRequestDate ? formatDateOnly(new Date(r.resumeRequestDate)) : '',
        r.resumeDate ? formatDateOnly(new Date(r.resumeDate)) : ''
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="pause-resume-report-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  // ---- Customer - Subscription Change Request Report ----
  public async changeRequests(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where: any = { type: 'change_request' };
      if (query.customerId) where.customer_id = query.customerId;

      if (query.quickRange === 'todayTomorrow') {
        const today = parseDateOnly(formatDateOnly(new Date()));
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        where.effective_date = { gte: today, lte: tomorrow };
      } else if (query.dateFrom || query.dateTo) {
        where.effective_date = {};
        if (query.dateFrom) where.effective_date.gte = parseDateOnly(query.dateFrom);
        if (query.dateTo) where.effective_date.lte = parseDateOnly(query.dateTo);
      }

      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));

      const [total, rows] = await Promise.all([
        prisma.activity_logs.count({ where }),
        prisma.activity_logs.findMany({
          where,
          include: { customers: true, subscriptions: { include: { products: true, product_variants: true } } },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const mapped = rows.map((r: any) => ({
        customerName: r.customers?.name,
        mobile: r.customers?.phone,
        plan: r.subscriptions ? `${r.subscriptions.products?.name}${r.subscriptions.product_variants ? ` - ${r.subscriptions.product_variants.size_label}` : ''}` : null,
        requestedOn: r.created_at,
        effectiveFrom: r.effective_date,
        requestedBy: r.actor === 'admin' ? 'Admin' : 'Customer',
        details: r.message
      }));

      return res.status(200).json({
        success: true,
        data: { rows: mapped, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportChangeRequests(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const where: any = { type: 'change_request' };
      if (query.customerId) where.customer_id = query.customerId;
      if (query.quickRange === 'todayTomorrow') {
        const today = parseDateOnly(formatDateOnly(new Date()));
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        where.effective_date = { gte: today, lte: tomorrow };
      }

      const rows = await prisma.activity_logs.findMany({
        where,
        include: { customers: true, subscriptions: { include: { products: true } } },
        orderBy: { created_at: 'desc' }
      });

      const header = ['Customer', 'Mobile', 'Plan', 'Requested On', 'Effective From', 'Requested By', 'Details'];
      const csvRows = rows.map((r: any) => [
        r.customers?.name || '', r.customers?.phone || '', r.subscriptions?.products?.name || '',
        r.created_at ? formatDateOnly(new Date(r.created_at)) : '', r.effective_date ? formatDateOnly(new Date(r.effective_date)) : '',
        r.actor === 'admin' ? 'Admin' : 'Customer', r.message
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="change-requests-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  // ---- Daily Planner family: Daily Planner, Hub-Wise / Delivery-Boy-Wise pivots, Pending Delivery ----
  private async resolvePlannerRows(query: Record<string, string>) {
    const dateStr = query.date || formatDateOnly(new Date());
    const targetDate = parseDateOnly(dateStr);
    const pendingOnly = query.pendingOnly === 'true';

    const customerWhere: any = {};
    if (query.deliveryBoyId) customerWhere.delivery_boy_id = query.deliveryBoyId;
    if (query.hubId) customerWhere.hub_id = query.hubId;
    if (query.city) customerWhere.city = { contains: query.city, mode: 'insensitive' };
    if (query.area) customerWhere.area = { contains: query.area, mode: 'insensitive' };

    const candidates = await prisma.subscriptions.findMany({
      where: { status: 'active', next_delivery_date: { lte: targetDate }, customers: customerWhere },
      include: PLANNER_INCLUDE
    });

    const resolved: any[] = [];
    for (let s of candidates) {
      const promoted = await subscriptionLifecycleService.promotePendingIfDue(s as any, dateStr);
      if (promoted) {
        s = await prisma.subscriptions.findUnique({ where: { id: s.id }, include: PLANNER_INCLUDE }) as any;
      }
      const finalDate = await subscriptionLifecycleService.skipVacationDays(s as any, dateStr);
      if (!finalDate) continue;
      const finalDateStr = formatDateOnly(finalDate);
      if (pendingOnly ? finalDateStr > dateStr : finalDateStr !== dateStr) continue;
      resolved.push({ ...s, next_delivery_date: finalDate });
    }

    if (pendingOnly) {
      const dueDates = Array.from(new Set(resolved.map((s) => formatDateOnly(new Date(s.next_delivery_date)))));
      const records = await prisma.delivery_records.findMany({
        where: { delivery_date: { in: dueDates.map((d) => parseDateOnly(d)) } },
        select: { subscription_id: true, delivery_date: true }
      });
      const markedKeys = new Set(records.map((r) => `${r.subscription_id}_${formatDateOnly(new Date(r.delivery_date))}`));
      return resolved.filter((s) => !markedKeys.has(`${s.id}_${formatDateOnly(new Date(s.next_delivery_date))}`));
    }

    return resolved;
  }

  private mapPlannerRow(s: any) {
    return {
      customerName: s.customers?.name,
      address: s.customers?.address,
      mobile: s.customers?.phone,
      hub: s.customers?.hubs?.name || 'No Hub Assigned',
      city: s.customers?.city,
      deliveryBoy: s.customers?.delivery_boys?.name || 'Not Assigned',
      mode: s.delivery_modes?.name || s.customers?.delivery_mode || null,
      product: s.products?.name,
      packaging: s.product_variants?.size_label || s.products?.size,
      qty: s.quantity,
      packets: s.quantity * (s.product_variants?.packets || 1),
      frequency: s.frequency,
      deliveryDate: s.next_delivery_date
    };
  }

  private buildPlannerPivot(rows: any[], groupBy: 'hub' | 'deliveryBoy') {
    const colKeyOf = (r: any) => `${r.product} - ${r.packaging}`;
    const groupKeyOf = (r: any) => (groupBy === 'hub' ? r.hub : r.deliveryBoy);

    const columnSet = new Set<string>();
    const groups = new Map<string, Record<string, number>>();

    for (const r of rows) {
      const col = colKeyOf(r);
      const group = groupKeyOf(r);
      columnSet.add(col);
      if (!groups.has(group)) groups.set(group, {});
      const bucket = groups.get(group)!;
      bucket[col] = (bucket[col] || 0) + r.packets;
    }

    const columns = Array.from(columnSet).sort();
    const pivotRows = Array.from(groups.entries()).map(([group, values]) => ({
      group,
      values,
      total: columns.reduce((sum, c) => sum + (values[c] || 0), 0)
    })).sort((a, b) => a.group.localeCompare(b.group));

    const grandTotal: Record<string, number> = {};
    for (const c of columns) grandTotal[c] = pivotRows.reduce((sum, r) => sum + (r.values[c] || 0), 0);

    return { columns, rows: pivotRows, grandTotal };
  }

  public async dailyPlanner(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const dateStr = query.date || formatDateOnly(new Date());
      const groupBy = query.groupBy === 'hub' || query.groupBy === 'deliveryBoy' ? query.groupBy : 'none';
      const resolved = await this.resolvePlannerRows(query);
      const rows = resolved.map((s) => this.mapPlannerRow(s));

      if (groupBy === 'none') {
        return res.status(200).json({ success: true, data: { date: dateStr, rows, total: rows.length } });
      }

      const pivot = this.buildPlannerPivot(rows, groupBy);
      return res.status(200).json({ success: true, data: { date: dateStr, ...pivot } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportDailyPlanner(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const groupBy = query.groupBy === 'hub' || query.groupBy === 'deliveryBoy' ? query.groupBy : 'none';
      const resolved = await this.resolvePlannerRows(query);
      const rows = resolved.map((s) => this.mapPlannerRow(s));

      let csv = '';
      if (groupBy === 'none') {
        const header = ['Customer', 'Address', 'Mobile', 'Hub', 'City', 'Delivery Boy', 'Mode', 'Product', 'Packaging', 'Qty', 'Type', 'Delivery Mode'];
        const csvRows = rows.map((r: any) => [r.customerName, r.address, r.mobile, r.hub, r.city, r.deliveryBoy, r.mode, r.product, r.packaging, r.qty, r.frequency, r.mode]);
        csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      } else {
        const pivot = this.buildPlannerPivot(rows, groupBy);
        const header = [groupBy === 'hub' ? 'Hub' : 'Delivery Boy', ...pivot.columns, 'Total'];
        const csvRows = pivot.rows.map((r) => [r.group, ...pivot.columns.map((c) => r.values[c] || 0), r.total]);
        const totalRow = ['Total', ...pivot.columns.map((c) => pivot.grandTotal[c]), pivot.columns.reduce((s, c) => s + pivot.grandTotal[c], 0)];
        csv = [header, ...csvRows, totalRow].map((r) => r.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="daily-planner-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  // ---- Mark Delivery Report (historical delivery_records) ----
  private markDeliveryWhere(query: Record<string, string>) {
    const where: any = {};
    if (query.customerId) where.customer_id = query.customerId;
    if (query.deliveryBoyId) where.delivery_boy_id = query.deliveryBoyId;
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.delivery_date = {};
      if (query.dateFrom) where.delivery_date.gte = parseDateOnly(query.dateFrom);
      if (query.dateTo) where.delivery_date.lte = parseDateOnly(query.dateTo);
    }
    return where;
  }

  private mapMarkDeliveryRow(r: any) {
    return {
      customerName: r.customers?.name,
      deliveryDate: r.delivery_date,
      product: `${r.products?.name || ''}${r.product_variants ? ` - ${r.product_variants.size_label}` : ''}`,
      deliveryBoy: r.delivery_boys?.name || 'Not Assigned',
      quantityOrdered: Number(r.quantity_ordered),
      quantityDelivered: Number(r.quantity_delivered),
      pendingQty: Number(r.pending_qty),
      bottlesCollected: r.bottles_collected,
      status: r.status,
      remark: r.remark
    };
  }

  public async markDelivery(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));
      const where = this.markDeliveryWhere(query);

      const [total, rows] = await Promise.all([
        prisma.delivery_records.count({ where }),
        prisma.delivery_records.findMany({
          where,
          include: { customers: true, delivery_boys: true, products: true, product_variants: true },
          orderBy: { delivery_date: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map((r) => this.mapMarkDeliveryRow(r)), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportMarkDelivery(req: Request, res: Response) {
    try {
      const where = this.markDeliveryWhere(req.query as Record<string, string>);
      const rows = await prisma.delivery_records.findMany({
        where,
        include: { customers: true, delivery_boys: true, products: true, product_variants: true },
        orderBy: { delivery_date: 'desc' }
      });

      const header = ['Customer', 'Delivery Date', 'Product', 'Delivery Boy', 'Qty Ordered', 'Qty Delivered', 'Pending', 'Bottles Collected', 'Status', 'Remark'];
      const csvRows = rows.map((r: any) => {
        const m = this.mapMarkDeliveryRow(r);
        return [m.customerName, formatDateOnly(new Date(m.deliveryDate)), m.product, m.deliveryBoy, m.quantityOrdered, m.quantityDelivered, m.pendingQty, m.bottlesCollected, m.status, m.remark || ''];
      });
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="mark-delivery-report-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  // ---- Postpaid Inactive Plan Report ----
  private postpaidInactiveWhere(query: Record<string, string>) {
    const where: any = { status: { in: ['inactive', 'cancelled'] }, customers: { customer_type: 'postpaid' } };
    if (query.hubId) where.customers.hub_id = query.hubId;
    if (query.customerId) where.customer_id = query.customerId;
    return where;
  }

  public async postpaidInactivePlans(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)));
      const where = this.postpaidInactiveWhere(query);

      const [total, rows] = await Promise.all([
        prisma.subscriptions.count({ where }),
        prisma.subscriptions.findMany({
          where,
          include: { customers: { include: { hubs: true } }, products: true, product_variants: true },
          orderBy: { updated_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const mapped = rows.map((s: any) => ({
        customerName: s.customers?.name,
        mobile: s.customers?.phone,
        hub: s.customers?.hubs?.name,
        plan: `${s.products?.name}${s.product_variants ? ` - ${s.product_variants.size_label}` : ''}`,
        status: s.status,
        inactivatedAt: s.inactivated_at,
        cancelledAt: s.cancelled_at,
        lastActiveOn: s.updated_at
      }));

      return res.status(200).json({
        success: true,
        data: { rows: mapped, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportPostpaidInactive(req: Request, res: Response) {
    try {
      const where = this.postpaidInactiveWhere(req.query as Record<string, string>);
      const rows = await prisma.subscriptions.findMany({
        where,
        include: { customers: { include: { hubs: true } }, products: true, product_variants: true },
        orderBy: { updated_at: 'desc' }
      });

      const header = ['Customer', 'Mobile', 'Hub', 'Plan', 'Status', 'Inactivated On', 'Cancelled On'];
      const csvRows = rows.map((s: any) => [
        s.customers?.name || '', s.customers?.phone || '', s.customers?.hubs?.name || '',
        `${s.products?.name}${s.product_variants ? ` - ${s.product_variants.size_label}` : ''}`, s.status,
        s.inactivated_at ? formatDateOnly(new Date(s.inactivated_at)) : '', s.cancelled_at ? formatDateOnly(new Date(s.cancelled_at)) : ''
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="postpaid-inactive-plans-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  // ---- Delivery Area Report (same as the Logistics master, plus the derived Delivery Boy column) ----
  private deliveryAreaReportWhere(query: Record<string, string>) {
    const { state, city, areaName, hubId, service } = query;
    const where: any = {};
    if (state) where.state = { contains: state, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (areaName) where.area_name = { contains: areaName, mode: 'insensitive' };
    if (service) where.is_serviceable = service === 'available';
    if (hubId) where.delivery_routes = { hub_id: hubId };
    return where;
  }

  private mapDeliveryAreaReportRow(a: any) {
    return {
      state: a.state,
      city: a.city,
      areaName: a.area_name,
      areaPin: a.area_pin,
      route: a.delivery_routes?.name || null,
      hub: a.delivery_routes?.hubs?.name || null,
      deliveryBoy: a.delivery_routes?.delivery_boys?.name || null,
      isServiceable: a.is_serviceable
    };
  }

  public async deliveryAreaReport(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = this.deliveryAreaReportWhere(query);

      const [total, rows] = await Promise.all([
        prisma.delivery_areas.count({ where }),
        prisma.delivery_areas.findMany({
          where,
          include: { delivery_routes: { include: { hubs: true, delivery_boys: true } } },
          orderBy: { area_name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map((a) => this.mapDeliveryAreaReportRow(a)), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportDeliveryAreaReport(req: Request, res: Response) {
    try {
      const where = this.deliveryAreaReportWhere(req.query as Record<string, string>);
      const rows = await prisma.delivery_areas.findMany({
        where,
        include: { delivery_routes: { include: { hubs: true, delivery_boys: true } } },
        orderBy: { area_name: 'asc' }
      });

      const header = ['State', 'City', 'Area Name', 'Area Pin', 'Route', 'Hub', 'Delivery Boy', 'Service Availability'];
      const csvRows = rows.map((a: any) => {
        const m = this.mapDeliveryAreaReportRow(a);
        return [m.state || '', m.city || '', m.areaName, m.areaPin || '', m.route || '', m.hub || '', m.deliveryBoy || '', m.isServiceable ? 'Delivery Available' : 'Not Available'];
      });
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="delivery-area-report-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  // ---- Revenue Subscription Report (recurring value, distinct from the one-time Order revenue) ----
  private async computeSubscriptionRevenue(query: Record<string, string>) {
    const { from: defaultFrom, to: defaultTo } = defaultRange();
    const dateFrom = query.dateFrom || defaultFrom;
    const dateTo = query.dateTo || defaultTo;
    const rangeWhere = { gte: parseDateOnly(dateFrom), lte: new Date(`${dateTo}T23:59:59.999Z`) };

    const hubFilter: any = {};
    if (query.hubId) hubFilter.hub_id = query.hubId;

    const [activeSubs, newSubs, cancelledSubs] = await Promise.all([
      prisma.subscriptions.findMany({
        where: { status: 'active', customers: hubFilter },
        include: { products: true, product_variants: true, customers: { include: { hubs: true } } }
      }),
      prisma.subscriptions.findMany({
        where: { created_at: rangeWhere, customers: hubFilter },
        include: { products: true }
      }),
      prisma.subscriptions.findMany({
        where: { status: 'cancelled', cancelled_at: rangeWhere, customers: hubFilter },
        include: { products: true }
      })
    ]);

    const today = formatDateOnly(new Date());
    const liveActive = activeSubs.filter((s: any) => !s.expires_at || formatDateOnly(new Date(s.expires_at)) >= today);

    const recurringValue = liveActive.reduce((sum: number, s: any) => sum + Number(s.rate || 0) * s.quantity, 0);
    const newValue = newSubs.reduce((sum: number, s: any) => sum + Number(s.rate || 0) * s.quantity, 0);
    const cancelledValue = cancelledSubs.reduce((sum: number, s: any) => sum + Number(s.rate || 0) * s.quantity, 0);

    const freqMap = new Map<string, { count: number; value: number }>();
    for (const s of liveActive) {
      const entry = freqMap.get(s.frequency) || { count: 0, value: 0 };
      entry.count += 1;
      entry.value += Number(s.rate || 0) * s.quantity;
      freqMap.set(s.frequency, entry);
    }

    const hubMap = new Map<string, { count: number; value: number }>();
    for (const s of liveActive as any[]) {
      const key = s.customers?.hubs?.name || 'No Hub';
      const entry = hubMap.get(key) || { count: 0, value: 0 };
      entry.count += 1;
      entry.value += Number(s.rate || 0) * s.quantity;
      hubMap.set(key, entry);
    }

    const productMap = new Map<string, { qty: number; value: number }>();
    for (const s of liveActive as any[]) {
      const name = s.products?.name || 'Unknown';
      const entry = productMap.get(name) || { qty: 0, value: 0 };
      entry.qty += s.quantity;
      entry.value += Number(s.rate || 0) * s.quantity;
      productMap.set(name, entry);
    }
    const topProducts = Array.from(productMap.entries())
      .map(([productName, v]) => ({ productName, qty: v.qty, value: v.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const dailyMap = new Map<string, { newCount: number; newValue: number }>();
    for (const s of newSubs as any[]) {
      const day = formatDateOnly(new Date(s.created_at));
      const entry = dailyMap.get(day) || { newCount: 0, newValue: 0 };
      entry.newCount += 1;
      entry.newValue += Number(s.rate || 0) * s.quantity;
      dailyMap.set(day, entry);
    }

    return {
      range: { from: dateFrom, to: dateTo },
      summary: {
        activeCount: liveActive.length,
        recurringValue,
        newCount: newSubs.length,
        newValue,
        cancelledCount: cancelledSubs.length,
        cancelledValue
      },
      frequencyBreakdown: Array.from(freqMap.entries()).map(([frequency, v]) => ({ frequency, ...v })),
      hubBreakdown: Array.from(hubMap.entries()).map(([hub, v]) => ({ hub, ...v })),
      topProducts,
      dailyTrend: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  public async subscriptionRevenue(req: Request, res: Response) {
    try {
      const data = await this.computeSubscriptionRevenue(req.query as Record<string, string>);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportSubscriptionRevenue(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const { from: defaultFrom, to: defaultTo } = defaultRange();
      const dateFrom = query.dateFrom || defaultFrom;
      const dateTo = query.dateTo || defaultTo;

      const hubFilter: any = {};
      if (query.hubId) hubFilter.hub_id = query.hubId;

      const rows = await prisma.subscriptions.findMany({
        where: { status: 'active', customers: hubFilter },
        include: { customers: true, products: true, product_variants: true },
        orderBy: { created_at: 'desc' }
      });

      const header = ['Customer', 'Mobile', 'Product', 'Packaging', 'Qty', 'Rate', 'Frequency', 'Subscribed On'];
      const csvRows = rows.map((s: any) => [
        s.customers?.name || '', s.customers?.phone || '', s.products?.name || '',
        s.product_variants?.size_label || '', s.quantity, s.rate ?? '', s.frequency,
        s.created_at ? formatDateOnly(new Date(s.created_at)) : ''
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="revenue-subscription-report-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminReportController = new AdminReportController();
