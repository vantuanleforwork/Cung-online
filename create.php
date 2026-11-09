<?php
require __DIR__ . '/common.php';
require_once __DIR__ . '/speech-schema.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function fail(int $code, string $msg) {
    // Luôn trả về 400 hoặc 200 để tránh các hosting LiteSpeed / Apache / cPanel chặn và thay thế bằng trang HTML lỗi
    http_response_code($code >= 400 && $code < 500 ? 400 : 500);
    exit(json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE));
}

function send_payment_code(string $code, string $statusToken, int $amount): void {
    $qr = 'https://img.vietqr.io/image/' . BANK_ID . '-' . ACCOUNT_NO . '-compact2.png'
        . '?amount=' . $amount . '&addInfo=' . $code . '&accountName=' . rawurlencode(ACCOUNT_NAME);
    respond(200, ['code'=>$code, 'qr'=>$qr, 'status_token'=>$statusToken, 'test_paid'=>false]);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Chỉ hỗ trợ POST.');
    donor_session();
    if (empty($_SESSION['donor_id'])) fail(401, 'Vui lòng đăng nhập Google trước khi tạo mã donate.');
    if (!is_string($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null) || !hash_equals($_SESSION['donor_csrf'] ?? '', $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        fail(403, 'Phiên làm việc đã hết hạn. Vui lòng tải lại trang (F5).');
    }
    
    $in = input_json(8192);
    if (!is_string($in['message'] ?? '') ||
        (!is_int($in['amount'] ?? null) && !is_string($in['amount'] ?? null)) ||
        filter_var($in['amount'], FILTER_VALIDATE_INT) === false) {
        fail(400, 'Dữ liệu số tiền không hợp lệ.');
    }
    
    $amount = (int)$in['amount'];
    if ($amount < 1000 || $amount > 50000000) {
        fail(400, 'Số tiền tối thiểu là ' . number_format(MIN_AMOUNT, 0, ',', '.') . 'đ');
    }

    $db = db();
    $context = donor_context();
    $ip = $context['ip'];
    $deviceHash = $context['device_hash'];

    ensure_donor_privilege_schema($db);
    $userStmt = $db->prepare('SELECT id,email,email_hash,display_name,google_avatar_url,custom_avatar_path,is_test_account,level_override FROM donor_users WHERE id=?');
    $userStmt->execute([$_SESSION['donor_id']]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) fail(401, 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại Google.');

    $emailHash = donor_hash(mb_strtolower(trim($user['email'])));
    if (!hash_equals($emailHash, $user['email_hash']) || donor_blocked($db, $emailHash, $ip, $deviceHash)) {
        fail(403, 'Tài khoản hoặc địa chỉ mạng này đang bị tạm khóa tạo lượt donate.');
    }

    ensure_speech_schema($db);
    $donateSettings = donation_settings($db);
    $kind = $in['kind'] ?? 'message';
    if (!is_string($kind) || !in_array($kind, ['message','music','roulette'], true)) fail(400, 'Loại donate không hợp lệ.');
    $minimum = (int)$donateSettings[$kind === 'music' ? 'music_min' : 'message_min'];
    $spin = null;
    $isTestAccount = !empty($user['is_test_account']);
    if ($kind === 'roulette') {
        $wheelId = filter_var($in['wheel_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$wheelId) fail(400, 'Hãy chọn một vòng quay.');
        ensure_roulette_schema($db);
        $wheelQuery = $db->prepare('SELECT * FROM roulette_wheels WHERE id=?' . ($isTestAccount ? '' : ' AND active=1'));
        $wheelQuery->execute([$wheelId]);
        $wheel = $wheelQuery->fetch(PDO::FETCH_ASSOC);
        if (!$wheel) fail(400, 'Vòng quay này đã đóng. Hãy tải lại trang.');
        $minimum = (int)$wheel['minimum'];
        $spin = roulette_snapshot($wheel);
        $spin['wheel_id'] = (int)$wheelId;
    }
    if ($amount < $minimum) fail(400, 'Số tiền tối thiểu là ' . number_format($minimum,0,',','.') . 'đ.');
    $youtubeId = null;
    if ($kind === 'music') {
        if (!$donateSettings['music_enabled'] && !$isTestAccount) fail(400, 'Donate phát nhạc đang tạm đóng.');
        if (!is_string($in['music_url'] ?? null)) fail(400, 'Chỉ nhận link YouTube.');
        try { $youtubeId = youtube_video_id($in['music_url']); }
        catch (InvalidArgumentException $error) { fail(400, $error->getMessage()); }
    }


    $name = clean($user['display_name'], 40) ?: 'Người gửi donate';
    $avatar = $user['custom_avatar_path'] ?: $user['google_avatar_url'];
    $msg  = clean($in['message'] ?? '', donation_message_limit($amount));

    $selectedVoiceId = null;
    $voiceName = null;
    $requestedVoice = trim((string)($in['voice_id'] ?? ''));
    if ($requestedVoice !== '' && donation_tier($amount) >= 2) {
        try {
            $currentTier = donation_tier($amount);
            $s = $db->prepare('SELECT name, voice_id FROM custom_voice_options WHERE voice_id=? AND tier_min <= ? LIMIT 1');
            $s->execute([$requestedVoice, $currentTier]);
            $vRow = $s->fetch(PDO::FETCH_ASSOC);
            if ($vRow) {
                $selectedVoiceId = $vRow['voice_id'];
                $voiceName = $vRow['name'];
            }
        } catch (Throwable $e) {}
    }

    $donationCols = [];
    try {
        $donationCols = array_column($db->query('SHOW COLUMNS FROM donations')->fetchAll(PDO::FETCH_ASSOC), 'Field');
    } catch (Throwable $e) {}
    $hasVoiceCols = in_array('selected_voice_id', $donationCols, true) && in_array('voice_name', $donationCols, true);

    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $statusToken = $isTestAccount ? null : bin2hex(random_bytes(32));
    for ($t = 0; $t < 5; $t++) {
        $code = null;
        if (!$isTestAccount) {
            $code = PREFIX;
            for ($i = 0; $i < 6; $i++) $code .= $chars[random_int(0, 31)];
        }
        try {
            $db->beginTransaction();
            if (!$isTestAccount) {
                // Serialize requests for the same verified account, including requests from different sessions.
                $lock = $db->prepare('SELECT id FROM donor_users WHERE id=? FOR UPDATE');
                $lock->execute([$user['id']]);
                $lock->fetchColumn();
                $voiceColumn = $hasVoiceCols ? 'selected_voice_id' : 'NULL AS selected_voice_id';
                $pending = $db->prepare("SELECT id,code,status_token,expected_amount,required_amount,message,donation_kind,youtube_id,$voiceColumn
                    FROM donations WHERE user_id=? AND status='pending' AND created_at > NOW() - INTERVAL 10 MINUTE
                    ORDER BY id DESC FOR UPDATE");
                $pending->execute([$user['id']]);
                $orders = $pending->fetchAll(PDO::FETCH_ASSOC);
                foreach ($orders as $order) {
                    if (!$order['code'] || !$order['status_token'] || (int)$order['expected_amount'] !== $amount
                        || (int)$order['required_amount'] !== $minimum || $order['message'] !== $msg
                        || $order['donation_kind'] !== $kind || $order['youtube_id'] !== $youtubeId
                        || $order['selected_voice_id'] !== $selectedVoiceId) continue;
                    if ($spin !== null && (roulette_spin($db, (int)$order['id'])['wheel_id'] ?? null) !== $spin['wheel_id']) continue;
                    $db->commit();
                    send_payment_code($order['code'], $order['status_token'], $amount);
                }
                $network = $db->prepare("SELECT COUNT(*) FROM donations WHERE ip=? AND status='pending' AND created_at > NOW() - INTERVAL 5 MINUTE");
                $network->execute([$ip]);
                if (count($orders) >= 3 || $network->fetchColumn() >= 30) {
                    $db->rollBack();
                    fail(429, 'Bạn đã tạo nhiều mã đang chờ. Hãy dùng mã hiện có hoặc thử lại sau vài phút.');
                }
            }
            if ($hasVoiceCols) {
                $db->prepare('INSERT INTO donations(code,name,message,expected_amount,ip,status_token,user_id,device_hash,donor_avatar,selected_voice_id,voice_name) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
                   ->execute([$code, $name, $msg, $amount, $ip, $statusToken, $user['id'], $deviceHash, $avatar, $selectedVoiceId, $voiceName]);
            } else {
                $db->prepare('INSERT INTO donations(code,name,message,expected_amount,ip,status_token,user_id,device_hash,donor_avatar) VALUES(?,?,?,?,?,?,?,?,?)')
                   ->execute([$code, $name, $msg, $amount, $ip, $statusToken, $user['id'], $deviceHash, $avatar]);
            }
            $donationId = (int)$db->lastInsertId();
            $db->prepare('UPDATE donations SET donation_kind=?,youtube_id=?,music_min_amount=?,required_amount=? WHERE id=?')->execute([$kind,$youtubeId,$kind === 'music' ? $minimum : null,$minimum,$donationId]);
            if ($spin !== null) {
                $db->prepare('INSERT INTO roulette_spins(donation_id,snapshot) VALUES(?,?)')
                   ->execute([$donationId,json_encode($spin, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
            }
            if ($isTestAccount) {
                $testTx = 'TEST_ACCOUNT_' . $donationId . '_' . strtoupper(bin2hex(random_bytes(4)));
                $db->prepare("UPDATE donations SET paid_amount=expected_amount,status='paid',tx_id=?,is_test=1,queue_state='queued' WHERE id=?")
                   ->execute([$testTx,$donationId]);
                if ($kind === 'music' && $youtubeId) {
                    $db->prepare('INSERT IGNORE INTO music_requests(donation_id,video_id) VALUES(?,?)')->execute([$donationId,$youtubeId]);
                }
            }
            $db->commit();
            break;
        } catch (PDOException $e) {
            if ($db->inTransaction()) $db->rollBack();
            if ($t === 4 || !in_array((int)($e->errorInfo[1] ?? 0), [1062,1205,1213], true)) throw $e;
        }
    }

    if ($isTestAccount) respond(200, ['test_paid' => true]);

    send_payment_code($code, $statusToken, $amount);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log('Create donation error: ' . $e->getMessage());
    fail(500, 'Không thể tạo mã ủng hộ lúc này. Vui lòng tải lại trang và thử lại.');
}
