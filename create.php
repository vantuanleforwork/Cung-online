<?php
require __DIR__ . '/common.php';
require_once __DIR__ . '/speech-schema.php';
header('Content-Type: application/json; charset=utf-8');

function fail($code, $msg) { http_response_code($code); exit(json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE)); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Chỉ hỗ trợ POST.');
donor_session();
if (empty($_SESSION['donor_id'])) fail(401, 'Hãy đăng nhập Google trước khi donate.');
if (!is_string($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null) || !hash_equals($_SESSION['donor_csrf'],$_SERVER['HTTP_X_CSRF_TOKEN'])) fail(403, 'Phiên không hợp lệ. Hãy tải lại trang.');
$in = input_json(8192);
if (!is_string($in['message'] ?? '') ||
    (!is_int($in['amount'] ?? null) && !is_string($in['amount'] ?? null)) ||
    filter_var($in['amount'], FILTER_VALIDATE_INT) === false) fail(400, 'Dữ liệu không hợp lệ.');
$amount = (int)$in['amount'];
if ($amount < MIN_AMOUNT || $amount > 50000000) fail(400, 'Số tiền tối thiểu ' . number_format(MIN_AMOUNT, 0, ',', '.') . 'đ');

$db = db();
$context=donor_context(); $ip=$context['ip']; $deviceHash=$context['device_hash'];
$userStmt=$db->prepare('SELECT id,email,email_hash,display_name,google_avatar_url,custom_avatar_path FROM donor_users WHERE id=?');
$userStmt->execute([$_SESSION['donor_id']]); $user=$userStmt->fetch(PDO::FETCH_ASSOC);
if (!$user) fail(401,'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.');
$emailHash=donor_hash(mb_strtolower(trim($user['email'])));
if (!hash_equals($emailHash,$user['email_hash']) || donor_blocked($db,$emailHash,$ip,$deviceHash)) fail(403,'Tài khoản, địa chỉ mạng hoặc trình duyệt này không thể tạo lượt donate.');
$c = $db->prepare("SELECT COUNT(*) FROM donations WHERE ip=? AND status='pending' AND created_at > NOW() - INTERVAL 10 MINUTE");
$c->execute([$ip]);
if ($c->fetchColumn() >= 10) fail(429, 'Bạn tạo quá nhiều mã, thử lại sau ít phút.');
$c=$db->prepare("SELECT COUNT(*) FROM donations WHERE user_id=? AND status='pending' AND created_at>NOW()-INTERVAL 10 MINUTE");
$c->execute([$user['id']]); if ($c->fetchColumn()>=3) fail(429,'Tài khoản đang có quá nhiều mã chờ. Hãy thử lại sau ít phút.');
$c=$db->prepare("SELECT COUNT(*) FROM donations WHERE device_hash=? AND status='pending' AND created_at>NOW()-INTERVAL 10 MINUTE");
$c->execute([$deviceHash]); if ($c->fetchColumn()>=3) fail(429,'Trình duyệt đang có quá nhiều mã chờ. Hãy thử lại sau ít phút.');

$name = clean($user['display_name'], 40) ?: 'Người gửi donate';
$avatar = $user['custom_avatar_path'] ?: $user['google_avatar_url'];
$msg  = clean($in['message'] ?? '', maxlen($amount));

try { ensure_speech_schema($db); } catch (Throwable $ignore) {}

$selectedVoiceId = null;
$voiceName = null;
$requestedVoice = trim((string)($in['voice_id'] ?? ''));
if ($requestedVoice !== '' && $amount >= 50000) {
    try {
        $currentTier = tier($amount);
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
        if ($hasVoiceCols) {
            $db->prepare('INSERT INTO donations(code,name,message,expected_amount,ip,status_token,user_id,device_hash,donor_avatar,selected_voice_id,voice_name) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
               ->execute([$code, $name, $msg, $amount, $ip, $statusToken, $user['id'], $deviceHash, $avatar, $selectedVoiceId, $voiceName]);
        } else {
            $db->prepare('INSERT INTO donations(code,name,message,expected_amount,ip,status_token,user_id,device_hash,donor_avatar) VALUES(?,?,?,?,?,?,?,?,?)')
               ->execute([$code, $name, $msg, $amount, $ip, $statusToken, $user['id'], $deviceHash, $avatar]);
        }
        break;
    } catch (PDOException $e) { if ($t === 4) throw $e; }
}

$qr = 'https://img.vietqr.io/image/' . BANK_ID . '-' . ACCOUNT_NO . '-compact2.png'
    . '?amount=' . $amount . '&addInfo=' . $code . '&accountName=' . rawurlencode(ACCOUNT_NAME);
echo json_encode(['code' => $code, 'qr' => $qr, 'status_token' => $statusToken], JSON_UNESCAPED_UNICODE);
