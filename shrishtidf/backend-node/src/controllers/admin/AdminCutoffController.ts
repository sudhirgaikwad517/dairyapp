import { Request, Response } from 'express';
import { cutoffService } from '../../services/CutoffService';

export class AdminCutoffController {
  public async show(req: Request, res: Response) {
    try {
      const cutoffTime = await cutoffService.getCutoffTime();
      return res.status(200).json({ success: true, data: { cutoffTime } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const { cutoffTime } = req.body;
      if (!cutoffTime || !/^\d{2}:\d{2}$/.test(cutoffTime)) {
        return res.status(422).json({ success: false, message: 'cutoffTime must be in HH:mm 24-hour format' });
      }

      await cutoffService.setCutoffTime(cutoffTime);
      return res.status(200).json({ success: true, data: { cutoffTime } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
}

export const adminCutoffController = new AdminCutoffController();
