import prisma from '../db/prisma';
import crypto from 'crypto';
import { activityLogService } from './ActivityLogService';
import { customerCodeService } from './CustomerCodeService';
import bcrypt from 'bcryptjs';

// OTPs and sessions are stored in the database (customer_otps /
// customer_sessions) rather than process memory, so a restart or deploy
// doesn't invalidate a pending login or sign every customer out.

export class CustomerAuthService {
  private readonly OTP_TTL_SECONDS = 300;
  private readonly AUTH_TTL_SECONDS = 60 * 60 * 24 * 30;
  
  private readonly PROFILE_FIELDS = [
    'name', 'email', 'flatNo', 'societyName', 'streetName',
    'landmark', 'city', 'state', 'pincode', 'gstNumber', 'deliveryMode', 'password'
  ];

  public async sendOtp(phone: string) {
    phone = this.normalizePhone(phone);
    if (phone.length < 10) {
      throw new Error('INVALID_PHONE');
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.OTP_TTL_SECONDS * 1000);

    await prisma.customer_otps.upsert({
      where: { phone },
      update: { otp, expires_at: expiresAt, created_at: now },
      create: { id: crypto.randomUUID(), phone, otp, expires_at: expiresAt, created_at: now }
    });

    const payload: any = {
      phone,
      expiresIn: this.OTP_TTL_SECONDS
    };

    // Only ever handed back outside production — returning the real OTP in
    // the API response is a full auth bypass if this ever reaches prod.
    if (process.env.NODE_ENV !== 'production') {
      payload.debugOtp = otp;
    }

    return payload;
  }

  public async verifyOtp(phone: string, otp: string, sessionId: string) {
    phone = this.normalizePhone(phone);
    const pending = await prisma.customer_otps.findUnique({ where: { phone } });

    const isValid =
      pending != null &&
      pending.expires_at.getTime() > Date.now() &&
      pending.otp === otp.trim();

    if (!isValid) {
      throw new Error('INVALID_OTP');
    }

    // One-time use.
    await prisma.customer_otps.deleteMany({ where: { phone } });

    let customer: any = await prisma.customers.findUnique({
      where: { phone },
      include: { hubs: true, delivery_boys: true }
    });
    let isNewUser = false;
    if (!customer) {
      isNewUser = true;
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

    await this.storeSession(sessionId, customer.id);
    customer = await this.ensureReferralCode(customer);

    // A customer created just now, or one who never completed their profile (no name yet),
    // should be treated as "new" so the app can prompt for their name before letting them in.
    return { customer: this.mapCustomer(customer), isNewUser: isNewUser || !customer.name };
  }

  /// Sessions live in the database, not process memory, so a backend restart
  /// or deploy doesn't sign every customer out.
  private async storeSession(sessionId: string, customerId: string) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.AUTH_TTL_SECONDS * 1000);

