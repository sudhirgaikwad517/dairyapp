import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a Date as "YYYY-MM-DD" using local calendar fields, for use as the
 * value of a native <input type="date">. Date.toISOString() converts to UTC
 * first, which silently shifts the date back a day in timezones ahead of UTC
 * (e.g. IST) when the time is near local midnight.
 */
export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
