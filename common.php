<?php
require_once __DIR__ . '/config.php';

function respond(int $status, array $body) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function input_json(int $limit = 131072) {
    $raw = file_get_contents('php://input', false, null, 0, $limit + 1);
    if (strlen($raw) > $limit) respond(413, ['error' => 'Dữ liệu quá lớn.']);
    $data = json_decode($raw, true);
    if (!is_array($data)) respond(400, ['error' => 'JSON không hợp lệ.']);
    return $data;
}

function review_state() { return REQUIRE_REVIEW ? 'held' : 'queued'; }

function donor_session() {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    session_name('cung_donor');
    session_set_cookie_params(['httponly'=>true,'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite'=>'Lax','path'=>'/']);
    session_start();
    if (isset($_SESSION['donor_last_active']) && time() - $_SESSION['donor_last_active'] > 86400) $_SESSION = [];
    if (empty($_SESSION['donor_csrf'])) $_SESSION['donor_csrf'] = bin2hex(random_bytes(32));
    if (!empty($_SESSION['donor_id'])) $_SESSION['donor_last_active'] = time();
}

function donor_device_token(): string {
    $name = 'cung_device';
    $token = $_COOKIE[$name] ?? '';
    if (is_string($token) && preg_match('/^[a-f0-9]{64}$/D', $token)) return $token;
    $token = bin2hex(random_bytes(32));
    setcookie($name, $token, ['expires'=>time()+31536000,'path'=>'/','secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly'=>true,'samesite'=>'Lax']);
    $_COOKIE[$name] = $token;
    return $token;
}

function donor_hash(string $value): string {
    if (strlen(DONOR_ID_HMAC_KEY) < 32) throw new RuntimeException('DONOR_ID_HMAC_KEY must contain at least 32 characters');
    return hash_hmac('sha256', $value, DONOR_ID_HMAC_KEY);
}

function normalized_ip(): string {
    $ip = trim((string)($_SERVER['REMOTE_ADDR'] ?? ''));
    $packed = @inet_pton($ip);
    return $packed === false ? $ip : inet_ntop($packed);
}

function normalized_ip_value(string $ip): string {
    $packed=@inet_pton(trim($ip)); return $packed===false ? trim($ip) : inet_ntop($packed);
}

function mask_ip_value(string $ip): string {
    $packed=@inet_pton(trim($ip));
    if ($packed===false) return 'IP đã ẩn';
    if (strlen($packed)===4) { $parts=explode('.',inet_ntop($packed)); $parts[3]='*'; return implode('.',$parts); }
    return substr(inet_ntop($packed),0,19).'…';
}

function donor_context(): array {
    $token = donor_device_token();
    return ['ip'=>normalized_ip(),'device_hash'=>donor_hash($token)];
}

function donor_level_progress(int $total): array {
    $total = max(0, $total);
    $remainingInLevel = $total;
    $step = 200000;
    $level = 0;
    while ($remainingInLevel >= $step) {
        $remainingInLevel -= $step;
        $level++;
        $step = $step > intdiv(PHP_INT_MAX - 9, 14) ? PHP_INT_MAX : intdiv($step * 14 + 9, 10);
    }
    return [
        'level' => $level,
        'percent' => (int)floor($remainingInLevel / $step * 100),
        'remaining' => $step - $remainingInLevel,
    ];
}

function ensure_donor_privilege_schema(PDO $db): void {
    static $ready = [];
    $connection = spl_object_id($db);
    if (!empty($ready[$connection])) return;
    $columns = array_column($db->query('SHOW COLUMNS FROM donor_users')->fetchAll(PDO::FETCH_ASSOC), 'Field');
    if (!in_array('is_test_account', $columns, true)) {
        $db->exec('ALTER TABLE donor_users ADD COLUMN is_test_account TINYINT NOT NULL DEFAULT 0');
    }
    if (!in_array('level_override', $columns, true)) {
        $db->exec('ALTER TABLE donor_users ADD COLUMN level_override SMALLINT UNSIGNED NULL DEFAULT NULL');
    }
    $db->prepare('UPDATE donor_users SET is_test_account=1,level_override=100 WHERE LOWER(email)=?')
       ->execute(['vantuanleforwork@gmail.com']);
    $ready[$connection] = true;
}

