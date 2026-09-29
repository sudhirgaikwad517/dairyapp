-- "Day wise" subscription frequency (deliver only on specific weekdays, e.g.
-- Mon/Wed/Fri) alongside the existing daily / alternate_days / every_3_days.
-- Stored as comma-separated ISO weekday numbers, 1=Mon..7=Sun (e.g. "1,3,5").
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS day_wise_days VARCHAR(20);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pending_day_wise_days VARCHAR(20);
