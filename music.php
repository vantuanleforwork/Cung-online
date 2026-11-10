<?php
// Shared helpers loaded by common.php.

function ensure_music_schema(PDO $db): void {
    $columns = array_column($db->query('SHOW COLUMNS FROM donations')->fetchAll(PDO::FETCH_ASSOC), 'Field');
    foreach (['donation_kind' => "VARCHAR(16) NOT NULL DEFAULT 'message'", 'youtube_id' => 'VARCHAR(11) NULL', 'music_min_amount' => 'INT NULL', 'required_amount' => 'INT NOT NULL DEFAULT 0'] as $name => $definition) {
        if (!in_array($name, $columns, true)) $db->exec("ALTER TABLE donations ADD COLUMN $name $definition");
    }
    $db->exec("CREATE TABLE IF NOT EXISTS donation_settings (
        id TINYINT PRIMARY KEY, message_min INT NOT NULL DEFAULT 10000,
        tier2_min INT NOT NULL DEFAULT 50000, tier3_min INT NOT NULL DEFAULT 200000,
        music_min INT NOT NULL DEFAULT 50000, music_seconds INT NOT NULL DEFAULT 180,
        music_order VARCHAR(16) NOT NULL DEFAULT 'time', music_volume INT NOT NULL DEFAULT 50,
        music_opacity INT NOT NULL DEFAULT 90, music_x INT NOT NULL DEFAULT 48,
        music_y INT NOT NULL DEFAULT 740, music_width INT NOT NULL DEFAULT 360,
        music_height INT NOT NULL DEFAULT 160, music_enabled TINYINT NOT NULL DEFAULT 1
    ) ENGINE=InnoDB CHARACTER SET utf8mb4");
    $settingsColumns = array_column($db->query('SHOW COLUMNS FROM donation_settings')->fetchAll(PDO::FETCH_ASSOC), 'Field');
    foreach (['music_idle_enabled' => 'TINYINT NOT NULL DEFAULT 0', 'music_idle_message' => "VARCHAR(300) NOT NULL DEFAULT 'Bạn muốn nghe bài gì? Donate phát nhạc để order ngay!'"] as $name => $definition) {
        if (!in_array($name, $settingsColumns, true)) $db->exec("ALTER TABLE donation_settings ADD COLUMN $name $definition");
    }
    $db->exec('INSERT IGNORE INTO donation_settings(id) VALUES(1)');
    $db->exec("CREATE TABLE IF NOT EXISTS music_requests (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, donation_id INT NULL UNIQUE,
        video_id VARCHAR(11) NOT NULL, state VARCHAR(16) NOT NULL DEFAULT 'waiting',
        position_seconds DECIMAL(10,2) NOT NULL DEFAULT 0, title VARCHAR(200) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX music_waiting(state,id), FOREIGN KEY(donation_id) REFERENCES donations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB CHARACTER SET utf8mb4");
    $musicColumns = array_column($db->query('SHOW COLUMNS FROM music_requests')->fetchAll(PDO::FETCH_ASSOC), null, 'Field');
    if ($musicColumns['donation_id']['Null'] !== 'YES') $db->exec('ALTER TABLE music_requests MODIFY donation_id INT NULL');
    if (!isset($musicColumns['title_retry_at'])) $db->exec('ALTER TABLE music_requests ADD COLUMN title_retry_at DATETIME NULL');
    // Existing orders require review too: do not silently approve old waiting tracks.
    if (!isset($musicColumns['approved'])) $db->exec('ALTER TABLE music_requests ADD COLUMN approved TINYINT NOT NULL DEFAULT 0');
    $db->exec("CREATE TABLE IF NOT EXISTS music_state (
        id TINYINT PRIMARY KEY, current_id BIGINT UNSIGNED NULL, paused TINYINT NOT NULL DEFAULT 0,
        owner VARCHAR(64) NOT NULL DEFAULT '', lease_until DATETIME NULL
    ) ENGINE=InnoDB CHARACTER SET utf8mb4");
    $db->exec('INSERT IGNORE INTO music_state(id) VALUES(1)');
}

function donation_settings(?PDO $db = null): array {
    try {
        $settings = ($db ?? db())->query('SELECT * FROM donation_settings WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        if (!$settings) throw new RuntimeException('Missing donation settings.');
        return $settings + ['music_idle_enabled'=>0, 'music_idle_message'=>'Bạn muốn nghe bài gì? Donate phát nhạc để order ngay!'];
    } catch (PDOException $error) {
        // Keep legacy bank notifications working while the administrator installs the migration.
        if ((int)($error->errorInfo[1] ?? 0) !== 1146) throw $error;
        return ['message_min'=>MIN_AMOUNT,'tier2_min'=>50000,'tier3_min'=>200000,
            'music_min'=>50000,'music_seconds'=>180,'music_order'=>'time','music_volume'=>50,
            'music_opacity'=>90,'music_x'=>48,'music_y'=>740,'music_width'=>360,'music_height'=>160,'music_enabled'=>1,'music_idle_enabled'=>0,'music_idle_message'=>'Bạn muốn nghe bài gì? Donate phát nhạc để order ngay!'];
    }
}

function youtube_video_id(string $link): string {
    $parts = parse_url(trim($link));
    if (!$parts || ($parts['scheme'] ?? '') !== 'https' || !in_array($parts['host'] ?? '', ['www.youtube.com', 'youtu.be'], true)
        || isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])) {
        throw new InvalidArgumentException('Chỉ nhận link YouTube bắt đầu bằng https://www.youtube.com/ hoặc https://youtu.be/.');
    }
    $path = $parts['path'] ?? '';
    if ($parts['host'] === 'youtu.be') $id = substr($path, 1);
    elseif ($path === '/watch') { parse_str($parts['query'] ?? '', $query); $id = $query['v'] ?? ''; }
    elseif (preg_match('~^/(?:shorts|live|embed)/([A-Za-z0-9_-]{11})/?$~D', $path, $match)) $id = $match[1];
    else $id = '';
    if (!is_string($id) || !preg_match('/^[A-Za-z0-9_-]{11}$/D', $id)) throw new InvalidArgumentException('Link YouTube phải trỏ đến một video cụ thể.');
    return $id;
}

