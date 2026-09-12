import prisma from '../db/prisma';

const CUTOFF_SETTING_KEY = 'cutoff_time';
const DEFAULT_CUTOFF = '22:00'; // 10 PM, 24-hour "HH:mm"

/**
 * Formats a Date as "YYYY-MM-DD" using local calendar fields. Date.toISOString()
 * converts to UTC first, which silently shifts the date backward by a day for
 * any timezone ahead of UTC (e.g. IST) when the time is near local midnight —
 * exactly the kind of off-by-one that this cutoff logic must never produce.
 */
export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

class CutoffService {
  public async getCutoffTime(): Promise<string> {
    const row = await prisma.site_settings.findUnique({ where: { key: CUTOFF_SETTING_KEY } });
    return (row?.value as any) || DEFAULT_CUTOFF;
  }

  public async setCutoffTime(time: string): Promise<void> {
    await prisma.site_settings.upsert({
      where: { key: CUTOFF_SETTING_KEY },
      update: { value: time, updated_at: new Date() },
      create: { key: CUTOFF_SETTING_KEY, value: time, created_at: new Date(), updated_at: new Date() }
    });
  }

  /**
   * A change (quantity update, holiday/pause) requested before the cutoff takes
   * effect the very next calendar day. Requested at/after the cutoff, tomorrow's
   * delivery is already locked in, so it takes effect the day after that instead.
   */
  public computeEarliestEffectiveDate(cutoffTime: string, now: Date = new Date()): Date {
    const [hours, minutes] = cutoffTime.split(':').map((n) => parseInt(n, 10));
    const cutoffToday = new Date(now);
    cutoffToday.setHours(hours, minutes || 0, 0, 0);

    const daysToAdd = now < cutoffToday ? 1 : 2;

    // Work out the target calendar date using LOCAL fields, then re-express it as
    // a UTC-midnight instant of that same date. @db.Date columns need this: a
    // Date built with local setDate()/setHours() still carries a local offset,
    // and Prisma/pg extract the calendar date from it in UTC terms — which
    // silently shifts it back a day for any timezone ahead of UTC (e.g. IST).
    const local = new Date(now);
    local.setDate(local.getDate() + daysToAdd);
    return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  }

  public async getEarliestEffectiveDate(now: Date = new Date()): Promise<{ cutoffTime: string; earliestEffectiveDate: Date }> {
    const cutoffTime = await this.getCutoffTime();
    return { cutoffTime, earliestEffectiveDate: this.computeEarliestEffectiveDate(cutoffTime, now) };
  }
}

export const cutoffService = new CutoffService();