function donor_account_privileges(PDO $db, int $userId): array {
    ensure_donor_privilege_schema($db);
    $query = $db->prepare('SELECT is_test_account,level_override FROM donor_users WHERE id=?');
    $query->execute([$userId]);
    $row = $query->fetch(PDO::FETCH_ASSOC) ?: [];
    return [
        'is_test_account'=>!empty($row['is_test_account']),
        'level_override'=>isset($row['level_override']) ? (int)$row['level_override'] : null,
    ];
}

function donor_progress(PDO $db, int $userId): array {
    $s = $db->prepare("SELECT COALESCE(SUM(paid_amount),0) FROM donations WHERE user_id=? AND status='paid' AND is_test=0");
    $s->execute([$userId]);
    $progress = donor_level_progress((int)$s->fetchColumn());
    $privileges = donor_account_privileges($db, $userId);
    if ($privileges['level_override'] !== null && $privileges['level_override'] > $progress['level']) {
        $progress = ['level'=>$privileges['level_override'],'percent'=>100,'remaining'=>0];
    }
    return $progress;
}

function donor_level(PDO $db, int $userId): int {
    return donor_progress($db, $userId)['level'];
}

function donor_blocked(PDO $db, string $emailHash, string $ip, string $deviceHash): bool {
    $s = $db->prepare('SELECT 1 FROM blocked_donors WHERE (block_type=\'email\' AND identifier_hash=?) OR (block_type=\'ip\' AND identifier_hash=?) OR (block_type=\'device\' AND identifier_hash=?) LIMIT 1');
    $s->execute([$emailHash, donor_hash($ip), $deviceHash]);
    return (bool)$s->fetchColumn();
}

function google_http_json(string $url, ?array $post = null): array {
    if (!function_exists('curl_init')) throw new RuntimeException('PHP cURL is required for Google sign-in');
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>5,
        CURLOPT_TIMEOUT=>10,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
        CURLOPT_HTTPHEADER=>['Accept: application/json']]);
    if ($post !== null) { curl_setopt($ch, CURLOPT_POST, true); curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post)); }
    $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); $error = curl_error($ch); curl_close($ch);
    if (!is_string($body) || $code < 200 || $code >= 300) throw new RuntimeException('Google request failed: ' . $error);
    $data = json_decode($body, true);
    if (!is_array($data)) throw new RuntimeException('Google returned invalid JSON');
    return $data;
}

function rsa_jwk_pem(array $jwk): string {
    $decode=static function($v){return base64_decode(strtr($v,'-_','+/').str_repeat('=',(4-strlen($v)%4)%4),true);};
    $length=static function($n){if($n<128)return chr($n);$bytes='';while($n>0){$bytes=chr($n&255).$bytes;$n>>=8;}return chr(128|strlen($bytes)).$bytes;};
    $tlv=static function($tag,$bytes)use($length){return chr($tag).$length(strlen($bytes)).$bytes;};
    if (!is_string($jwk['n'] ?? null) || !is_string($jwk['e'] ?? null)) throw new RuntimeException('Google signing key is invalid');
    $n=$decode($jwk['n']);$e=$decode($jwk['e']);
    if (!is_string($n)||!is_string($e)||$n===''||$e==='') throw new RuntimeException('Google signing key is invalid');
    if ((ord($n[0])&128)!==0) $n="\0".$n; if ((ord($e[0])&128)!==0) $e="\0".$e;
    $rsa=$tlv(0x30,$tlv(0x02,$n).$tlv(0x02,$e));
    $algorithm=hex2bin('300d06092a864886f70d0101010500');
    $spki=$tlv(0x30,$algorithm.$tlv(0x03,"\0".$rsa));
    return "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($spki),64,"\n")."-----END PUBLIC KEY-----\n";
}

