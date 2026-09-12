import { Request, Response } from 'express';
import prisma from '../../db/prisma';

export class AdminLogisticsController {
  public async getInventory(req: Request, res: Response) {
    try {
      const batches = await prisma.inventory_batches.findMany({
        include: { products: true, product_variants: true },
        orderBy: { expiry_date: 'asc' }
      });

      const mapped = batches.map((b: any) => {
        let status = 'Good';
        const daysToExpiry = (new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24);
        if (b.quantity === 0) status = 'Empty';
        else if (b.quantity < 20) status = 'Low Stock';
        else if (daysToExpiry < 3) status = 'Expiring Soon';

        return {
          id: b.batch_number,
          product: b.products.name,
          variant: b.product_variants?.size_label || b.products.size,
          quantity: b.quantity,
          expiry: b.expiry_date,
          status
        };
      });

      return res.status(200).json({ success: true, data: mapped });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async getRoutes(req: Request, res: Response) {
    try {
      const routes = await prisma.delivery_routes.findMany({
        where: { is_active: true },
        include: { delivery_boys: true },
        orderBy: { sort_order: 'asc' }
      });

      const mapped = routes.map((r: any) => ({
        id: r.id,
        name: r.name,
        routeCode: r.route_code,
        driver: r.delivery_boys?.name || 'Unassigned'
      }));

      return res.status(200).json({ success: true, data: mapped });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async getDeliveryBoys(req: Request, res: Response) {
    try {
      const boys = await prisma.delivery_boys.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' }
      });

      return res.status(200).json({
        success: true,
        data: boys.map((b: any) => ({ id: b.id, name: b.name, phone: b.phone }))
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async getZones(req: Request, res: Response) {
    try {
      const zones = await prisma.delivery_zones.findMany({
        orderBy: { pincode: 'asc' }
      });

      const mapped = zones.map((z: any) => ({
        id: z.id,
        pincode: z.pincode,
        area: z.area_name,
        city: z.city,
        route: z.route_id || 'Unassigned',
        fee: Number(z.delivery_fee || 0),
        minOrder: Number(z.min_order_value || 0),
        active: z.is_serviceable
      }));

      return res.status(200).json({ success: true, data: mapped });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async getDispatchSheet(req: Request, res: Response) {
    try {
      const dateParam = req.query.date as string;
      const targetDate = dateParam && !isNaN(new Date(dateParam).getTime()) ? new Date(dateParam) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const routes = await prisma.delivery_routes.findMany({
        where: { is_active: true },
        orderBy: { sort_order: 'asc' },
        include: { delivery_boys: true }
      });

      const result = await Promise.all(routes.map(async (route: any) => {
        const orders = await prisma.orders.findMany({
          where: {
            route_id: route.id,
            status: { not: 'CANCELLED' },
            delivery_date: { gte: startOfDay, lte: endOfDay }
          },
          include: { order_items: true }
        });

        const itemsMap = new Map<string, { name: string; quantity: number; type: string }>();
        for (const order of orders) {
          for (const item of order.order_items) {
            const type = item.purchase_type === 'SUBSCRIPTION' ? 'Subscription' : 'One-time';
            const key = `${item.product_name}__${type}`;
            const existing = itemsMap.get(key);
            if (existing) existing.quantity += item.quantity;
            else itemsMap.set(key, { name: item.product_name, quantity: item.quantity, type });
          }
        }

        return {
          id: route.id,
          name: route.name,
          driver: route.delivery_boys?.name || 'Unassigned',
          totalOrders: orders.length,
          items: Array.from(itemsMap.values())
        };
      }));

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminLogisticsController = new AdminLogisticsController();
