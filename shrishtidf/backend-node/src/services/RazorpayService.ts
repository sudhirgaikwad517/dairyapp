import crypto from 'crypto';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

/**
 * Talks to the real Razorpay Orders API. Everything fails closed: if the keys
 * aren't configured we never pretend a payment succeeded.
 */
export class RazorpayService {
  private get keyId() {
    return (process.env.RAZORPAY_KEY_ID || '').trim();
  }

  private get keySecret() {
    return (process.env.RAZORPAY_KEY_SECRET || '').trim();
  }

  /** True only when both keys look like real Razorpay credentials. */
  public get isConfigured(): boolean {
    const id = this.keyId;
    const secret = this.keySecret;
    if (!id || !secret) return false;
    // Reject the placeholder values the repo ships with.
    if (!/^rzp_(test|live)_[A-Za-z0-9]{8,}$/.test(id)) return false;
    if (/^x+$/i.test(secret)) return false;
    return true;
  }

  public get publishableKeyId(): string | null {
    return this.isConfigured ? this.keyId : null;
  }

  private authHeader() {
    const token = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return `Basic ${token}`;
  }

  /** Creates a real order on Razorpay. [amountPaise] must be a positive integer. */
  public async createOrder(amountPaise: number, receipt: string, notes: Record<string, string> = {}): Promise<RazorpayOrder> {
    if (!this.isConfigured) throw new Error('RAZORPAY_NOT_CONFIGURED');

    const response = await fetch(`${RAZORPAY_API}/orders`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(amountPaise),
        currency: 'INR',
        receipt,
        notes,
        payment_capture: 1
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Razorpay createOrder failed:', response.status, body);
      throw new Error('RAZORPAY_ORDER_FAILED');
    }

    const order = (await response.json()) as RazorpayOrder;
    return order;
  }

  /** Fetches an order back from Razorpay — used to trust the amount, never the client. */
  public async fetchOrder(orderId: string): Promise<RazorpayOrder | null> {
    if (!this.isConfigured || !orderId) return null;

    const response = await fetch(`${RAZORPAY_API}/orders/${orderId}`, {
      headers: { Authorization: this.authHeader() }
    });

    if (!response.ok) return null;
    return (await response.json()) as RazorpayOrder;
  }

  /** Confirms Razorpay actually signed this payment. Fails closed. */
  public verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.isConfigured) return false;
    if (!orderId || !paymentId || !signature) return false;

    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Constant-time compare to avoid leaking the signature byte by byte.
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /** A payment is only "captured/paid" if Razorpay says so. */
  public async isPaymentCaptured(paymentId: string): Promise<boolean> {
    if (!this.isConfigured || !paymentId) return false;

    const response = await fetch(`${RAZORPAY_API}/payments/${paymentId}`, {
      headers: { Authorization: this.authHeader() }
    });
    if (!response.ok) return false;

    const payment = (await response.json()) as { status?: string };
    return payment.status === 'captured' || payment.status === 'authorized';
  }
}

export const razorpayService = new RazorpayService();
