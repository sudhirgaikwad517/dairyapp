/**
 * On a phone, logging in and "My account" open the customer app at /app/: the same Flutter app as on
 * the Play Store, built for the browser, so it looks and works the same as the installed app.
 */
export const CUSTOMER_APP_URL = "/app/";

export function isPhone(): boolean {
  return typeof navigator !== "undefined" && /Android|iPhone|iPod|Mobi/i.test(navigator.userAgent);
}
