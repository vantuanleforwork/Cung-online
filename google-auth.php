<?php
require __DIR__ . '/common.php';
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
donor_session();
$action = $_GET['action'] ?? '';
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (GOOGLE_CLIENT_ID === '' || GOOGLE_CLIENT_SECRET === '' || strpos(GOOGLE_REDIRECT_URI,'your-domain.example') !== false) {
        http_response_code(503); exit('Chưa cấu hình Google OAuth trong config.php.');
    }
    $state=bin2hex(random_bytes(32)); $nonce=bin2hex(random_bytes(32));
    $_SESSION['google_state']=$state; $_SESSION['google_nonce']=$nonce;
    $url='https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
        'client_id'=>GOOGLE_CLIENT_ID,'redirect_uri'=>GOOGLE_REDIRECT_URI,'response_type'=>'code',
        'scope'=>'openid email profile','state'=>$state,'nonce'=>$nonce,'prompt'=>'select_account']);
    header('Location: '.$url,true,302); exit;
}
if ($action === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!is_string($_POST['csrf'] ?? null) || !hash_equals($_SESSION['donor_csrf'],$_POST['csrf'])) { http_response_code(403); exit('Phiên không hợp lệ.'); }
    $_SESSION=[]; session_regenerate_id(true); session_destroy();
    setcookie(session_name(),'',['expires'=>time()-3600,'path'=>'/','secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off','httponly'=>true,'samesite'=>'Lax']);
    header('Location: index.html',true,303); exit;
}
if ($action !== 'callback' || $_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(404); exit; }
try {
    $state=$_GET['state'] ?? ''; $code=$_GET['code'] ?? '';
    if (!is_string($state) || !is_string($code) || $code==='' || empty($_SESSION['google_state']) ||
        !hash_equals($_SESSION['google_state'],$state) || empty($_SESSION['google_nonce'])) throw new RuntimeException('Phiên đăng nhập Google hết hạn. Hãy thử lại.');
    $nonce=$_SESSION['google_nonce']; unset($_SESSION['google_state'],$_SESSION['google_nonce']);
    $identity=google_exchange_code($code,$nonce); $db=db();
    $emailHash=donor_hash($identity['email']);
    $db->prepare("INSERT INTO donor_users(google_sub,email,email_hash,display_name,google_avatar_url) VALUES(?,?,?,?,?)
        ON DUPLICATE KEY UPDATE email=VALUES(email),email_hash=VALUES(email_hash),google_avatar_url=IF(VALUES(google_avatar_url)<>'',VALUES(google_avatar_url),google_avatar_url),updated_at=NOW()")
       ->execute([$identity['sub'],$identity['email'],$emailHash,$identity['name'] ?: 'Người gửi lễ',$identity['picture']]);
    $s=$db->prepare('SELECT id FROM donor_users WHERE google_sub=?'); $s->execute([$identity['sub']]); $id=(int)$s->fetchColumn();
    if (!$id) throw new RuntimeException('Không tạo được hồ sơ.');
    session_regenerate_id(true);
    $_SESSION=['donor_id'=>$id,'donor_csrf'=>bin2hex(random_bytes(32)),'donor_last_active'=>time()];
    header('Location: index.html',true,303); exit;
} catch (Throwable $e) {
    error_log('Google sign-in: '.$e->getMessage()); http_response_code(400);
    echo htmlspecialchars($e instanceof RuntimeException && strpos($e->getMessage(),'thử lại')!==false ? $e->getMessage() : 'Đăng nhập Google chưa thành công. Hãy thử lại.',ENT_QUOTES,'UTF-8');
}
