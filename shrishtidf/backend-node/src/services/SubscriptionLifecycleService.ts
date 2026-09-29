import prisma from '../db/prisma';
import { formatDateOnly } from './CutoffService';

/// The canonical frequency values every client (admin panel + app) offers.
/// 'weekly' is kept only for rows created before 'every_3_days'/'day_wise'
/// existed — addFrequencyDays still honors it, but nothing new should write it.
export const SUBSCRIPTION_FREQUENCIES = ['daily', 'alternate_days', 'every_3_days', 'day_wise'] as const;
export type SubscriptionFrequency = (typeof SUBSCRIPTION_FREQUENCIES)[number];

/// "1,3,5" -> [1, 3, 5] (ISO weekdays, 1=Mon..7=Sun). Invalid/out-of-range
/// entries are dropped rather than thrown, since this only ever feeds a
/// best-effort "what's the next matching day" calculation.
export function parseDayWiseDays(value: string | null | undefined): number[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map((v) => parseInt(v.trim(), 10))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
    )
  ).sort((a, b) => a - b);
}

export function serializeDayWiseDays(days: number[]): string {
  return Array.from(new Set(days))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
    .sort((a, b) => a - b)
    .join(',');
}

/// Advances `date` to the next occurrence per `frequency`. For 'day_wise' this
/// walks forward (at most a week) to the next date whose weekday is in
/// `dayWiseDays` — falling back to +1 day if that list is somehow empty, so a
/// bad data row never loops forever.
export function addFrequencyDays(date: Date, frequency: string, dayWiseDays?: number[] | null): Date {
  if (frequency === 'day_wise' && dayWiseDays && dayWiseDays.length > 0) {
    const set = new Set(dayWiseDays);
    let next = new Date(date);
    for (let i = 0; i < 7; i++) {
      next = new Date(next);
      next.setUTCDate(next.getUTCDate() + 1);
      const jsDay = next.getUTCDay(); // 0=Sun..6=Sat
      const iso = jsDay === 0 ? 7 : jsDay; // -> 1=Mon..7=Sun
      if (set.has(iso)) return next;
    }
    return next;
  }

  const days =
    frequency === 'weekly' ? 7 :
    frequency === 'every_3_days' ? 3 :
    frequency === 'alternate_days' || frequency === 'alternate' ? 2 : 1;
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/// How many deliveries a plan from `fromDate` to `toDate` (inclusive) actually
/// works out to. `fromDate` is always the first delivery — that mirrors how
/// `next_delivery_date` is seeded when a subscription is created — so a
/// prepaid quote charges for exactly the deliveries that will really happen.
export function countOccurrences(
  fromDate: Date,
  toDate: Date,
  frequency: string,
  dayWiseDays: number[] = []
): number {
  if (toDate.getTime() < fromDate.getTime()) return 0;

  let count = 1;
  let current = fromDate;
  for (let i = 0; i < 2000; i++) {
    const next = addFrequencyDays(current, frequency, dayWiseDays);
    if (next.getTime() > toDate.getTime()) break;
    count++;
    current = next;
  }
  return count;
}

type PendingFields = {
  id: string;
  change_effective_date: Date | null;
  pending_quantity: number | null;
  pending_variant_id: string | null;
  pending_frequency: string | null;
  pending_day_wise_days?: string | null;
  pending_delivery_slot_id: string | null;
  pending_delivery_mode_id: string | null;
};

type VacationFields = {
  id: string;
  customer_id: string;
  next_delivery_date: Date | null;
  frequency: string;
  day_wise_days?: string | null;
};

class SubscriptionLifecycleService {
  public async isOnVacation(customerId: string, dateStr: string): Promise<boolean> {
    const date = parseDateOnly(dateStr);
    const count = await prisma.vacations.count({
      where: { customer_id: customerId, from_date: { lte: date }, to_date: { gte: date } }
    });
    return count > 0;
  }

  /**
   * Applies a previously-requested Change Request once its effective date is reached.
   * Returns true if something was promoted (caller should re-fetch relations that may
   * have changed, e.g. variant/delivery mode).
   */
  public async promotePendingIfDue(sub: PendingFields, targetDateStr: string): Promise<boolean> {
    if (!sub.change_effective_date) return false;
    if (formatDateOnly(new Date(sub.change_effective_date)) > targetDateStr) return false;

    const data: any = {
      change_effective_date: null,
      pending_quantity: null,
      pending_variant_id: null,
      pending_frequency: null,
      pending_day_wise_days: null,
      pending_delivery_slot_id: null,
      pending_delivery_mode_id: null,
      updated_at: new Date()
    };
    if (sub.pending_quantity !== null && sub.pending_quantity !== undefined) data.quantity = sub.pending_quantity;
    if (sub.pending_variant_id) data.variant_id = sub.pending_variant_id;
    if (sub.pending_frequency) {
      data.frequency = sub.pending_frequency;
      // day_wise_days only makes sense alongside a 'day_wise' frequency —
      // clear it when switching away so a stale weekday list can't linger.
      data.day_wise_days = sub.pending_frequency === 'day_wise' ? (sub.pending_day_wise_days || null) : null;
    }
    if (sub.pending_delivery_slot_id !== null && sub.pending_delivery_slot_id !== undefined) data.delivery_slot_id = sub.pending_delivery_slot_id;
    if (sub.pending_delivery_mode_id !== null && sub.pending_delivery_mode_id !== undefined) data.delivery_mode_id = sub.pending_delivery_mode_id;

    await prisma.subscriptions.update({ where: { id: sub.id }, data });
    return true;
  }

  /**
   * A vacation suppresses delivery for its date range without touching the subscription's
   * own pause state, so once it ends deliveries must resume exactly where they left off —
   * this fast-forwards next_delivery_date past any vacation-covered occurrences (capped to
   * avoid a runaway loop on a data error) and persists the result.
   */
  public async skipVacationDays(sub: VacationFields, targetDateStr: string): Promise<Date | null> {
    if (!sub.next_delivery_date) return null;
    let current = new Date(sub.next_delivery_date);
    let guard = 0;
    while (guard < 400) {
      const dueStr = formatDateOnly(current);
      if (dueStr > targetDateStr) break;
      const onVacation = await this.isOnVacation(sub.customer_id, dueStr);
      if (!onVacation) break;
      current = addFrequencyDays(current, sub.frequency, parseDayWiseDays(sub.day_wise_days));
      guard++;
    }
    if (guard > 0) {
      await prisma.subscriptions.update({ where: { id: sub.id }, data: { next_delivery_date: current, updated_at: new Date() } });
    }
    return current;
  }
}

export const subscriptionLifecycleService = new SubscriptionLifecycleService();
