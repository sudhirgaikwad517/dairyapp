import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db/prisma';
import { customerAuthService } from '../services/CustomerAuthService';
import { cutoffService, formatDateOnly } from '../services/CutoffService';
import { parseDateOnly } from '../services/SubscriptionLifecycleService';
import { activityLogService } from '../services/ActivityLogService';

// "Vacation Mode" pauses every delivery for the customer across a date range —
// distinct from pausing a single subscription. It writes to the same
// `vacations` table the admin panel already manages, so an admin sees and can
// override anything a customer schedules here.
function mapVacation(v: any) {
  const today = formatDateOnly(new Date());
  const from = formatDateOnly(new Date(v.from_date));
  const to = formatDateOnly(new Date(v.to_date));
  return {
    id: v.id,
    fromDate: from,
    toDate: to,
    remark: v.remark,
    isEnded: !!v.ended_by,
    isActive: !v.ended_by && from <= today && today <= to,
    isUpcoming: !v.ended_by && from > today,
    createdAt: v.created_at
  };
}

export class VacationController {
  private async currentCustomer(req: Request) {
    const sessionId = req.headers['session-id'] as string || req.cookies?.session_id;
    return customerAuthService.customerForSession(sessionId);
  }

  public async index(req: Request, res: Response) {
    try {
      const customer = await this.currentCustomer(req);
      if (!customer) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });
      }

      const rows = await prisma.vacations.findMany({
        where: { customer_id: customer.id },
        orderBy: { from_date: 'desc' },
        take: 30
      });

      const mapped = rows.map(mapVacation);
      return res.status(200).json({
        success: true,
        data: {
          vacations: mapped,
          active: mapped.find((v) => v.isActive) || null,
          upcoming: mapped.filter((v) => v.isUpcoming)
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const customer = await this.currentCustomer(req);
      if (!customer) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });
      }

      const { fromDate, toDate, remark } = req.body;
      if (!fromDate || !toDate) {
        return res.status(422).json({ success: false, message: 'From Date and To Date are required' });
      }

      const from = parseDateOnly(fromDate);
      const to = parseDateOnly(toDate);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(422).json({ success: false, message: 'Please choose valid dates' });
      }
      if (from > to) {
        return res.status(422).json({ success: false, message: 'From Date must be on or before To Date' });
      }

      // Tomorrow's route may already be locked in — don't let a customer
      // schedule a start date the delivery team can no longer act on.
      const { earliestEffectiveDate } = await cutoffService.getEarliestEffectiveDate();
      if (from < earliestEffectiveDate) {
        return res.status(422).json({
          success: false,
          errorCode: 'BEFORE_CUTOFF',
          message: `The earliest available start date is ${formatDateOnly(earliestEffectiveDate)}.`,
          data: { earliestEffectiveDate: formatDateOnly(earliestEffectiveDate) }
        });
      }

      // Two vacations can't overlap — the delivery-skip logic keys off date
      // ranges per customer, so overlapping rows would just be confusing.
      const overlapping = await prisma.vacations.findFirst({
        where: {
          customer_id: customer.id,
          ended_by: null,
          from_date: { lte: to },
          to_date: { gte: from }
        }
      });
      if (overlapping) {
        return res.status(422).json({
          success: false,
          message: `This overlaps a vacation already scheduled from ${formatDateOnly(new Date(overlapping.from_date))} to ${formatDateOnly(new Date(overlapping.to_date))}.`
        });
      }

      const now = new Date();
      const vacation = await prisma.vacations.create({
        data: {
          id: crypto.randomUUID(),
          customer_id: customer.id,
          from_date: from,
          to_date: to,
          remark: remark ? String(remark).trim().slice(0, 500) : null,
          entry_by: 'customer',
          created_at: now,
          updated_at: now
        }
      });

      await activityLogService.log({
        type: 'holiday',
        subtype: 'vacation_start',
        title: 'Vacation Scheduled',
        message: `${customer.name || customer.phone} scheduled a vacation from ${formatDateOnly(from)} to ${formatDateOnly(to)} via the app.`,
        customerId: customer.id,
        effectiveDate: from,
        actor: 'customer'
      });

      return res.status(201).json({ success: true, data: mapVacation(vacation) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  /// Upcoming (not yet started) → cancelled outright. Already active →
  /// shortened to end today, same as the admin's "end early" action.
  public async cancel(req: Request, res: Response) {
    try {
      const customer = await this.currentCustomer(req);
      if (!customer) {
        return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });
      }

      const id = req.params.id as string;
      const vacation = await prisma.vacations.findUnique({ where: { id } });
      if (!vacation || vacation.customer_id !== customer.id) {
        return res.status(404).json({ success: false, message: 'Vacation not found' });
      }
      if (vacation.ended_by) {
        return res.status(422).json({ success: false, message: 'This vacation has already ended' });
      }

      const today = parseDateOnly(formatDateOnly(new Date()));
      const notStarted = vacation.from_date > today;

      let updated;
      if (notStarted) {
        // Nothing has happened yet — remove it entirely rather than leaving a
        // zero-length "ended" row behind.
        await prisma.vacations.delete({ where: { id } });
        updated = null;
      } else {
        updated = await prisma.vacations.update({
          where: { id },
          data: { to_date: today, ended_by: 'customer', ended_at: new Date(), updated_at: new Date() }
        });
      }

      await activityLogService.log({
        type: 'holiday',
        subtype: 'vacation_end',
        title: notStarted ? 'Vacation Cancelled' : 'Vacation Ended Early',
        message: `${customer.name || customer.phone} ${notStarted ? 'cancelled their upcoming' : 'ended their'} vacation via the app.`,
        customerId: customer.id,
        actor: 'customer'
      });

      return res.status(200).json({ success: true, data: updated ? mapVacation(updated) : null });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const vacationController = new VacationController();
