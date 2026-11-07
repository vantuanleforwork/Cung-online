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

CREATE TABLE donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(12) NULL UNIQUE,            -- mã tham chiếu ghi trong nội dung chuyển khoản
  name VARCHAR(40) NOT NULL DEFAULT '',
  message VARCHAR(255) NOT NULL DEFAULT '',
  expected_amount INT NOT NULL DEFAULT 0,
  paid_amount BIGINT NULL,
  status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  tx_id VARCHAR(64) NULL UNIQUE,           -- id giao dịch Pay2S, chống xử lý trùng
  is_test TINYINT NOT NULL DEFAULT 0,
  donation_kind VARCHAR(16) NOT NULL DEFAULT 'message',
  youtube_id VARCHAR(11) NULL,
  music_min_amount INT NULL,
  required_amount INT NOT NULL DEFAULT 0,
  shown TINYINT NOT NULL DEFAULT 0,        -- overlay đã phát chưa
  claim_token CHAR(64) NULL,
  claimed_until DATETIME NULL,
  status_token CHAR(64) NULL UNIQUE,
  queue_state ENUM('queued','held','skipped') NOT NULL DEFAULT 'queued',
  ip VARCHAR(45) NULL,
  user_id BIGINT UNSIGNED NULL,
  device_hash CHAR(64) NULL,
  donor_avatar VARCHAR(2048) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (status, shown),
  INDEX queue_lookup (status, queue_state, shown, id),
  INDEX create_rate (ip, created_at),
  INDEX donor_pending_rate (user_id,status,created_at),
  INDEX device_pending_rate (device_hash,status,created_at),
  CONSTRAINT donations_donor_user FOREIGN KEY (user_id) REFERENCES donor_users(id)
) ENGINE=InnoDB CHARACTER SET utf8mb4;

CREATE TABLE payment_transactions (
  tx_id VARCHAR(64) PRIMARY KEY,
  paid_amount BIGINT NOT NULL,
  content TEXT NOT NULL,
  donation_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  account_number VARCHAR(64) NULL,
  gateway VARCHAR(64) NULL,
  direction VARCHAR(3) NULL,
  decision VARCHAR(24) NOT NULL DEFAULT 'unmatched',
  INDEX (decision, created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4;

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
  paused TINYINT NOT NULL DEFAULT 0,
  speech_enabled TINYINT NOT NULL DEFAULT 1,
  speech_template VARCHAR(600) NOT NULL DEFAULT '{name} đã {offering} {amount_words}. {message_clause}',
  speech_provider VARCHAR(16) NOT NULL DEFAULT 'browser',
  speech_voice VARCHAR(32) NOT NULL DEFAULT 'banmai',
  speech_rate DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  speech_volume DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  display_seconds INT NOT NULL DEFAULT 8,
  overlay_x INT NOT NULL DEFAULT 960,
  overlay_y INT NOT NULL DEFAULT 64,
  overlay_width INT NOT NULL DEFAULT 760,
  overlay_font_size INT NOT NULL DEFAULT 22,
  eleven_voice_id VARCHAR(80) NOT NULL DEFAULT '',
  eleven_model VARCHAR(40) NOT NULL DEFAULT 'eleven_flash_v2_5',
  custom_api_url VARCHAR(255) NOT NULL DEFAULT 'https://api.vibi.pro/v1',
  custom_api_engine VARCHAR(16) NOT NULL DEFAULT 'elevenlabs',
  custom_api_model VARCHAR(100) NOT NULL DEFAULT 'eleven_flash_v2_5',
  custom_voice_id VARCHAR(160) NOT NULL DEFAULT '',
  speech_schema_version SMALLINT NOT NULL DEFAULT 5
) ENGINE=InnoDB CHARACTER SET utf8mb4;
INSERT INTO app_settings(id,paused) VALUES(1,0);

CREATE TABLE tts_audio_cache (
  cache_key CHAR(64) PRIMARY KEY,
  state VARCHAR(16) NOT NULL,
  audio_url TEXT NULL,
  audio_content MEDIUMBLOB NULL,
  task_id VARCHAR(160) NULL,
  next_poll_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARACTER SET utf8mb4;

CREATE TABLE tts_credentials (
  provider VARCHAR(16) PRIMARY KEY,
  api_key TEXT NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4;

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

CREATE TABLE IF NOT EXISTS donation_settings (
        id TINYINT PRIMARY KEY, message_min INT NOT NULL DEFAULT 10000,
        tier2_min INT NOT NULL DEFAULT 50000, tier3_min INT NOT NULL DEFAULT 200000,
        music_min INT NOT NULL DEFAULT 50000, music_seconds INT NOT NULL DEFAULT 180,
        music_order VARCHAR(16) NOT NULL DEFAULT 'time', music_volume INT NOT NULL DEFAULT 50,
        music_opacity INT NOT NULL DEFAULT 90, music_x INT NOT NULL DEFAULT 48,
        music_y INT NOT NULL DEFAULT 740, music_width INT NOT NULL DEFAULT 360,
        music_height INT NOT NULL DEFAULT 160, music_enabled TINYINT NOT NULL DEFAULT 1
    ) ENGINE=InnoDB CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS music_requests (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, donation_id INT NOT NULL UNIQUE,
        video_id VARCHAR(11) NOT NULL, state VARCHAR(16) NOT NULL DEFAULT 'waiting',
        position_seconds DECIMAL(10,2) NOT NULL DEFAULT 0, title VARCHAR(200) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX music_waiting(state,id), FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS music_state (
        id TINYINT PRIMARY KEY, current_id BIGINT UNSIGNED NULL, paused TINYINT NOT NULL DEFAULT 0,
        owner VARCHAR(64) NOT NULL DEFAULT '', lease_until DATETIME NULL
    ) ENGINE=InnoDB CHARACTER SET utf8mb4;

INSERT IGNORE INTO donation_settings(id) VALUES(1);
INSERT IGNORE INTO music_state(id) VALUES(1);
