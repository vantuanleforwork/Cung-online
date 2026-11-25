ALTER TABLE donations
  ADD COLUMN payment_method VARCHAR(16) NOT NULL DEFAULT 'bank' AFTER expected_amount,
  ADD COLUMN provider_payment_id VARCHAR(64) NULL AFTER tx_id,
  ADD INDEX donations_provider_payment (provider_payment_id);
