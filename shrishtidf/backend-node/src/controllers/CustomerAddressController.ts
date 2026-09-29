import { Request, Response } from 'express';
import prisma from '../db/prisma';
import crypto from 'crypto';
import { customerAuthService } from '../services/CustomerAuthService';

function sessionId(req: Request) {
  return (req.headers['session-id'] as string) || req.cookies?.session_id;
}

function composeAddress(a: any) {
  return [a.flat_no, a.society_name, a.street_name, a.landmark, a.city, a.state, a.pincode]
    .filter((part) => part && String(part).trim())
    .join(', ');
}

function mapAddress(a: any) {
  return {
    id: a.id,
    title: a.title,
    flatNo: a.flat_no || '',
    societyName: a.society_name || '',
    streetName: a.street_name || '',
    landmark: a.landmark || '',
    city: a.city || '',
    state: a.state || '',
    pincode: a.pincode || '',
    address: composeAddress(a),
    isDefault: a.is_default
  };
}

async function syncDefaultAddressToCustomer(tx: any, customerId: string) {
  const defaultAddr = await tx.customer_addresses.findFirst({
    where: { customer_id: customerId, is_default: true }
  });
  if (defaultAddr) {
    await tx.customers.update({
      where: { id: customerId },
      data: {
        flat_no: defaultAddr.flat_no,
        society_name: defaultAddr.society_name,
        street_name: defaultAddr.street_name,
        landmark: defaultAddr.landmark,
        city: defaultAddr.city,
        state: defaultAddr.state,
        pincode: defaultAddr.pincode,
        address: composeAddress(defaultAddr)
      }
    });
  } else {
    await tx.customers.update({
      where: { id: customerId },
      data: {
        flat_no: null,
        society_name: null,
        street_name: null,
        landmark: null,
        city: null,
        state: null,
        pincode: null,
        address: null
      }
    });
  }
}

export class CustomerAddressController {
  public async index(req: Request, res: Response) {
    try {
      const customer = await customerAuthService.customerForSession(sessionId(req));
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const addresses = await prisma.customer_addresses.findMany({
        where: { customer_id: customer.id },
        orderBy: [{ is_default: 'desc' }, { created_at: 'asc' }]
      });

      return res.status(200).json({ success: true, data: addresses.map(mapAddress) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const customer = await customerAuthService.customerForSession(sessionId(req));
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const { title, flatNo, societyName, streetName, landmark, city, state, pincode, isDefault } = req.body;
      const cleanPincode = String(pincode || '').replace(/\D+/g, '');
      if (cleanPincode.length !== 6) {
        return res.status(422).json({ success: false, message: 'A valid 6-digit pincode is required' });
      }
      if (!flatNo && !streetName) {
        return res.status(422).json({ success: false, message: 'Flat/House No. and Street/Area are required' });
      }

      const existingCount = await prisma.customer_addresses.count({ where: { customer_id: customer.id } });
      // The very first address is always the default — there's no meaningful
      // "non-default" state when it's the only one saved.
      const makeDefault = existingCount === 0 || isDefault === true;

      const now = new Date();
      const created = await prisma.$transaction(async (tx) => {
        if (makeDefault) {
          await tx.customer_addresses.updateMany({ where: { customer_id: customer.id }, data: { is_default: false } });
        }
        const addr = await tx.customer_addresses.create({
          data: {
            id: crypto.randomUUID(),
            customer_id: customer.id,
            title: (title || 'Home').trim(),
            flat_no: flatNo || null,
            society_name: societyName || null,
            street_name: streetName || null,
            landmark: landmark || null,
            city: city || null,
            state: state || null,
            pincode: cleanPincode,
            is_default: makeDefault,
            created_at: now,
            updated_at: now
          }
        });
        await syncDefaultAddressToCustomer(tx, customer.id);
        return addr;
      });

      return res.status(201).json({ success: true, data: mapAddress(created) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const customer = await customerAuthService.customerForSession(sessionId(req));
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const existing = await prisma.customer_addresses.findUnique({ where: { id: req.params.id as string } });
      if (!existing || existing.customer_id !== customer.id) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }

      const { title, flatNo, societyName, streetName, landmark, city, state, pincode } = req.body;
      const data: any = { updated_at: new Date() };
      if (title !== undefined) data.title = title.trim();
      if (flatNo !== undefined) data.flat_no = flatNo || null;
      if (societyName !== undefined) data.society_name = societyName || null;
      if (streetName !== undefined) data.street_name = streetName || null;
      if (landmark !== undefined) data.landmark = landmark || null;
      if (city !== undefined) data.city = city || null;
      if (state !== undefined) data.state = state || null;
      if (pincode !== undefined) {
        const cleanPincode = String(pincode).replace(/\D+/g, '');
        if (cleanPincode.length !== 6) {
          return res.status(422).json({ success: false, message: 'A valid 6-digit pincode is required' });
        }
        data.pincode = cleanPincode;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.customer_addresses.update({ where: { id: existing.id }, data });
        if (existing.is_default) {
          await syncDefaultAddressToCustomer(tx, customer.id);
        }
        return u;
      });
      return res.status(200).json({ success: true, data: mapAddress(updated) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async destroy(req: Request, res: Response) {
    try {
      const customer = await customerAuthService.customerForSession(sessionId(req));
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const existing = await prisma.customer_addresses.findUnique({ where: { id: req.params.id as string } });
      if (!existing || existing.customer_id !== customer.id) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.customer_addresses.delete({ where: { id: existing.id } });

        // Deleting the default address promotes the next most recent one, so
        // checkout always has an address to fall back on when one exists.
        if (existing.is_default) {
          const next = await tx.customer_addresses.findFirst({
            where: { customer_id: customer.id },
            orderBy: { created_at: 'desc' }
          });
          if (next) {
            await tx.customer_addresses.update({ where: { id: next.id }, data: { is_default: true } });
          }
          await syncDefaultAddressToCustomer(tx, customer.id);
        }
      });

      return res.status(200).json({ success: true, data: {} });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async setDefault(req: Request, res: Response) {
    try {
      const customer = await customerAuthService.customerForSession(sessionId(req));
      if (!customer) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not logged in' });

      const existing = await prisma.customer_addresses.findUnique({ where: { id: req.params.id as string } });
      if (!existing || existing.customer_id !== customer.id) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.customer_addresses.updateMany({ where: { customer_id: customer.id }, data: { is_default: false } });
        await tx.customer_addresses.update({ where: { id: existing.id }, data: { is_default: true, updated_at: new Date() } });
        await syncDefaultAddressToCustomer(tx, customer.id);
      });

      return res.status(200).json({ success: true, data: {} });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const customerAddressController = new CustomerAddressController();
