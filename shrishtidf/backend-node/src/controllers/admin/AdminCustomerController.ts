import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import crypto from 'crypto';
import { activityLogService } from '../../services/ActivityLogService';
import { customerCodeService } from '../../services/CustomerCodeService';
import { formatDateOnly } from '../../services/CutoffService';

function buildWhere(query: Record<string, any>) {
  const { name, mobile, email, customerType, routeId, routeNotAssigned, hubId, deliveryBoyId, deliveryBoyNotAssigned, sequenceNotAssigned, status, city, regFrom, regTo } = query;
  const where: any = {};
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (mobile) where.phone = { contains: mobile };
  if (email) where.email = { contains: email, mode: 'insensitive' };
  if (customerType) where.customer_type = customerType;
  if (routeNotAssigned === 'true') where.route_id = null;
  else if (routeId) where.route_id = routeId;
  if (hubId) where.hub_id = hubId;
  if (deliveryBoyNotAssigned === 'true') where.delivery_boy_id = null;
  else if (deliveryBoyId) where.delivery_boy_id = deliveryBoyId;
  if (sequenceNotAssigned === 'true') where.delivery_sequence = 0;
  if (status) where.is_active = status === 'active';
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (regFrom || regTo) {
    where.created_at = {};
    if (regFrom) where.created_at.gte = new Date(regFrom);
    if (regTo) where.created_at.lte = new Date(`${regTo}T23:59:59.999Z`);
  }
  return where;
}

