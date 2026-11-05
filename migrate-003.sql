-- Database đã chạy 002: sao lưu, tạm dừng overlay và chạy tệp này MỘT LẦN.
ALTER TABLE app_settings
  ADD COLUMN speech_enabled TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN speech_template VARCHAR(600) NOT NULL DEFAULT '{name} đã {offering} {amount_words}. {message_clause}',
  ADD COLUMN speech_provider VARCHAR(16) NOT NULL DEFAULT 'browser',
  ADD COLUMN speech_voice VARCHAR(32) NOT NULL DEFAULT 'banmai',
  ADD COLUMN speech_rate DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN speech_volume DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN display_seconds INT NOT NULL DEFAULT 8;

CREATE TABLE tts_audio_cache (
  cache_key CHAR(64) PRIMARY KEY,
  state VARCHAR(16) NOT NULL,
  audio_url TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARACTER SET utf8mb4;
