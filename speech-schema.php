<?php
require_once __DIR__ . '/common.php';

// Called only after administrator authentication, before any application transaction.
// This makes the ZIP update usable without a manual phpMyAdmin migration (base version 002+).
function ensure_speech_schema(PDO $db) {
    static $done = false;
    if ($done) return;
    try {
        if ((int)$db->query('SELECT speech_schema_version FROM app_settings WHERE id=1')->fetchColumn() >= 5) { $done = true; return; }
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
            'speech_template' => "VARCHAR(600) NOT NULL DEFAULT '{name} đã {offering} {amount_words}. {message_clause}'",
            'speech_provider' => "VARCHAR(16) NOT NULL DEFAULT 'browser'",
            'speech_voice' => "VARCHAR(32) NOT NULL DEFAULT 'banmai'",
            'speech_rate' => 'DECIMAL(3,2) NOT NULL DEFAULT 1.00',
            'speech_volume' => 'DECIMAL(3,2) NOT NULL DEFAULT 1.00',
            'display_seconds' => 'INT NOT NULL DEFAULT 8',
            'eleven_voice_id' => "VARCHAR(80) NOT NULL DEFAULT ''",
            'eleven_model' => "VARCHAR(40) NOT NULL DEFAULT 'eleven_flash_v2_5'",
            'custom_api_url' => "VARCHAR(255) NOT NULL DEFAULT 'https://api.vibi.pro/v1'",
            'custom_api_engine' => "VARCHAR(16) NOT NULL DEFAULT 'elevenlabs'",
            'custom_api_model' => "VARCHAR(100) NOT NULL DEFAULT 'eleven_flash_v2_5'",
            'custom_voice_id' => "VARCHAR(160) NOT NULL DEFAULT ''",
            'speech_schema_version' => 'SMALLINT NOT NULL DEFAULT 0',
        ];
        foreach ($definitions as $name => $definition) {
            if (!in_array($name, $columns, true)) $db->exec("ALTER TABLE app_settings ADD COLUMN $name $definition");
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
        $db->exec('UPDATE app_settings SET speech_schema_version=5 WHERE id=1');
        $done = true;
    } finally {
        $s = $db->prepare('SELECT RELEASE_LOCK(?)'); $s->execute([$lock]);
    }
}
