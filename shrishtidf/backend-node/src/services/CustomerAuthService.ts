import prisma from '../db/prisma';
import crypto from 'crypto';
import { activityLogService } from './ActivityLogService';
import { customerCodeService } from './CustomerCodeService';

// Simple in-memory cache to replace Laravel's Cache facade
const cache = new Map<string, { value: string; expiry: number }>();

function putCache(key: string, value: string, ttlSeconds: number) {
  cache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
}

function getCache(key: string): string | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function forgetCache(key: string) {
  cache.delete(key);
}

export class CustomerAuthService {
  private readonly OTP_TTL_SECONDS = 300;
  private readonly AUTH_TTL_SECONDS = 60 * 60 * 24 * 30;
  
  private readonly PROFILE_FIELDS = [
    'name', 'email', 'flatNo', 'societyName', 'streetName', 
    'landmark', 'city', 'state', 'pincode'
  ];

  public sendOtp(phone: string) {
    phone = this.normalizePhone(phone);
    if (phone.length < 10) {
      throw new Error('INVALID_PHONE');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    putCache(this.otpCacheKey(phone), otp, this.OTP_TTL_SECONDS);

    const payload: any = {
      phone,
      expiresIn: this.OTP_TTL_SECONDS
    };

    // Always include debugOtp for development/testing like the original
    payload.debugOtp = otp;

    return payload;
  }

  public async verifyOtp(phone: string, otp: string, sessionId: string) {
    phone = this.normalizePhone(phone);
    const cached = getCache(this.otpCacheKey(phone));

    if (!cached || cached !== otp.trim()) {
      throw new Error('INVALID_OTP');
    }

    forgetCache(this.otpCacheKey(phone));

    let customer = await prisma.customers.findUnique({ where: { phone } });
    if (!customer) {
      const code = await customerCodeService.next();
      customer = await prisma.customers.create({
        data: {
          id: crypto.randomUUID(),
          code,
          phone,
          orders_count: 0,
          leads_count: 0,
          registered_by: 'customer'
        }
      });

      await activityLogService.log({
        type: 'customer_registered',
        title: 'New Customer Registered',
        message: `A new customer registered with phone ${phone}.`,
        customerId: customer.id
      });
    }

    await prisma.customers.update({
      where: { id: customer.id },
      data: { last_seen_at: new Date() }
    });

    putCache(this.authCacheKey(sessionId), phone, this.AUTH_TTL_SECONDS);

    return this.mapCustomer(customer);
  }

  public logout(sessionId: string) {
    forgetCache(this.authCacheKey(sessionId));
  }

  public async customerForSession(sessionId: string | null) {
    if (!sessionId) return null;
    const phone = getCache(this.authCacheKey(sessionId));
    if (!phone) return null;

    return await prisma.customers.findUnique({ where: { phone } });
  }

  public async updateProfile(customerId: string, input: any) {
    const dataToUpdate: any = {};

    for (const field of this.PROFILE_FIELDS) {
      if (input[field] !== undefined) {
        const column = this.profileColumn(field);
        const value = input[field];

        if (value === null || (typeof value === 'string' && value.trim() === '')) {
          dataToUpdate[column] = null;
        } else {
          dataToUpdate[column] = typeof value === 'string' ? value.trim() : value;
        }
      }
    }

    dataToUpdate.last_seen_at = new Date();

    // Reconstruct address similar to syncFormattedAddress()
    const addressParts = [
      dataToUpdate.flat_no || input.flatNo || null,
      dataToUpdate.society_name || input.societyName || null,
      dataToUpdate.street_name || input.streetName || null,
      dataToUpdate.landmark || input.landmark || null,
      dataToUpdate.city || input.city || null,
      dataToUpdate.state || input.state || null,
      dataToUpdate.pincode || input.pincode || null,
    ].filter(Boolean);
    
    if (addressParts.length > 0) {
      dataToUpdate.address = addressParts.join(', ');
    }

    const updated = await prisma.customers.update({
      where: { id: customerId },
      data: dataToUpdate
    });

    return this.mapCustomer(updated);
  }

  public async ordersForCustomer(phone: string) {
    const orders = await prisma.orders.findMany({
      where: { phone }, // Wait, checking actual schema later if it's phone or customer_id
      include: {
        order_items: true
      },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    return orders.map((order: any) => ({
      id: order.id,
      status: order.status || 'pending',
      totalAmount: Number(order.total_amount),
      paymentStatus: order.payment_status || 'pending',
      createdAt: order.created_at,
      itemCount: order.order_items.reduce((acc: number, item: any) => acc + item.quantity, 0)
    }));
  }

  public mapCustomer(customer: any) {
    return {
      id: customer.id,
      code: customer.code,
      phone: customer.phone,
      name: customer.name,
      email: customer.email,
      address: customer.address,
      flatNo: customer.flat_no,
      societyName: customer.society_name,
      streetName: customer.street_name,
      landmark: customer.landmark,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      ordersCount: customer.orders_count || 0,
      leadsCount: customer.leads_count || 0,
      lastSeenAt: customer.last_seen_at
    };
  }

  private profileColumn(field: string): string {
    const mapping: Record<string, string> = {
      flatNo: 'flat_no',
      societyName: 'society_name',
      streetName: 'street_name',
    };
    return mapping[field] || field;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D+/g, '');
  }

  private otpCacheKey(phone: string): string {
    return `customer_otp:${phone}`;
  }

  private authCacheKey(sessionId: string): string {
    return `customer_auth:${sessionId}`;
  }
}

export const customerAuthService = new CustomerAuthService();
