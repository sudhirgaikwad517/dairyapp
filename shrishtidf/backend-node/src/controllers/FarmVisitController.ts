import { Request, Response } from 'express';
import prisma from '../db/prisma';
import crypto from 'crypto';
import { activityLogService } from '../services/ActivityLogService';
import { parseDateOnly } from '../services/SubscriptionLifecycleService';

export class FarmVisitController {
  public async create(req: Request, res: Response) {
    try {
      const { name, contactNo, numberOfPersons, address, visitDate, visitTimeSlot } = req.body;

      if (!name || !contactNo || !numberOfPersons || !address || !visitDate || !visitTimeSlot) {
        return res.status(422).json({ success: false, message: 'All fields are required' });
      }
      const persons = Number(numberOfPersons);
      if (!persons || persons < 1) {
        return res.status(422).json({ success: false, message: 'Number of persons must be at least 1' });
      }

      const now = new Date();
      const created = await prisma.farm_visit_requests.create({
        data: {
          id: crypto.randomUUID(),
          name,
          contact_no: contactNo,
          number_of_persons: persons,
          address,
          visit_date: parseDateOnly(visitDate),
          visit_time_slot: visitTimeSlot,
          created_at: now,
          updated_at: now
        }
      });

      await activityLogService.log({
        type: 'enquiry',
        title: 'Farm Visit Request',
        message: `${name} (${contactNo}) requested a farm visit on ${visitDate}, ${visitTimeSlot} for ${persons} person(s).`
      });

      return res.status(201).json({ success: true, data: { id: created.id } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const farmVisitController = new FarmVisitController();
