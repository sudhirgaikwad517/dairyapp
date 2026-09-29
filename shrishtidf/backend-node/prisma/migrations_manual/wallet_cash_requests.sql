-- "Request Cash" wallet top-up: customer asks for cash to be collected by
-- staff instead of paying online. Stays pending (and counts as reserved
-- balance) until an admin approves (credits the wallet) or rejects it.
CREATE TABLE IF NOT EXISTS wallet_cash_requests (
  id             UUID PRIMARY KEY,
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount         INTEGER NOT NULL,
  requested_date DATE NOT NULL,
  email          VARCHAR(255),
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes          TEXT,
  reviewed_by    VARCHAR(255),
  reviewed_at    TIMESTAMP(0),
  created_at     TIMESTAMP(0),
  updated_at     TIMESTAMP(0)
);

CREATE INDEX IF NOT EXISTS wallet_cash_requests_customer_id_created_at_index
  ON wallet_cash_requests (customer_id, created_at);
CREATE INDEX IF NOT EXISTS wallet_cash_requests_status_index
  ON wallet_cash_requests (status);
