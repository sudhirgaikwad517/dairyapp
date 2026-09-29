-- "My Profile" screen (app) needs a GST/VAT number field on the customer.
-- referral_code already existed on customers but nothing ever generated one;
-- ProfileController/CustomerAuthService now backfills it lazily on read, so
-- no data migration is needed for existing rows here.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gst_number VARCHAR(30);
