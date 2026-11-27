<?php
// Run database upgrades from the deployment process, never from a web request.
if (PHP_SAPI !== 'cli') { fwrite(STDERR, "CLI only.\n"); exit(1); }
$config = $argv[1] ?? (__DIR__ . '/../config.php');
if (!is_file($config)) { fwrite(STDERR, "Config file not found: {$config}\n"); exit(1); }
require $config;
$db = db();
$lockName = 'cung_deploy_migration_' . substr(hash('sha256', (string)$db->query('SELECT DATABASE()')->fetchColumn()), 0, 32);
$lock = $db->prepare('SELECT GET_LOCK(?,30)'); $lock->execute([$lockName]);
if ((int)$lock->fetchColumn() !== 1) throw new RuntimeException('Could not acquire migration lock.');
try {
    $schema = file_get_contents(__DIR__ . '/../schema.sql');
    foreach (preg_split('/;\s*(?:\r?\n|$)/', $schema) as $statement) {
        $statement = trim($statement);
        if ($statement === '' || str_starts_with($statement, '--')) continue;
        if (preg_match('/^(CREATE TABLE)(?! IF NOT EXISTS)/i', $statement)) $statement = preg_replace('/^CREATE TABLE/i', 'CREATE TABLE IF NOT EXISTS', $statement, 1);
        if (preg_match('/^(CREATE TABLE IF NOT EXISTS|INSERT IGNORE)/i', $statement)) $db->exec($statement);
    }
    $columns = [
        'donor_users'=>['is_test_account'=>'TINYINT NOT NULL DEFAULT 0','level_override'=>'SMALLINT UNSIGNED NULL DEFAULT NULL'],
        'donations'=>['user_id'=>'BIGINT UNSIGNED NULL','device_hash'=>'CHAR(64) NULL','donor_avatar'=>'VARCHAR(2048) NULL','donation_kind'=>"VARCHAR(16) NOT NULL DEFAULT 'message'",'youtube_id'=>'VARCHAR(11) NULL','music_min_amount'=>'INT NULL','required_amount'=>'INT NOT NULL DEFAULT 0','payment_method'=>"VARCHAR(16) NOT NULL DEFAULT 'bank'",'provider_payment_id'=>'VARCHAR(64) NULL','selected_voice_id'=>'VARCHAR(160) NULL DEFAULT NULL','voice_name'=>'VARCHAR(80) NULL DEFAULT NULL','is_test'=>'TINYINT NOT NULL DEFAULT 0'],
        'app_settings'=>['speech_schema_version'=>'SMALLINT NOT NULL DEFAULT 0'],
        'donation_settings'=>['music_require_approval'=>'TINYINT NOT NULL DEFAULT 1','music_idle_enabled'=>'TINYINT NOT NULL DEFAULT 0','music_idle_message'=>"VARCHAR(300) NOT NULL DEFAULT 'Bạn muốn nghe bài gì? Donate phát nhạc để order ngay!'",'pk_enabled'=>'TINYINT NOT NULL DEFAULT 0','pk_min'=>'INT NOT NULL DEFAULT 50000','pk_duration'=>'INT NOT NULL DEFAULT 300'],
        'pk_options'=>[],
        'pk_battles'=>[],
        'music_requests'=>['title_retry_at'=>'DATETIME NULL','approved'=>'TINYINT NOT NULL DEFAULT 0'],
        'tts_audio_cache'=>['audio_content'=>'MEDIUMBLOB NULL','task_id'=>'VARCHAR(160) NULL','next_poll_at'=>'DATETIME NULL'],
    ];
    foreach ($columns as $table=>$definitions) {
        if (!in_array($table, ['pk_options','pk_battles'], true) && !$db->query("SHOW TABLES LIKE " . $db->quote($table))->fetchColumn()) continue;
        if (in_array($table, ['pk_options','pk_battles'], true)) {
            $db->exec($table === 'pk_options' ? "CREATE TABLE IF NOT EXISTS pk_options (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(80) NOT NULL,image_path VARCHAR(255) NOT NULL DEFAULT '',active TINYINT NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,INDEX pk_options_active(active,sort_order,id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" : "CREATE TABLE IF NOT EXISTS pk_battles (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,started_at DATETIME NOT NULL,ends_at DATETIME NOT NULL,status ENUM('active','finished') NOT NULL DEFAULT 'active',INDEX pk_battles_state(status,ends_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }
        $existing = array_column($db->query('SHOW COLUMNS FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC), 'Field');
        foreach ($definitions as $name=>$definition) if (!in_array($name,$existing,true)) $db->exec("ALTER TABLE `{$table}` ADD COLUMN `{$name}` {$definition}");
    }
    $donationColumns = array_column($db->query('SHOW COLUMNS FROM donations')->fetchAll(PDO::FETCH_ASSOC), 'Field');
    foreach (['pk_option_id'=>'BIGINT UNSIGNED NULL','pk_battle_id'=>'BIGINT UNSIGNED NULL'] as $name=>$definition) {
        if (!in_array($name, $donationColumns, true)) $db->exec("ALTER TABLE donations ADD COLUMN {$name} {$definition}");
    }
    $indexes = array_column($db->query('SHOW INDEX FROM donations')->fetchAll(PDO::FETCH_ASSOC), 'Key_name');
    if (!in_array('donations_pk_lookup', $indexes, true)) $db->exec('ALTER TABLE donations ADD INDEX donations_pk_lookup (donation_kind, pk_battle_id, pk_option_id)');
    $db->exec('INSERT IGNORE INTO donation_settings(id) VALUES(1)');
    $db->exec('INSERT IGNORE INTO music_state(id) VALUES(1)');
    $db->exec('INSERT IGNORE INTO app_settings(id) VALUES(1)');
    $db->exec("UPDATE app_settings SET speech_schema_version=15 WHERE id=1 AND speech_schema_version=0");
    fwrite(STDOUT, "Database migration completed.\n");
} finally { $db->prepare('SELECT RELEASE_LOCK(?)')->execute([$lockName]); }