function google_identity(string $jwt, string $nonce): array {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) throw new RuntimeException('Invalid Google identity token');
    $decode = function($value) { $result=base64_decode(strtr($value,'-_','+/').str_repeat('=',(4-strlen($value)%4)%4),true); return $result; };
    $header = json_decode((string)$decode($parts[0]), true); $claims = json_decode((string)$decode($parts[1]), true); $signature=$decode($parts[2]);
    if (!is_array($header) || !is_array($claims) || !is_string($signature) || ($header['alg'] ?? '') !== 'RS256' || !is_string($header['kid'] ?? null)) throw new RuntimeException('Invalid Google identity token');
    $keys = google_http_json('https://www.googleapis.com/oauth2/v3/certs'); $publicKey = null;
    foreach (($keys['keys'] ?? []) as $key) if (($key['kid'] ?? '') === $header['kid'] && ($key['kty'] ?? '')==='RSA') {
        if (!empty($key['x5c'][0])) $publicKey=openssl_pkey_get_public("-----BEGIN CERTIFICATE-----\n".chunk_split($key['x5c'][0],64,"\n")."-----END CERTIFICATE-----\n");
        else $publicKey=openssl_pkey_get_public(rsa_jwk_pem($key));
        break;
    }
    if (!$publicKey || openssl_verify($parts[0].'.'.$parts[1], $signature, $publicKey, OPENSSL_ALGO_SHA256) !== 1) throw new RuntimeException('Google identity signature verification failed');
    $aud = $claims['aud'] ?? null; $audOk = is_string($aud) ? hash_equals(GOOGLE_CLIENT_ID,$aud) : (is_array($aud) && in_array(GOOGLE_CLIENT_ID,$aud,true));
    $azpOk=!is_array($aud) || count($aud)<=1 || hash_equals(GOOGLE_CLIENT_ID,(string)($claims['azp'] ?? ''));
    if (!$audOk || !in_array($claims['iss'] ?? '', ['https://accounts.google.com','accounts.google.com'], true) ||
        (int)($claims['exp'] ?? 0) < time() || (int)($claims['iat'] ?? PHP_INT_MAX) > time()+60 ||
        (isset($claims['nbf']) && (int)$claims['nbf']>time()+60) || !$azpOk ||
        !isset($claims['nonce']) || !hash_equals($nonce,(string)$claims['nonce']) ||
        !in_array($claims['email_verified'] ?? false,[true,'true'],true) || empty($claims['sub']) || empty($claims['email'])) {
        throw new RuntimeException('Google identity claims are invalid');
    }
    $picture=$claims['picture'] ?? '';
    return ['sub'=>(string)$claims['sub'],'email'=>mb_strtolower(trim((string)$claims['email'])),'name'=>clean($claims['name'] ?? '',40),
        'picture'=>is_string($picture) && strlen($picture)<=2048 && filter_var($picture,FILTER_VALIDATE_URL) ? $picture : ''];
}

function google_exchange_code(string $code, string $nonce): array {
    $tokens = google_http_json('https://oauth2.googleapis.com/token', ['code'=>$code,'client_id'=>GOOGLE_CLIENT_ID,
        'client_secret'=>GOOGLE_CLIENT_SECRET,'redirect_uri'=>GOOGLE_REDIRECT_URI,'grant_type'=>'authorization_code']);
    if (!is_string($tokens['id_token'] ?? null)) throw new RuntimeException('Google did not return an identity token');
    return google_identity($tokens['id_token'],$nonce);
}

function is_site_transfer(string $content): bool {
    return stripos($content, PREFIX) !== false;
}

// Caller must hold an InnoDB transaction and locks for payment/order.
function attach_payment(PDO $db, array $payment, array $donation) {
    $db->prepare("UPDATE donations SET status='paid',paid_amount=?,tx_id=?,message=?,queue_state=? WHERE id=? AND status='pending'")
       ->execute([$payment['paid_amount'], $payment['tx_id'],
           clean($donation['message'], donation_message_limit((int)$payment['paid_amount'])), ((int)$payment['paid_amount'] < (int)($donation['required_amount'] ?? 0) ? 'held' : review_state()), $donation['id']]);
    enqueue_paid_music($db, $donation, (int)$payment['paid_amount']);
    $db->prepare("UPDATE payment_transactions SET donation_id=?,decision='matched' WHERE tx_id=?")
       ->execute([$donation['id'], $payment['tx_id']]);
}

require_once __DIR__ . '/music.php';
require_once __DIR__ . '/roulette.php';
require_once __DIR__ . '/donate-sound.php';
require_once __DIR__ . '/donor-skins.php';
require_once __DIR__ . '/kpi-data.php';
