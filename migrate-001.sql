
ALTER TABLE donations ENGINE=InnoDB;
ALTER TABLE donations
  ADD COLUMN claim_token CHAR(64) NULL,
  ADD COLUMN claimed_until DATETIME NULL;

CREATE TABLE payment_transactions (
  tx_id VARCHAR(64) PRIMARY KEY,
  paid_amount BIGINT NOT NULL,
  content TEXT NOT NULL,
  donation_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARACTER SET utf8mb4;


INSERT INTO payment_transactions(tx_id,paid_amount,content,donation_id)
SELECT tx_id,COALESCE(paid_amount,0),'',id FROM donations WHERE tx_id IS NOT NULL;
