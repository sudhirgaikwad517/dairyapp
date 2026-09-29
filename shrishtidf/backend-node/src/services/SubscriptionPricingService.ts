import prisma from '../db/prisma';
import { cutoffService, formatDateOnly } from './CutoffService';
import {
  countOccurrences,
  parseDateOnly,
  parseDayWiseDays,
  SUBSCRIPTION_FREQUENCIES
} from './SubscriptionLifecycleService';

export type SubscriptionQuoteInput = {
  productId: string;
  variantId?: string | null;
  quantity?: number;
  frequency?: string;
  dayWiseDays?: number[] | string;
  startDate?: string;
  toDate?: string;
};

export type SubscriptionQuote = {
  customer: any;
  product: any;
  variant: any | null;
  isPrepaid: boolean;
  frequency: string;
  dayWiseDays: number[];
  quantity: number;
  effectiveStart: Date;
  expiresAt: Date | null;
  /// Deliveries in [effectiveStart, expiresAt] — 0 for postpaid (open-ended,
  /// nothing to pre-charge) or when no end date was given.
  occurrences: number;
  rate: number;
  /// What a prepaid customer must pay now. Always 0 for postpaid — they're
  /// billed per delivery instead, never upfront.
  totalCost: number;
};

export type SubscriptionQuoteFailure = {
  status: number;
  errorCode?: string;
  message: string;
  data?: any;
};

/// Every rule that decides what a subscription is allowed to be and what it
/// costs, in one place — so the endpoint that only quotes a price (for a
/// Razorpay order) and the endpoint that actually creates the subscription
/// can never disagree about the amount.
export async function computeSubscriptionQuote(
  customerId: string,
  input: SubscriptionQuoteInput
): Promise<{ ok: true; quote: SubscriptionQuote } | { ok: false; failure: SubscriptionQuoteFailure }> {
  const customer = await prisma.customers.findUnique({ where: { id: customerId } });
  if (!customer) {
    return { ok: false, failure: { status: 401, errorCode: 'UNAUTHORIZED', message: 'Not logged in' } };
  }

  if (!input.productId) {
    return { ok: false, failure: { status: 422, message: 'Product ID required' } };
  }

  const frequency = input.frequency || 'daily';
  if (!SUBSCRIPTION_FREQUENCIES.includes(frequency as any)) {
    return { ok: false, failure: { status: 422, message: 'Please choose a valid delivery schedule' } };
  }

  const dayWiseDays =
    frequency === 'day_wise'
      ? parseDayWiseDays(Array.isArray(input.dayWiseDays) ? input.dayWiseDays.join(',') : String(input.dayWiseDays || ''))
      : [];
  if (frequency === 'day_wise' && dayWiseDays.length === 0) {
    return { ok: false, failure: { status: 422, message: 'Choose at least one day for a Day wise plan' } };
  }

  const quantity = Number(input.quantity) > 0 ? Number(input.quantity) : 1;

  const [product, variant] = await Promise.all([
    prisma.products.findUnique({ where: { id: input.productId } }),
    input.variantId ? prisma.product_variants.findUnique({ where: { id: input.variantId } }) : Promise.resolve(null)
  ]);
  if (!product) {
    return { ok: false, failure: { status: 404, message: 'Product not found' } };
  }
  if (input.variantId && (!variant || variant.product_id !== input.productId)) {
    return { ok: false, failure: { status: 422, message: 'Selected packaging does not belong to this product' } };
  }

  const isPrepaid = customer.customer_type === 'prepaid';
  if (!product.allow_subscription || !(isPrepaid ? product.prepaid_subscribe : product.postpaid_subscribe)) {
    return { ok: false, failure: { status: 422, message: `${product.name} is not available for subscription right now.` } };
  }
  if (variant && variant.stock_quantity <= 0) {
    return { ok: false, failure: { status: 422, message: `${product.name} is currently out of stock.` } };
  }

  // A holiday/plan requested before the cut-off starts the very next day; at
  // or after the cut-off, tomorrow's route is already locked in, so the
  // earliest possible start is pushed one day further.
  const { earliestEffectiveDate } = await cutoffService.getEarliestEffectiveDate();
  const requestedStart = input.startDate ? parseDateOnly(input.startDate) : earliestEffectiveDate;
  const effectiveStart = requestedStart < earliestEffectiveDate ? earliestEffectiveDate : requestedStart;

  let expiresAt: Date | null = null;
  if (input.toDate) {
    expiresAt = parseDateOnly(input.toDate);
    if (expiresAt < effectiveStart) {
      return { ok: false, failure: { status: 422, message: 'End date must be on or after the start date' } };
    }
  }

  // Prepaid pays upfront for the whole plan, so we need a known number of
  // deliveries to charge for — postpaid is billed per delivery as it happens,
  // so an open-ended plan is fine there.
  if (isPrepaid && !expiresAt) {
    return {
      ok: false,
      failure: {
        status: 422,
        errorCode: 'END_DATE_REQUIRED',
        message: 'Please choose an end date so we can calculate the total for your plan.'
      }
    };
  }

  const occurrences = isPrepaid && expiresAt ? countOccurrences(effectiveStart, expiresAt, frequency, dayWiseDays) : 0;
  const rate = Number(variant ? variant.subscription : product.subscription);
  const totalCost = isPrepaid ? rate * quantity * occurrences : 0;

  return {
    ok: true,
    quote: {
      customer,
      product,
      variant,
      isPrepaid,
      frequency,
      dayWiseDays,
      quantity,
      effectiveStart,
      expiresAt,
      occurrences,
      rate,
      totalCost
    }
  };
}

export { formatDateOnly };