function donation_tier(int $amount): int {
    static $thresholds;
    if ($thresholds === null) {
        try { $thresholds = donation_settings(); }
        catch (Throwable $error) { $thresholds = ['tier2_min'=>50000, 'tier3_min'=>200000]; }
    }
    return $amount >= (int)$thresholds['tier3_min'] ? 3 : ($amount >= (int)$thresholds['tier2_min'] ? 2 : 1);
}
function donation_message_limit(int $amount): int { return donation_tier($amount) === 1 ? 100 : 225; }

function enqueue_paid_music(PDO $db, array $donation, int $paid): void {
    if (($donation['donation_kind'] ?? '') !== 'music' || !empty($donation['is_test']) || !$donation['youtube_id'] || $paid < (int)$donation['music_min_amount']) return;
    $db->prepare('INSERT IGNORE INTO music_requests(donation_id,video_id) VALUES(?,?)')->execute([$donation['id'], $donation['youtube_id']]);
}

// Manual requests have no donation row. Paid requests must still pass moderation.
function music_visible_sql(): string {
    return "(q.donation_id IS NULL OR (d.status='paid' AND d.queue_state='queued'))";
}
function music_playable_sql(): string {
    return 'q.approved=1 AND ' . music_visible_sql();
}
function music_song_columns(): string {
    return "q.*,COALESCE(d.name,'Quản trị viên') AS name,COALESCE(d.message,'') AS message,
        COALESCE(d.paid_amount,0) AS paid_amount,CASE WHEN " . music_playable_sql() . " THEN 'queued' ELSE 'skipped' END AS queue_state";
}
function music_order_sql(array $settings): string {
    return $settings['music_order'] === 'amount' ? 'COALESCE(d.paid_amount,0) DESC, q.id ASC' : 'q.id ASC';
}
function music_queue(PDO $db, array $settings): array {
    return $db->query("SELECT q.id,q.donation_id,q.video_id,q.title,q.state,q.approved,
        COALESCE(d.name,'Quản trị viên') AS name,COALESCE(d.message,'') AS message,COALESCE(d.paid_amount,0) AS paid_amount
        FROM music_requests q LEFT JOIN donations d ON d.id=q.donation_id
        WHERE q.state IN ('waiting','playing') AND " . music_visible_sql() . "
        ORDER BY (q.state='playing') DESC," . music_order_sql($settings) . ' LIMIT 100')->fetchAll(PDO::FETCH_ASSOC);
}
function youtube_song_title(string $videoId): string {
    if (!function_exists('curl_init')) return '';
    $url = 'https://www.youtube.com/oembed?format=json&url=' . rawurlencode('https://www.youtube.com/watch?v=' . $videoId);
    $http = curl_init($url);
    $body = '';
    curl_setopt_array($http, [CURLOPT_CONNECTTIMEOUT=>2, CURLOPT_TIMEOUT=>4, CURLOPT_FOLLOWLOCATION=>false,
        CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS, CURLOPT_WRITEFUNCTION=>static function ($handle, $chunk) use (&$body) {
            if (strlen($body) + strlen($chunk) > 65536) return 0;
            $body .= $chunk;
            return strlen($chunk);
        }]);
    $ok = curl_exec($http);
    $status = curl_getinfo($http, CURLINFO_HTTP_CODE);
    curl_close($http);
    $data = $ok && $status === 200 ? json_decode($body, true) : null;
    return is_string($data['title'] ?? null) ? clean($data['title'], 200) : '';
}
function music_untitled_id(PDO $db): int {
    return (int)$db->query("SELECT q.id FROM music_requests q LEFT JOIN donations d ON d.id=q.donation_id
        WHERE q.state IN ('waiting','playing') AND q.title='' AND (q.title_retry_at IS NULL OR q.title_retry_at<=NOW())
        AND " . music_visible_sql() . " ORDER BY (q.state='playing') DESC,q.id LIMIT 1")->fetchColumn();
}
function refresh_music_title(PDO $db, int $id, bool $fromHistory = false): ?string {
    $eligible = $fromHistory ? "d.status='paid' AND d.is_test=0" : music_visible_sql();
    $query = $db->prepare("SELECT q.video_id,q.title FROM music_requests q LEFT JOIN donations d ON d.id=q.donation_id
        WHERE q.id=? AND " . $eligible);
    $query->execute([$id]);
    $song = $query->fetch(PDO::FETCH_ASSOC);
    if (!$song) return null;
    if ($song['title'] !== '') return $song['title'];
    // Claim a retry before making the external request, outside queue/payment transactions.
    $claim = $db->prepare("UPDATE music_requests SET title_retry_at=DATE_ADD(NOW(),INTERVAL 60 SECOND)
        WHERE id=? AND title='' AND (title_retry_at IS NULL OR title_retry_at<=NOW())");
    $claim->execute([$id]);
    if (!$claim->rowCount()) return '';
    $title = youtube_song_title($song['video_id']);
    if ($title !== '') $db->prepare("UPDATE music_requests SET title=? WHERE id=? AND title=''")->execute([$title,$id]);
    return $title;
}

function music_admin_action(PDO $db, array $in): void {
    $action = $in['action'];
    if ($action === 'save_donation_settings') {
        $limits = ['message_min'=>[1000,50000000], 'tier2_min'=>[1000,50000000], 'tier3_min'=>[1000,50000000],
            'music_min'=>[1000,50000000], 'music_seconds'=>[10,3600], 'music_volume'=>[0,100], 'music_opacity'=>[0,100],
            'music_x'=>[0,1680], 'music_y'=>[0,940], 'music_width'=>[240,960], 'music_height'=>[140,700]];
        $values = [];
        foreach ($limits as $key => [$min,$max]) {
            $value = filter_var($in[$key] ?? null, FILTER_VALIDATE_INT);
            if ($value === false || $value < $min || $value > $max) throw new InvalidArgumentException('Kiểm tra giá trị cài đặt donate: ' . $key);
            $values[$key] = $value;
        }
        if ($values['tier2_min'] <= $values['message_min'] || $values['tier3_min'] <= $values['tier2_min']) throw new InvalidArgumentException('Mốc rồng phải lớn hơn mức tối thiểu, mốc tiên nữ phải lớn hơn mốc rồng.');
        if ($values['music_x'] + $values['music_width'] > 1920 || $values['music_y'] + $values['music_height'] > 1080) throw new InvalidArgumentException('Trình phát nhạc phải nằm trong khung OBS.');
        if (!in_array($in['music_order'] ?? '', ['time','amount'], true)) throw new InvalidArgumentException('Thứ tự nhạc không hợp lệ.');
        $values['music_order'] = $in['music_order'];
        $values['music_enabled'] = isset($in['music_enabled']) ? 1 : 0;
        $values['music_idle_enabled'] = isset($in['music_idle_enabled']) ? 1 : 0;
        $idleMessage = $in['music_idle_message'] ?? donation_settings($db)['music_idle_message'];
        if (!is_string($idleMessage) || !mb_check_encoding($idleMessage, 'UTF-8') || mb_strlen($idleMessage, 'UTF-8') > 300) {
            throw new InvalidArgumentException('Nội dung khung nhạc chờ tối đa 300 ký tự.');
        }
        $values['music_idle_message'] = trim($idleMessage);

        $assignments = implode(',', array_map(static fn($key) => "$key=?", array_keys($values)));
        $db->beginTransaction();
        try {
            $db->prepare("UPDATE donation_settings SET $assignments WHERE id=1")->execute(array_values($values));
            $db->prepare('INSERT INTO admin_audit(action,detail,ip) VALUES(?,?,?)')->execute([
                $action, json_encode(['settings'=>$values], JSON_UNESCAPED_UNICODE), $_SERVER['REMOTE_ADDR'] ?? ''
            ]);
            $db->commit();
        } catch (Throwable $error) { if ($db->inTransaction()) $db->rollBack(); throw $error; }
        return;
    }
    if ($action === 'music_add') {
        if (!is_string($in['music_url'] ?? null) || strlen($in['music_url']) > 2048) throw new InvalidArgumentException('Nhập link bài nhạc YouTube.');
        $videoId = youtube_video_id($in['music_url']);
        $db->beginTransaction();
        try {
            $db->prepare('INSERT INTO music_requests(donation_id,video_id) VALUES(NULL,?)')->execute([$videoId]);
            $id = (int)$db->lastInsertId();
            $db->prepare('INSERT INTO admin_audit(action,detail,ip) VALUES(?,?,?)')->execute([
                $action,json_encode(['music_request_id'=>$id,'video_id'=>$videoId]),$_SERVER['REMOTE_ADDR'] ?? ''
            ]);
            $db->commit();
        } catch (Throwable $error) { if ($db->inTransaction()) $db->rollBack(); throw $error; }
        return;
    }
    $db->beginTransaction();
    try {
        $state = $db->query('SELECT * FROM music_state WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
        if ($action === 'music_approve') {
            $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id || $id < 1) throw new InvalidArgumentException('Bài nhạc không hợp lệ.');
            $approve = $db->prepare("UPDATE music_requests q LEFT JOIN donations d ON d.id=q.donation_id
                SET q.approved=1 WHERE q.id=? AND q.state='waiting' AND q.approved=0
                AND (q.donation_id IS NULL OR (d.status='paid' AND d.queue_state='queued'))");
            $approve->execute([$id]);
            if (!$approve->rowCount()) throw new InvalidArgumentException('Bài nhạc không còn chờ duyệt.');
        } elseif ($action === 'music_pause' || $action === 'music_resume') {
            $db->prepare('UPDATE music_state SET paused=? WHERE id=1')->execute([$action === 'music_pause' ? 1 : 0]);
        } elseif ($action === 'music_next' || $action === 'music_remove') {
            $id = $action === 'music_next' ? (int)$state['current_id'] : filter_var($in['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id && $action === 'music_remove') throw new InvalidArgumentException('Bài nhạc không hợp lệ.');
            if ($id) $db->prepare("UPDATE music_requests SET state='removed' WHERE id=? AND state IN ('waiting','playing')")->execute([$id]);
            if ($id === (int)$state['current_id']) $db->exec('UPDATE music_state SET current_id=NULL WHERE id=1');
        } else throw new InvalidArgumentException('Thao tác nhạc không hợp lệ.');
        $db->prepare('INSERT INTO admin_audit(action,detail,ip) VALUES(?,?,?)')->execute([
            $action, json_encode(['music_request_id'=>$id ?? null], JSON_UNESCAPED_UNICODE), $_SERVER['REMOTE_ADDR'] ?? ''
        ]);
        $db->commit();
    } catch (Throwable $error) { if ($db->inTransaction()) $db->rollBack(); throw $error; }
}

function music_heartbeat(PDO $db, array $in): array {
    $owner = $in['owner'] ?? '';
    if (!is_string($owner) || !preg_match('/^[a-f0-9]{32}$/D', $owner)) throw new InvalidArgumentException('Phiên phát nhạc không hợp lệ.');
    $db->beginTransaction();
    try {
        $state = $db->query('SELECT *,lease_until>NOW() AS leased FROM music_state WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
        $settings = donation_settings($db);
        if ($state['leased'] && $state['owner'] !== $owner) { $db->commit(); return ['owner'=>false]; }
        $db->prepare('UPDATE music_state SET owner=?,lease_until=DATE_ADD(NOW(),INTERVAL 12 SECOND) WHERE id=1')->execute([$owner]);
        $current = null;
        if ($state['current_id']) {
            $query = $db->prepare("SELECT " . music_song_columns() . " FROM music_requests q LEFT JOIN donations d ON d.id=q.donation_id WHERE q.id=? FOR UPDATE");
            $query->execute([$state['current_id']]);
            $current = $query->fetch(PDO::FETCH_ASSOC) ?: null;
        }
        if ($current && (int)($in['id'] ?? 0) === (int)$current['id'] && $state['owner'] === $owner) {
            $position = filter_var($in['position'] ?? 0, FILTER_VALIDATE_FLOAT);
            if ($position !== false && $position >= 0 && $position <= 86400) {
                $current['position_seconds'] = max((float)$current['position_seconds'], $position);
                $db->prepare('UPDATE music_requests SET position_seconds=? WHERE id=?')->execute([$current['position_seconds'], $current['id']]);
            }
            if (is_string($in['title'] ?? null) && $in['title'] !== '') {
                $current['title'] = clean($in['title'], 200);
                $db->prepare('UPDATE music_requests SET title=? WHERE id=?')->execute([$current['title'], $current['id']]);
            }
            if (in_array($in['event'] ?? '', ['ended','error'], true) || (float)$current['position_seconds'] >= (int)$settings['music_seconds']) {
                $db->prepare('UPDATE music_requests SET state=? WHERE id=?')->execute([($in['event'] ?? '') === 'error' ? 'failed' : 'done', $current['id']]);
                $current = null;
            }
        }
        if ($current && ($current['state'] !== 'playing' || $current['queue_state'] !== 'queued')) {
            $db->prepare("UPDATE music_requests SET state='removed' WHERE id=?")->execute([$current['id']]);
            $current = null;
        }
        if (!$current && !$state['paused'] && $settings['music_enabled']) {
            $query = $db->query("SELECT " . music_song_columns() . " FROM music_requests q LEFT JOIN donations d ON d.id=q.donation_id
                WHERE q.state='waiting' AND " . music_playable_sql() . " ORDER BY " . music_order_sql($settings) . ' LIMIT 1 FOR UPDATE');
            $current = $query->fetch(PDO::FETCH_ASSOC) ?: null;
            if ($current) {
                $db->prepare("UPDATE music_requests SET state='playing' WHERE id=?")->execute([$current['id']]);
                $current['state'] = 'playing';
            }
        }
        $db->prepare('UPDATE music_state SET current_id=? WHERE id=1')->execute([$current ? $current['id'] : null]);
        $nextQuery = $db->query("SELECT q.id,q.video_id,q.title,COALESCE(d.name,'Quản trị viên') AS name FROM music_requests q LEFT JOIN donations d ON d.id=q.donation_id
            WHERE q.state='waiting' AND " . music_playable_sql() . " ORDER BY " . music_order_sql($settings) . ' LIMIT 1');
        $next = $nextQuery->fetch(PDO::FETCH_ASSOC) ?: null;
        $db->commit();
        return ['untitled_id'=>music_untitled_id($db),'next'=>$next,'owner'=>true, 'paused'=>(bool)$state['paused'] || !$settings['music_enabled'], 'item'=>$current, 'settings'=>$settings];
    } catch (Throwable $error) { if ($db->inTransaction()) $db->rollBack(); throw $error; }
}
