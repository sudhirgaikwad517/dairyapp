import { Request, Response } from 'express';
import prisma from '../../db/prisma';

export class DeliveryBoyRunController {
  
  // Get all delivery records assigned to this delivery boy for a specific date (defaults to today)
  public async getDailyRun(req: Request, res: Response) {
    try {
      if (!req.deliveryBoy) return res.status(401).json({ success: false, message: 'Unauthorized' });

      let { date } = req.query;
      let targetDate = new Date();
      if (date && typeof date === 'string') {
        targetDate = new Date(date);
      }
      
      // We only care about the date part
      targetDate.setUTCHours(0,0,0,0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const records = await prisma.delivery_records.findMany({
        where: {
          delivery_boy_id: req.deliveryBoy.id,
          delivery_date: {
            gte: targetDate,
            lt: nextDate
          }
        },
        include: {
          customers: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
              flat_no: true,
              society_name: true,
              landmark: true,
              latitude: true,
              longitude: true,
              delivery_sequence: true
            }
          },
          products: {
            select: {
              id: true,
              name: true,
              image_url: true,
            }
          },
          product_variants: {
            select: {
              id: true,
              size_label: true
            }
          }
        },
        orderBy: {
          customers: {
            delivery_sequence: 'asc'
          }
        }
      });

      return res.status(200).json({ success: true, data: records });
    } catch (error) {
      console.error('getDailyRun Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // Mark a delivery record (Delivered, Damaged, Skipped)
  public async markDelivery(req: Request, res: Response) {
    try {
      if (!req.deliveryBoy) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { recordId } = req.params;
      const { status, quantityDelivered, remark, leakPhotoUrl, deliveryPhotoUrl } = req.body;

      if (!['delivered', 'skipped', 'damaged'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const record = await prisma.delivery_records.findUnique({
        where: { id: recordId }
      });

      if (!record) {
        return res.status(404).json({ success: false, message: 'Delivery record not found' });
      }

      if (record.delivery_boy_id !== req.deliveryBoy.id) {
        return res.status(403).json({ success: false, message: 'Record does not belong to you' });
      }

      // Update record
      const updatedRecord = await prisma.delivery_records.update({
        where: { id: recordId },
        data: {
          status,
          quantity_delivered: status === 'delivered' ? quantityDelivered : 0,
          pending_qty: status === 'delivered' ? (Number(record.quantity_ordered) - Number(quantityDelivered)) : record.quantity_ordered,
          remark,
          leak_photo_url: leakPhotoUrl,
          delivery_photo_url: deliveryPhotoUrl,
          delivered_at: new Date(),
        }
      });

      // TODO: Wallet deduction logic would go here depending on payment type (prepaid/postpaid)
      // If customer is prepaid and delivery is successful, deduct from wallet (quantityDelivered * rate)
      
      return res.status(200).json({ success: true, data: updatedRecord });
    } catch (error) {
      console.error('markDelivery Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // Get upload URL for photos (to S3/R2)
  public async getUploadUrl(req: Request, res: Response) {
    // Implement standard presigned URL generation here
    return res.status(200).json({ success: true, data: { uploadUrl: '', fileUrl: '' } });
  }
}

export const deliveryBoyRunController = new DeliveryBoyRunController();
