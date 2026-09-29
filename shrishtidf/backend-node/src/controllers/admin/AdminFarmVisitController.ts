import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { parseDateOnly } from '../../services/SubscriptionLifecycleService';

function buildWhere(query: Record<string, any>) {
  const { visitDate } = query;
  const where: any = {};
  if (visitDate) {
    const day = parseDateOnly(visitDate);
    const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    where.visit_date = { gte: day, lt: nextDay };
  }
  return where;
}

function mapRequest(r: any) {
  return {
    id: r.id,
    name: r.name,
    contactNo: r.contact_no,
    numberOfPersons: r.number_of_persons,
    address: r.address,
    visitDate: r.visit_date,
    visitTimeSlot: r.visit_time_slot,
    reply: r.reply,
    repliedBy: r.replied_by,
    repliedAt: r.replied_at,
    createdAt: r.created_at
  };
}

export class AdminFarmVisitController {
  public async index(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
      const where = buildWhere(query);

      const [total, rows] = await Promise.all([
        prisma.farm_visit_requests.count({ where }),
        prisma.farm_visit_requests.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.status(200).json({
        success: true,
        data: { rows: rows.map(mapRequest), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async exportRequests(req: Request, res: Response) {
    try {
      const where = buildWhere(req.query as Record<string, string>);
      const rows = await prisma.farm_visit_requests.findMany({ where, orderBy: { created_at: 'desc' } });

      const header = ['Name', 'Contact No', 'Number of Persons', 'Address', 'Visit Date', 'Time Slot', 'Reply'];
      const csvRows = rows.map((r: any) => [
        r.name, r.contact_no, r.number_of_persons, r.address,
        r.visit_date ? new Date(r.visit_date).toLocaleDateString('en-IN') : '', r.visit_time_slot, r.reply || ''
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="farm-visit-requests-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async reply(req: Request, res: Response) {
    try {
      const { reply } = req.body;
      if (!reply || !String(reply).trim()) {
        return res.status(422).json({ success: false, message: 'Reply text is required' });
      }

      const request = await prisma.farm_visit_requests.findUnique({ where: { id: req.params.id as string } });
      if (!request) return res.status(404).json({ success: false, message: 'Farm visit request not found' });

      const now = new Date();
      const updated = await prisma.farm_visit_requests.update({
        where: { id: request.id },
        data: { reply: reply.trim(), replied_by: 'Admin', replied_at: now, updated_at: now }
      });

      return res.status(200).json({ success: true, data: mapRequest(updated) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminFarmVisitController = new AdminFarmVisitController();
