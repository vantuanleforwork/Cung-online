-- Chạy MỘT LẦN sau migrate-001.sql. Sao lưu và dừng webhook/overlay trước khi chạy.
ALTER TABLE donations
  MODIFY paid_amount BIGINT NULL,
  ADD COLUMN status_token CHAR(64) NULL UNIQUE,
  ADD COLUMN queue_state ENUM('queued','held','skipped') NOT NULL DEFAULT 'queued',
  ADD INDEX queue_lookup (status, queue_state, shown, id),
  ADD INDEX create_rate (ip, created_at);

-- Các lượt chưa phát cần được duyệt trước khi lên live.
UPDATE donations SET queue_state='held',claim_token=NULL,claimed_until=NULL
WHERE status='paid' AND shown=0;

ALTER TABLE payment_transactions
  ADD COLUMN account_number VARCHAR(64) NULL,
  ADD COLUMN gateway VARCHAR(64) NULL,
  ADD COLUMN direction VARCHAR(3) NULL,
  ADD COLUMN decision VARCHAR(24) NOT NULL DEFAULT 'unmatched',
  ADD INDEX (decision, created_at);
UPDATE payment_transactions SET decision=IF(donation_id IS NULL,'legacy_review','matched');

CREATE TABLE webhook_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  response_code SMALLINT NOT NULL,
  outcome VARCHAR(24) NOT NULL,
  transaction_count INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  detail VARCHAR(255) NOT NULL DEFAULT '',
  payload MEDIUMTEXT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4;

CREATE TABLE app_settings (
  id TINYINT PRIMARY KEY,
  paused TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB CHARACTER SET utf8mb4;
INSERT INTO app_settings(id,paused) VALUES(1,0);

CREATE TABLE admin_audit (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR(32) NOT NULL,
  detail TEXT NOT NULL,
  ip VARCHAR(45) NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4;

CREATE TABLE admin_login_attempts (
  ip_hash CHAR(64) PRIMARY KEY,
  attempts INT NOT NULL DEFAULT 0,
  window_start DATETIME NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4;
