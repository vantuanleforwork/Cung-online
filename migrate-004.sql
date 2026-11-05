-- Sao lưu database trước khi chạy đúng một lần.
CREATE TABLE donor_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  google_sub VARBINARY(255) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL,
  email_hash CHAR(64) NOT NULL,
  display_name VARCHAR(40) NOT NULL,
  google_avatar_url VARCHAR(2048) NOT NULL DEFAULT '',
  custom_avatar_path VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX donor_email (email(191))
) ENGINE=InnoDB CHARACTER SET utf8mb4;

CREATE TABLE blocked_donors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  block_type ENUM('email','ip','device') NOT NULL,
  identifier_hash CHAR(64) NOT NULL,
  identifier_hint VARCHAR(100) NOT NULL DEFAULT '',
  reason VARCHAR(255) NOT NULL DEFAULT '',
  created_by VARCHAR(45) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY blocked_identity (block_type,identifier_hash),
  INDEX (created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4;

ALTER TABLE donations
  ADD COLUMN user_id BIGINT UNSIGNED NULL,
  ADD COLUMN device_hash CHAR(64) NULL,
  ADD COLUMN donor_avatar VARCHAR(2048) NULL,
  ADD INDEX donor_pending_rate (user_id,status,created_at),
  ADD INDEX device_pending_rate (device_hash,status,created_at),
  ADD CONSTRAINT donations_donor_user FOREIGN KEY (user_id) REFERENCES donor_users(id);
