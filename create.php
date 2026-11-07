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

    $userStmt = $db->prepare('SELECT id,email,email_hash,display_name,google_avatar_url,custom_avatar_path FROM donor_users WHERE id=?');
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
    if (!is_string($kind) || !in_array($kind, ['message','music'], true)) fail(400, 'Loại donate không hợp lệ.');
    $minimum = (int)$donateSettings[$kind === 'music' ? 'music_min' : 'message_min'];
    if ($amount < $minimum) fail(400, 'Số tiền tối thiểu là ' . number_format($minimum,0,',','.') . 'đ.');
    $youtubeId = null;
    if ($kind === 'music') {
        if (!$donateSettings['music_enabled']) fail(400, 'Donate phát nhạc đang tạm đóng.');
        if (!is_string($in['music_url'] ?? null)) fail(400, 'Chỉ nhận link YouTube.');
        try { $youtubeId = youtube_video_id($in['music_url']); }
        catch (InvalidArgumentException $error) { fail(400, $error->getMessage()); }
    }


    // Dọn dẹp các đơn 'pending' cũ của người dùng này để tránh bị nghẽn đơn
    try {
        $db->prepare("DELETE FROM donations WHERE user_id=? AND status='pending' AND created_at < NOW() - INTERVAL 15 SECOND")->execute([$user['id']]);
    } catch (Throwable $ignore) {}

    // Kiểm tra giới hạn tạo đơn với ngưỡng rộng rãi (tránh chặn nhầm khi test)
    $c = $db->prepare("SELECT COUNT(*) FROM donations WHERE ip=? AND status='pending' AND created_at > NOW() - INTERVAL 5 MINUTE");
    $c->execute([$ip]);
    if ($c->fetchColumn() >= 30) fail(429, 'Bạn thao tác quá nhanh. Hãy thử lại sau 1-2 phút.');

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
    $statusToken = bin2hex(random_bytes(32));
    for ($t = 0; $t < 5; $t++) {
        $code = PREFIX;
        for ($i = 0; $i < 6; $i++) $code .= $chars[random_int(0, 31)];
        try {
            $db->beginTransaction();
            if ($hasVoiceCols) {
                $db->prepare('INSERT INTO donations(code,name,message,expected_amount,ip,status_token,user_id,device_hash,donor_avatar,selected_voice_id,voice_name) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
                   ->execute([$code, $name, $msg, $amount, $ip, $statusToken, $user['id'], $deviceHash, $avatar, $selectedVoiceId, $voiceName]);
            } else {
                $db->prepare('INSERT INTO donations(code,name,message,expected_amount,ip,status_token,user_id,device_hash,donor_avatar) VALUES(?,?,?,?,?,?,?,?,?)')
                   ->execute([$code, $name, $msg, $amount, $ip, $statusToken, $user['id'], $deviceHash, $avatar]);
            }
            $donationId = (int)$db->lastInsertId();
            $db->prepare('UPDATE donations SET donation_kind=?,youtube_id=?,music_min_amount=?,required_amount=? WHERE id=?')->execute([$kind,$youtubeId,$kind === 'music' ? $minimum : null,$minimum,$donationId]);
            $db->commit();
            break;
        } catch (PDOException $e) { if ($db->inTransaction()) $db->rollBack(); if ($t === 4 || (int)($e->errorInfo[1] ?? 0) !== 1062) throw $e; }
    }

    $qr = 'https://img.vietqr.io/image/' . BANK_ID . '-' . ACCOUNT_NO . '-compact2.png'
        . '?amount=' . $amount . '&addInfo=' . $code . '&accountName=' . rawurlencode(ACCOUNT_NAME);

    echo json_encode([
        'code' => $code,
        'qr' => $qr,
        'status_token' => $statusToken
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log('Create donation error: ' . $e->getMessage());
    fail(500, 'Không thể tạo mã ủng hộ lúc này. Vui lòng tải lại trang và thử lại.');
}
