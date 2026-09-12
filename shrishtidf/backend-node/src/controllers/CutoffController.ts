import { Request, Response } from 'express';
import { cutoffService, formatDateOnly } from '../services/CutoffService';

export class CutoffController {
  public async index(req: Request, res: Response) {
    try {
      const { cutoffTime, earliestEffectiveDate } = await cutoffService.getEarliestEffectiveDate();
      return res.status(200).json({
        success: true,
        data: {
          cutoffTime,
          earliestEffectiveDate: formatDateOnly(earliestEffectiveDate)
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const cutoffController = new CutoffController();
