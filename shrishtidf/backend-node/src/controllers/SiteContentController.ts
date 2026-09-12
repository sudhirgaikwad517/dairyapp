import { Request, Response } from 'express';

export class SiteContentController {
  public async index(req: Request, res: Response) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          heroBadge: "Farm Fresh Certified A2 Milk",
          freeSampleButtonLabel: "Request Free Sample",
          whatsappNumber: "+919876543210",
          promoMessages: ["Free Delivery on all orders", "Subscribe & Save 10%"]
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: { message: 'Internal Server Error' } });
    }
  }
}

export const siteContentController = new SiteContentController();