    await prisma.customer_sessions.upsert({
      where: { session_id: sessionId },
      update: { customer_id: customerId, expires_at: expiresAt, last_seen_at: now },
      create: {
        id: crypto.randomUUID(),
        session_id: sessionId,
        customer_id: customerId,
        expires_at: expiresAt,
        last_seen_at: now,
        created_at: now
      }
    });
  }

  public async logout(sessionId: string) {
    await prisma.customer_sessions.deleteMany({ where: { session_id: sessionId } });
  }

  public async customerForSession(sessionId: string | null) {
    if (!sessionId) return null;

    const session = await prisma.customer_sessions.findUnique({
      where: { session_id: sessionId },
      include: { customers: { include: { hubs: true, delivery_boys: true } } }
    });

    if (!session) return null;

    if (session.expires_at.getTime() <= Date.now()) {
      await prisma.customer_sessions.deleteMany({ where: { session_id: sessionId } });
      return null;
    }

    // Slide the expiry so active users stay logged in; best-effort only.
    const now = new Date();
    prisma.customer_sessions
      .update({
        where: { session_id: sessionId },
        data: { last_seen_at: now, expires_at: new Date(now.getTime() + this.AUTH_TTL_SECONDS * 1000) }
      })
      .catch(() => {});

    return this.ensureReferralCode(session.customers);
  }

  /// Older accounts (and any created before this field existed) don't have a
  /// referral code yet. Generate one lazily on first read rather than a
  /// one-off backfill script, so it's guaranteed to exist by the time the
  /// profile screen asks for it.
  private async ensureReferralCode<T extends { id: string; referral_code: string | null; name: string | null }>(
    customer: T
  ): Promise<T> {
    if (customer.referral_code) return customer;

    const base = (customer.name || 'CUST').replace(/[^a-zA-Z]/g, '').toUpperCase().padEnd(4, 'X').slice(0, 4);
    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = Math.floor(10000 + Math.random() * 90000);
      const code = `${base}${suffix}`.slice(0, 12);
      try {
        const updated = await prisma.customers.update({
          where: { id: customer.id },
          data: { referral_code: code }
        });
        return { ...customer, referral_code: updated.referral_code };
      } catch (error: any) {
        if (error.code !== 'P2002') throw error; // unique clash on referral_code — retry with a new suffix
      }
    }
    return customer;
  }

  public async updateProfile(customerId: string, input: any) {
    const dataToUpdate: any = {};

    for (const field of this.PROFILE_FIELDS) {
      if (input[field] !== undefined) {
        const column = this.profileColumn(field);
        const value = input[field];

        if (value === null || (typeof value === 'string' && value.trim() === '')) {
          dataToUpdate[column] = null;
        } else if (field === 'password') {
          // Hash password if it's being updated
          dataToUpdate[column] = await bcrypt.hash(value, 10);
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

    // Include hub/delivery-boy so the response never wipes those fields to
    // null in the app's local state (the mobile app replaces its whole
    // `customer` object with whatever this call returns).
    const updated = await prisma.customers.update({
      where: { id: customerId },
      data: dataToUpdate,
      include: { hubs: true, delivery_boys: true }
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

    return orders.map((order: any) => {
      const walletAmountUsed = Number(order.wallet_amount_used || 0);
      const payableAmount = Number(order.total_amount);

      return {
        id: order.id,
        invoiceNumber: order.invoice_number,
        status: order.status || 'pending',
        subtotal: Number(order.subtotal || 0),
        deliveryFee: Number(order.delivery_fee || 0),
        walletAmountUsed,
        // What the order was actually worth, before anything was taken from the
        // wallet — otherwise a fully wallet-paid order looks like it cost 0.
        orderValue: payableAmount + walletAmountUsed,
        totalAmount: payableAmount,
        paymentMethod: order.payment_method || 'cod',
        paymentStatus: order.payment_status || 'pending',
        createdAt: order.created_at,
        itemCount: order.order_items.reduce((acc: number, item: any) => acc + item.quantity, 0)
      };
    });
  }

  public async loginWithPassword(phoneOrEmail: string, password: string, sessionId: string) {
    const isPhone = /^\d+$/.test(phoneOrEmail);
    const normalizedIdentifier = isPhone ? this.normalizePhone(phoneOrEmail) : phoneOrEmail.trim().toLowerCase();

    let customer = await prisma.customers.findFirst({
      where: isPhone 
        ? { phone: normalizedIdentifier } 
        : { email: { equals: normalizedIdentifier, mode: 'insensitive' } },
      include: { hubs: true, delivery_boys: true }
    });

    if (!customer) {
      throw new Error('INVALID_CREDENTIALS');
    }

    if (!customer.password) {
      throw new Error('PASSWORD_NOT_SET');
    }

    const isValidPassword = await bcrypt.compare(password, customer.password);
    if (!isValidPassword) {
      throw new Error('INVALID_CREDENTIALS');
    }

    await prisma.customers.update({
      where: { id: customer.id },
      data: { last_seen_at: new Date() }
    });

    await this.storeSession(sessionId, customer.id);
    customer = await this.ensureReferralCode(customer);

    return { customer: this.mapCustomer(customer), isNewUser: !customer.name };
  }

  public async signUpWithPassword(name: string, phone: string, password: string, sessionId: string) {
    phone = this.normalizePhone(phone);
    if (phone.length < 10) {
      throw new Error('INVALID_PHONE');
    }

    const existing = await prisma.customers.findUnique({ where: { phone } });
    if (existing) {
      if (existing.password) {
        throw new Error('ALREADY_REGISTERED');
      } else {
        // Update existing OTP user with password and name
        const hashedPassword = await bcrypt.hash(password, 10);
        let updated = await prisma.customers.update({
          where: { id: existing.id },
          data: { name: name.trim(), password: hashedPassword, last_seen_at: new Date() },
          include: { hubs: true, delivery_boys: true }
        });
        
        await this.storeSession(sessionId, updated.id);
        updated = await this.ensureReferralCode(updated);
        
        return { customer: this.mapCustomer(updated), isNewUser: false };
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = await customerCodeService.next();
    
    let customer: any = await prisma.customers.create({
      data: {
        id: crypto.randomUUID(),
        code,
        name: name.trim(),
        phone,
        password: hashedPassword,
        orders_count: 0,
        leads_count: 0,
        registered_by: 'customer',
        last_seen_at: new Date()
      }
    });

    await activityLogService.log({
      type: 'customer_registered',
      title: 'New Customer Registered',
      message: `A new customer registered with phone ${phone} and password.`,
      customerId: customer.id
    });

    await this.storeSession(sessionId, customer.id);
    customer = await this.ensureReferralCode(customer);

    return { customer: this.mapCustomer(customer), isNewUser: true };
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
      area: customer.area,
      gstNumber: customer.gst_number,
      deliveryMode: customer.delivery_mode,
      referralCode: customer.referral_code,
      customerType: customer.customer_type || 'prepaid',
      hubName: customer.hubs?.name || null,
      deliveryBoyName: customer.delivery_boys?.name || null,
      // The phone itself was OTP-verified to sign in, so the account is
      // "verified" by definition — nothing further for the customer to do.
      isVerified: true,
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
      gstNumber: 'gst_number',
      deliveryMode: 'delivery_mode',
    };
    return mapping[field] || field;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D+/g, '');
  }

}

export const customerAuthService = new CustomerAuthService();