export class AdminCustomerController {
  public async getCustomers(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(500, Math.max(1, parseInt(query.pageSize || '10', 10)));

      const where = buildWhere(query);

      if (query.subscriptionStatus) {
        if (query.subscriptionStatus === 'none') {
          const withSubs = await prisma.subscriptions.findMany({ select: { customer_id: true }, distinct: ['customer_id'] });
          const excludeIds = withSubs.map((s: any) => s.customer_id);
          where.id = { notIn: excludeIds.length ? excludeIds : ['__none__'] };
        } else {
          const matching = await prisma.subscriptions.findMany({
            where: { status: query.subscriptionStatus },
            select: { customer_id: true },
            distinct: ['customer_id']
          });
          const ids = matching.map((s: any) => s.customer_id);
          where.id = { in: ids.length ? ids : ['__none__'] };
        }
      }

      const [total, rows, serviceableZones] = await Promise.all([
        prisma.customers.count({ where }),
        prisma.customers.findMany({
          where,
          include: { hubs: true, delivery_routes: true, delivery_boys: true, customer_wallets: true },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.delivery_zones.findMany({ where: { is_serviceable: true }, select: { pincode: true } })
      ]);

      const serviceableSet = new Set(serviceableZones.map((z: any) => z.pincode));

      const customerIds = rows.map((c: any) => c.id);
      const subs = customerIds.length
        ? await prisma.subscriptions.findMany({
            where: { customer_id: { in: customerIds } },
            select: { customer_id: true, status: true }
          })
        : [];
      const subStatusMap = new Map<string, string>();
      for (const s of subs) {
        const existing = subStatusMap.get(s.customer_id);
        if (!existing || s.status === 'active') subStatusMap.set(s.customer_id, s.status);
      }

      const mapped = rows.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        phone: c.phone,
        email: c.email,
        registeredAt: c.created_at,
        address: c.address,
        apartment: c.society_name,
        city: c.city,
        pincode: c.pincode,
        hub: c.hubs?.name || null,
        hubId: c.hub_id,
        route: c.delivery_routes?.name || null,
        routeId: c.route_id,
        deliveryBoy: c.delivery_boys?.name || null,
        deliveryBoyId: c.delivery_boy_id,
        isActive: c.is_active,
        customerType: c.customer_type,
        serviceable: c.pincode ? serviceableSet.has(c.pincode) : false,
        wallet: c.customer_wallets ? Number(c.customer_wallets.balance) : 0,
        subscriptionStatus: subStatusMap.get(c.id) || 'none',
        registeredBy: c.registered_by,
        deliverySequence: c.delivery_sequence,
        latitude: c.latitude !== null && c.latitude !== undefined ? Number(c.latitude) : null,
        longitude: c.longitude !== null && c.longitude !== undefined ? Number(c.longitude) : null
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

  public async exportCustomers(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);

      const rows = await prisma.customers.findMany({
        where,
        include: { hubs: true, delivery_routes: true, delivery_boys: true },
        orderBy: { created_at: 'desc' }
      });

      const header = ['Customer ID', 'Name', 'Mobile', 'Email', 'Registration Date', 'City', 'Address', 'Hub', 'Route', 'Delivery Boy', 'Status'];
      const csvRows = rows.map((c: any) => [
        c.code || '',
        c.name || '',
        c.phone || '',
        c.email || '',
        c.created_at ? formatDateOnly(new Date(c.created_at)) : '',
        c.city || '',
        (c.address || '').replace(/[\r\n,]+/g, ' '),
        c.hubs?.name || '',
        c.delivery_routes?.name || '',
        c.delivery_boys?.name || '',
        c.is_active ? 'Active' : 'Inactive'
      ]);

      const csv = [header, ...csvRows]
        .map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="customers-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async createCustomer(req: Request, res: Response) {
    try {
      const b = req.body;
      const name = (b.name || [b.firstName, b.middleName, b.lastName].filter(Boolean).join(' ')).trim();
      if (!name || !b.phone) {
        return res.status(422).json({ success: false, message: 'Name and mobile number are required' });
      }

      const phone = String(b.phone).replace(/\D+/g, '');
      const existing = await prisma.customers.findUnique({ where: { phone } });
      if (existing) {
        return res.status(422).json({ success: false, message: 'A customer with this mobile number already exists' });
      }

      const code = await customerCodeService.next();
      const addressParts = [b.flatNo, b.floor ? `Floor ${b.floor}` : null, b.societyName, b.streetName, b.landmark].filter(Boolean);

      const customer = await prisma.customers.create({
        data: {
          id: crypto.randomUUID(),
          code,
          name,
          phone,
          alternate_phone: b.alternatePhone || null,
          email: b.email || null,
          date_of_birth: b.dateOfBirth ? new Date(b.dateOfBirth) : null,
          residence_type: b.residenceType || null,
          flat_no: b.flatNo || null,
          society_name: b.societyName || null,
          street_name: b.streetName || null,
          landmark: b.landmark || null,
          area: b.area || null,
          state: b.state || 'Maharashtra',
          city: b.city || null,
          pincode: b.pincode || null,
          address: addressParts.join(', ') || null,
          delivery_mode: b.deliveryMode || 'Ring the Bell',
          customer_type: b.customerType || 'prepaid',
          hub_id: b.hubId || null,
          route_id: b.routeId || null,
          delivery_boy_id: b.deliveryBoyId || null,
          is_active: b.status !== undefined ? !!b.status : true,
          registered_by: 'admin',
          orders_count: 0,
          leads_count: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      await activityLogService.log({
        type: 'customer_registered',
        title: 'New Customer Registered',
        message: `${name} (${code}) was added by admin.`,
        customerId: customer.id
      });

      return res.status(201).json({ success: true, data: { customer } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async getCustomer(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const customer = await prisma.customers.findUnique({
        where: { id },
        include: {
          hubs: true,
          delivery_routes: true,
          delivery_boys: true,
          customer_wallets: true,
          orders: { orderBy: { created_at: 'desc' }, take: 10 },
          subscriptions: { include: { products: true } },
          customer_delivery_boy_changes: { orderBy: { changed_at: 'desc' }, take: 20 }
        }
      });

      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const safe = JSON.parse(JSON.stringify(customer, (_key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));

      return res.status(200).json({ success: true, data: safe });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async updateCustomer(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const b = req.body;

      const existing = await prisma.customers.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      if (b.hubId) {
        const hub = await prisma.hubs.findUnique({ where: { id: b.hubId } });
        if (!hub) return res.status(422).json({ success: false, message: 'Selected hub does not exist' });
      }
      if (b.routeId) {
        const route = await prisma.delivery_routes.findUnique({ where: { id: b.routeId } });
        if (!route) return res.status(422).json({ success: false, message: 'Selected route does not exist' });
      }
      if (b.deliveryBoyId) {
        const boy = await prisma.delivery_boys.findUnique({ where: { id: b.deliveryBoyId } });
        if (!boy) return res.status(422).json({ success: false, message: 'Selected delivery boy does not exist' });
      }

      const data: any = {};
      if (b.name !== undefined) {
        data.name = b.name;
      } else if (b.firstName || b.middleName || b.lastName) {
        data.name = [b.firstName, b.middleName, b.lastName].filter(Boolean).join(' ');
      }
      if (b.email !== undefined) data.email = b.email || null;
      if (b.alternatePhone !== undefined) data.alternate_phone = b.alternatePhone || null;
      if (b.dateOfBirth !== undefined) data.date_of_birth = b.dateOfBirth ? new Date(b.dateOfBirth) : null;
      if (b.residenceType !== undefined) data.residence_type = b.residenceType || null;
      if (b.flatNo !== undefined) data.flat_no = b.flatNo || null;
      if (b.societyName !== undefined) data.society_name = b.societyName || null;
      if (b.streetName !== undefined) data.street_name = b.streetName || null;
      if (b.landmark !== undefined) data.landmark = b.landmark || null;
      if (b.area !== undefined) data.area = b.area || null;
      if (b.state !== undefined) data.state = b.state || null;
      if (b.city !== undefined) data.city = b.city || null;
      if (b.pincode !== undefined) data.pincode = b.pincode || null;
      if (b.deliveryMode !== undefined) data.delivery_mode = b.deliveryMode;
      if (b.customerType !== undefined) data.customer_type = b.customerType;
      if (b.hubId !== undefined) data.hub_id = b.hubId || null;
      if (b.routeId !== undefined) data.route_id = b.routeId || null;
      if (b.status !== undefined) data.is_active = !!b.status;
      if (b.deliverySequence !== undefined) data.delivery_sequence = Number(b.deliverySequence) || 0;
      if (b.latitude !== undefined) data.latitude = b.latitude === null ? null : Number(b.latitude);
      if (b.longitude !== undefined) data.longitude = b.longitude === null ? null : Number(b.longitude);

      let deliveryBoyChanged = false;
      if (b.deliveryBoyId !== undefined && b.deliveryBoyId !== existing.delivery_boy_id) {
        deliveryBoyChanged = true;
        data.delivery_boy_id = b.deliveryBoyId || null;
      }

      data.updated_at = new Date();

      const updated = await prisma.customers.update({ where: { id }, data });

      if (deliveryBoyChanged) {
        await prisma.customer_delivery_boy_changes.create({
          data: {
            id: crypto.randomUUID(),
            customer_id: id,
            old_delivery_boy_id: existing.delivery_boy_id,
            new_delivery_boy_id: updated.delivery_boy_id,
            narration: b.deliveryBoyChangeNarration || null,
            changed_by: 'admin',
            changed_at: new Date()
          }
        });
      }

      return res.status(200).json({ success: true, data: { customer: updated } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async getSubscriptions(req: Request, res: Response) {
    try {
      const subscriptions = await prisma.subscriptions.findMany({
        include: { customers: true, products: true, product_variants: true },
        orderBy: { created_at: 'desc' }
      });

      const mapped = subscriptions.map((s: any) => ({
        id: s.id,
        customerName: s.customers?.name || 'Unknown',
        product: `${s.products.name} - ${s.product_variants?.size_label || s.products.size}`,
        frequency: s.frequency,
        qty: s.quantity,
        nextDelivery: s.next_delivery_date,
        status: s.status === 'active' ? 'Active' : (s.status === 'paused' ? 'Paused' : 'Cancelled')
      }));

      return res.status(200).json({ success: true, data: mapped });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminCustomerController = new AdminCustomerController();
