<?php
require_once __DIR__ . '/common.php';

// Called only after administrator authentication, before any application transaction.
// This makes the ZIP update usable without a manual phpMyAdmin migration (base version 002+).
function ensure_speech_schema(PDO $db) {
    static $done = false;
    if ($done) return;
    try {
        $donationCols = array_column($db->query('SHOW COLUMNS FROM donations')->fetchAll(PDO::FETCH_ASSOC), 'Field');
        if (!in_array('selected_voice_id', $donationCols, true)) {
            $db->exec('ALTER TABLE donations ADD COLUMN selected_voice_id VARCHAR(160) NULL DEFAULT NULL');
        }
        if (!in_array('voice_name', $donationCols, true)) {
            $db->exec('ALTER TABLE donations ADD COLUMN voice_name VARCHAR(80) NULL DEFAULT NULL');
        }
        if ((int)$db->query('SELECT speech_schema_version FROM app_settings WHERE id=1')->fetchColumn() >= 12) { $done = true; return; }
    } catch (PDOException $e) {
        if ((int)($e->errorInfo[1] ?? 0) !== 1054) throw $e;
    }
    $lock = 'cung_speech_' . substr(hash('sha256', (string)$db->query('SELECT DATABASE()')->fetchColumn()), 0, 32);
    $s = $db->prepare('SELECT GET_LOCK(?,10)'); $s->execute([$lock]);
    if ((int)$s->fetchColumn() !== 1) throw new RuntimeException('Speech database upgrade is busy; retry.');
    try {
        $columns = array_column($db->query('SHOW COLUMNS FROM app_settings')->fetchAll(PDO::FETCH_ASSOC), 'Field');
        $definitions = [
            'speech_enabled' => 'TINYINT NOT NULL DEFAULT 1',
            'speech_template' => "VARCHAR(600) NOT NULL DEFAULT '{user} đã donate {amount_words}. {message_clause}'",
            'speech_provider' => "VARCHAR(16) NOT NULL DEFAULT 'browser'",
            'speech_voice' => "VARCHAR(32) NOT NULL DEFAULT 'banmai'",
            'speech_rate' => 'DECIMAL(3,2) NOT NULL DEFAULT 1.00',
            'speech_volume' => 'DECIMAL(3,2) NOT NULL DEFAULT 1.00',
            'display_seconds' => 'INT NOT NULL DEFAULT 8',
            'overlay_x' => 'INT NOT NULL DEFAULT 960',
            'overlay_y' => 'INT NOT NULL DEFAULT 64',
            'overlay_width' => 'INT NOT NULL DEFAULT 760',
            'overlay_font_size' => 'INT NOT NULL DEFAULT 22',
            'eleven_voice_id' => "VARCHAR(80) NOT NULL DEFAULT ''",
            'eleven_model' => "VARCHAR(40) NOT NULL DEFAULT 'eleven_flash_v2_5'",
            'custom_api_url' => "VARCHAR(255) NOT NULL DEFAULT 'https://api.vibi.pro/v1'",
            'custom_api_engine' => "VARCHAR(16) NOT NULL DEFAULT 'elevenlabs'",
            'custom_api_model' => "VARCHAR(100) NOT NULL DEFAULT 'eleven_flash_v2_5'",
            'custom_voice_id' => "VARCHAR(160) NOT NULL DEFAULT ''",
            'tier1_voice_id' => "VARCHAR(160) NOT NULL DEFAULT ''",
            'tier2_voice_id' => "VARCHAR(160) NOT NULL DEFAULT ''",
            'tier3_voice_id' => "VARCHAR(160) NOT NULL DEFAULT ''",
            'speech_schema_version' => 'SMALLINT NOT NULL DEFAULT 0',
        ];
        foreach ($definitions as $name => $definition) {
            if (!in_array($name, $columns, true)) $db->exec("ALTER TABLE app_settings ADD COLUMN $name $definition");
        }
        $db->exec("CREATE TABLE IF NOT EXISTS custom_voice_options (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(80) NOT NULL,
            voice_id VARCHAR(160) NOT NULL,
            tier_min TINYINT NOT NULL DEFAULT 2,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB CHARACTER SET utf8mb4");
        $donationCols = array_column($db->query('SHOW COLUMNS FROM donations')->fetchAll(PDO::FETCH_ASSOC), 'Field');
        if (!in_array('selected_voice_id', $donationCols, true)) {
            $db->exec('ALTER TABLE donations ADD COLUMN selected_voice_id VARCHAR(160) NULL DEFAULT NULL');
        }
        if (!in_array('voice_name', $donationCols, true)) {
            $db->exec('ALTER TABLE donations ADD COLUMN voice_name VARCHAR(80) NULL DEFAULT NULL');
        }
        $db->exec("CREATE TABLE IF NOT EXISTS tts_audio_cache (
            cache_key CHAR(64) PRIMARY KEY,state VARCHAR(16) NOT NULL,audio_url TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            audio_content MEDIUMBLOB NULL
        ) ENGINE=InnoDB CHARACTER SET utf8mb4");
        $columns = array_column($db->query('SHOW COLUMNS FROM tts_audio_cache')->fetchAll(PDO::FETCH_ASSOC), 'Field');
        if (!in_array('audio_content', $columns, true)) $db->exec('ALTER TABLE tts_audio_cache ADD COLUMN audio_content MEDIUMBLOB NULL');
        if (!in_array('task_id', $columns, true)) $db->exec('ALTER TABLE tts_audio_cache ADD COLUMN task_id VARCHAR(160) NULL');
        if (!in_array('next_poll_at', $columns, true)) $db->exec('ALTER TABLE tts_audio_cache ADD COLUMN next_poll_at DATETIME NULL');
        $db->exec("CREATE TABLE IF NOT EXISTS tts_credentials (
            provider VARCHAR(16) PRIMARY KEY,api_key TEXT NOT NULL
        ) ENGINE=InnoDB CHARACTER SET utf8mb4");
        $db->exec("UPDATE app_settings SET speech_template='{user} đã donate {amount_words}. {message_clause}' WHERE id=1 AND speech_template LIKE '%{offering}%'");
        // Điền giá trị mặc định cho tier1, tier2, tier3 nếu còn trống
        $db->exec("UPDATE app_settings SET tier1_voice_id=COALESCE(NULLIF(tier1_voice_id,''),NULLIF(custom_voice_id,''),eleven_voice_id,'') WHERE id=1");
        $db->exec("UPDATE app_settings SET tier2_voice_id=COALESCE(NULLIF(tier2_voice_id,''),tier1_voice_id) WHERE id=1");
        $db->exec("UPDATE app_settings SET tier3_voice_id=COALESCE(NULLIF(tier3_voice_id,''),tier2_voice_id) WHERE id=1");
        if (!in_array('is_test', $donationCols, true)) {
            $db->exec('ALTER TABLE donations ADD COLUMN is_test TINYINT NOT NULL DEFAULT 0');
        }
        $db->exec("UPDATE donations d LEFT JOIN payment_transactions p ON p.tx_id=d.tx_id
            SET d.is_test=1 WHERE LEFT(d.tx_id,5)='TEST_' OR p.gateway='TEST_OBS'");
        ensure_music_schema($db);
        $db->exec('UPDATE donation_settings SET music_height=160 WHERE music_height=292');
        $db->exec('UPDATE app_settings SET speech_schema_version=12 WHERE id=1');
        $done = true;
    } finally {
        $s = $db->prepare('SELECT RELEASE_LOCK(?)'); $s->execute([$lock]);
    }
}
