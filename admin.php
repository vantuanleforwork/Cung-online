<?php
require __DIR__ . '/admin-actions.php';
require_once __DIR__ . '/speech-schema.php';
require_once __DIR__ . '/voice-catalog.php';
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
ini_set('session.use_strict_mode', '1');
session_name('cung_admin');
session_set_cookie_params(['httponly' => true, 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite' => 'Strict', 'path' => '/']);
session_start();
if (isset($_SESSION['last_active']) && time() - $_SESSION['last_active'] > 1800) $_SESSION = [];
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
if (!empty($_SESSION['admin'])) $_SESSION['last_active'] = time();
$error = '';
$flash = $_SESSION['flash'] ?? '';
unset($_SESSION['flash']);
$configured = ADMIN_PASSWORD_HASH !== '' && !empty(password_get_info(ADMIN_PASSWORD_HASH)['algo']);
function h($value) { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function csrf_field() { echo '<input type="hidden" name="csrf" value="' . h($_SESSION['csrf']) . '">'; }
function action_form(string $action, array $fields, string $label) {
    echo '<form method="post" class="inline">'; csrf_field();
    echo '<input type="hidden" name="action" value="' . h($action) . '">';
    foreach ($fields as $key => $value) echo '<input type="hidden" name="' . h($key) . '" value="' . h($value) . '">';
    echo '<button>' . h($label) . '</button></form>';
}
function redirect_admin(string $view = '') { header('Location: admin.php' . ($view !== '' ? '?view='.rawurlencode($view) : ''), true, 303); exit; }

if (!empty($_SESSION['admin'])) {
    try { ensure_speech_schema(db()); }
    catch (Throwable $e) {
        error_log('Speech upgrade: ' . $e->getMessage()); http_response_code(503);
        $error = 'Chưa nâng cấp được phần giọng đọc. Kiểm tra user database có quyền CREATE, ALTER rồi tải lại trang.';
    }
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $error === '') {
    if (!is_string($_POST['csrf'] ?? null) || !hash_equals($_SESSION['csrf'], $_POST['csrf'])) {
        http_response_code(403); $error = 'Phiên không hợp lệ. Hãy tải lại trang.';
    } else {
        try {
            $action = $_POST['action'] ?? '';
            if ($action === 'login') {
                if (!$configured) { http_response_code(503); throw new InvalidArgumentException('Quản trị chưa được cấu hình mật khẩu.'); }
                $password = $_POST['password'] ?? '';
                if (!is_string($password) || strlen($password) > 1024) throw new InvalidArgumentException('Mật khẩu không hợp lệ.');
                $db = db();
                $ipHash = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
                $db->beginTransaction();
                $db->prepare('INSERT IGNORE INTO admin_login_attempts(ip_hash,window_start) VALUES(?,NOW())')->execute([$ipHash]);
                $s = $db->prepare('SELECT attempts,(window_start>NOW()-INTERVAL 15 MINUTE) AS recent FROM admin_login_attempts WHERE ip_hash=? FOR UPDATE');
                $s->execute([$ipHash]); $attempt = $s->fetch(PDO::FETCH_ASSOC);
                if ($attempt['recent'] && (int)$attempt['attempts'] >= 5) {
                    $db->commit(); http_response_code(429);
                    throw new InvalidArgumentException('Đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.');
                }
                if (!password_verify($password, ADMIN_PASSWORD_HASH)) {
                    $db->prepare('UPDATE admin_login_attempts SET attempts=?,window_start=IF(?,window_start,NOW()) WHERE ip_hash=?')
                       ->execute([$attempt['recent'] ? (int)$attempt['attempts'] + 1 : 1, (int)$attempt['recent'], $ipHash]);
                    $db->commit(); http_response_code(401);
                    throw new InvalidArgumentException('Mật khẩu không đúng.');
                }
                $db->prepare('DELETE FROM admin_login_attempts WHERE ip_hash=?')->execute([$ipHash]);
                $db->commit();
                session_regenerate_id(true);
                $_SESSION = ['admin' => true, 'last_active' => time(), 'csrf' => bin2hex(random_bytes(32))];
                redirect_admin();
            } elseif (empty($_SESSION['admin'])) {
                http_response_code(401); throw new InvalidArgumentException('Hãy đăng nhập trước.');
            } elseif ($action === 'logout') {
                $_SESSION = []; session_regenerate_id(true); redirect_admin();
            } elseif ($action === 'list_voices') {
                session_write_close();
                respond(200, voice_catalog(db(), $_POST));
            } elseif ($action === 'preview_voice') {
                $settings = speech_settings_input($_POST);
                if ($settings['speech_provider'] === 'elevenlabs' && empty($settings['eleven_voice_id'])) {
                    throw new InvalidArgumentException('Nhập hoặc chọn Voice ID ElevenLabs trước khi nghe thử.');
                }
                if ($settings['speech_provider'] === 'custom_api' && empty($settings['custom_voice_id'])) {
                    throw new InvalidArgumentException('Nhập hoặc chọn Voice ID cho Custom API Voice trước khi nghe thử.');
                }
                $demo = preview_donation();
                $demo['speech'] = speech_options($settings);
                $demo['speech_text'] = speech_text($demo, $settings);
                session_write_close();
                if ($settings['speech_enabled'] && (float)$settings['speech_volume'] > 0 && in_array($settings['speech_provider'], ['fpt','elevenlabs','custom_api'], true)) {
                    $demo['audio_url'] = provider_audio(db(), $demo['speech_text'], $demo['speech'],
                        $settings['speech_provider'] === 'elevenlabs' ? (posted_eleven_key($_POST) ?: null) : null,
                        $settings['speech_provider'] === 'custom_api' ? (posted_custom_key($_POST) ?: null) : null);
                }
                respond(200, ['demo' => $demo]);
            } else {
                admin_action(db(), $_POST, $_SERVER['REMOTE_ADDR'] ?? '');
                $_SESSION['flash'] = 'Đã lưu thay đổi.'; redirect_admin(in_array($action, ['save_speech','clear_speech_cache'], true) ? 'speech' : (in_array($action,['block_user','unblock_identifier'],true) ? 'users' : ''));
            }
        } catch (InvalidArgumentException $e) {
            if (http_response_code() === 200) http_response_code(409);
            if (in_array($_POST['action'] ?? '', ['preview_voice','list_voices'], true)) respond(400, ['error' => $e->getMessage()]);
            $error = $e->getMessage();
        } catch (SpeechProviderException $e) {
            if (in_array($_POST['action'] ?? '', ['preview_voice','list_voices'], true)) respond(503, ['error' => $e->getMessage()]);
            http_response_code(503); $error = $e->getMessage();
        } catch (Throwable $e) {
            if (isset($db) && $db->inTransaction()) $db->rollBack();
            error_log('Admin: ' . $e->getMessage()); http_response_code(500);
            if (in_array($_POST['action'] ?? '', ['preview_voice','list_voices'], true)) respond(500, ['error' => 'Chưa kết nối được dịch vụ giọng. Kiểm tra cấu hình, API key và hạn mức.']);
            $error = 'Không thực hiện được. Hãy kiểm tra database và nhật ký máy chủ.';
        }
    }
}

$loggedIn = !empty($_SESSION['admin']);
$view = is_string($_GET['view'] ?? null) ? $_GET['view'] : 'queue';
if (!in_array($view, ['queue', 'payments', 'logs', 'audit', 'speech', 'users'], true)) $view = 'queue';
$page = max(1, (int)($_GET['page'] ?? 1));
$offset = min($page - 1, 1000000) * 30;
$rows = []; $paused = false; $total = 0; $elevenConfigured = false; $customConfigured = false; $userDonations=[]; $blockedRows=[];
$search = is_string($_GET['q'] ?? null) ? mb_substr(trim($_GET['q']), 0, 64) : '';
$filter = is_string($_GET['filter'] ?? null) ? $_GET['filter'] : '';
$detail = null;
if ($loggedIn) {
    try {
        $db = db();
        $settings = $db->query('SELECT * FROM app_settings WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        $paused = (bool)$settings['paused'];
        if ($view === 'speech') $elevenConfigured = eleven_api_key($db) !== '';
        if ($view === 'speech') $customConfigured = custom_api_key($db, $settings['custom_api_url'] ?? '') !== '';
        $params = [];
        if ($view === 'queue') {
            $table = 'donations';
            $where = '(code LIKE ? OR EXISTS (SELECT 1 FROM payment_transactions p WHERE p.tx_id=donations.tx_id AND UPPER(p.content) LIKE ?))';
            $params = [PREFIX . '%', '%' . PREFIX . '%'];
            if ($search !== '') { $where .= ' AND (code=? OR tx_id=?)'; $params[] = $search; $params[] = $search; }
            if (in_array($filter, ['held', 'queued', 'skipped'], true)) { $where .= " AND status='paid' AND queue_state=? AND shown=0"; $params[] = $filter; }
            elseif ($filter === 'shown') $where .= ' AND shown=1';
            elseif ($filter === 'pending') $where .= " AND status='pending'";
        } elseif ($view === 'payments') {
            $table = 'payment_transactions'; $where = 'UPPER(content) LIKE ?';
            $params[] = '%' . PREFIX . '%';
            if ($search !== '') { $where .= ' AND tx_id=?'; $params[] = $search; }
            if (in_array($filter, ['unmatched', 'matched', 'anonymous', 'below_min', 'wrong_account', 'ignored_out', 'ignored_manual', 'legacy_review'], true)) {
                $where .= ' AND decision=?'; $params[] = $filter;
            }
        } elseif ($view === 'users') {
            $table='donor_users';$where='1=1';
            if ($search!=='') { $where='(email LIKE ? OR display_name LIKE ?)'; $params=['%'.$search.'%','%'.$search.'%']; }
        } else {
            $table = $view === 'logs' ? 'webhook_logs' : 'admin_audit'; $where = '1=1';
            if ($view === 'logs') {
                // Inspect content fields only; an unrelated payload may mention the prefix elsewhere.
                $where = "JSON_SEARCH(UPPER(JSON_EXTRACT(IF(JSON_VALID(payload),payload,'{}'), '$.transactions[*].content')), 'one', ?) IS NOT NULL";
                $params[] = '%' . PREFIX . '%';
            }
        }
        $s = $db->prepare("SELECT COUNT(*) FROM $table WHERE $where"); $s->execute($params); $total = (int)$s->fetchColumn();
        $order = $view === 'payments' ? 'created_at DESC,tx_id DESC' : ($view==='users' ? 'created_at DESC,id DESC' : 'id DESC');
        $columns = $view === 'logs' ? 'id,created_at,response_code,outcome,transaction_count,duplicate_count,detail' : '*';
        if ($view === 'queue') $columns .= ',(claimed_until>NOW() AND shown=0) AS playing';
        if ($view === 'users') $columns = "donor_users.*,(SELECT COUNT(*) FROM donations d WHERE d.user_id=donor_users.id) AS donation_count,(SELECT COALESCE(SUM(paid_amount),0) FROM donations d WHERE d.user_id=donor_users.id AND d.status='paid') AS total_paid";
        $s = $db->prepare("SELECT $columns FROM $table WHERE $where ORDER BY $order LIMIT 30 OFFSET $offset");
        $s->execute($params); $rows = $s->fetchAll(PDO::FETCH_ASSOC);
        if ($view==='users') {
            $s=$db->prepare('SELECT id,created_at,ip,device_hash,code,status,paid_amount FROM donations WHERE user_id=? ORDER BY id DESC LIMIT 20');
            foreach ($rows as $user) { $s->execute([$user['id']]); $userDonations[$user['id']]=$s->fetchAll(PDO::FETCH_ASSOC); }
            $blockedRows=$db->query('SELECT * FROM blocked_donors ORDER BY created_at DESC LIMIT 200')->fetchAll(PDO::FETCH_ASSOC);
        }
        if ($view === 'logs' && filter_var($_GET['detail'] ?? null, FILTER_VALIDATE_INT)) {
            $s = $db->prepare("SELECT * FROM webhook_logs WHERE $where AND id=?");
            $s->execute(array_merge($params, [$_GET['detail']])); $detail = $s->fetch(PDO::FETCH_ASSOC);
            if ($detail) {
                // Older batches may contain personal transfers alongside site transfers.
                $payload = json_decode($detail['payload'], true);
                $payload['transactions'] = array_values(array_filter($payload['transactions'] ?? [], function ($t) {
                    return is_array($t) && is_string($t['content'] ?? null) && is_site_transfer($t['content']);
                }));
                $detail['payload'] = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            }
        }
    } catch (Throwable $e) {
        error_log('Admin list: ' . $e->getMessage()); http_response_code(500);
        $error = 'Chưa đọc được dữ liệu. Kiểm tra cấu hình và chạy đủ migration.';
    }
}
$stateLabels = ['held' => 'Chờ duyệt', 'queued' => 'Chờ phát', 'skipped' => 'Đã bỏ qua'];
$decisionLabels = ['unmatched' => 'Chờ đối soát', 'matched' => 'Đã ghép đơn', 'anonymous' => 'Lễ ẩn danh',
    'below_min' => 'Dưới 10.000đ', 'wrong_account' => 'Sai tài khoản nhận', 'ignored_out' => 'Tiền ra',
    'ignored_manual' => 'Không thuộc dự án', 'legacy_review' => 'Dữ liệu cũ thiếu thông tin'];
?>
<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quản trị dâng hương</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4ecdc;color:#2a1a14;font:15px/1.5 system-ui,sans-serif}main{max-width:1400px;margin:32px auto;padding:0 20px}h1{font-size:26px}a{color:#7a1f17}nav{display:flex;gap:18px;flex-wrap:wrap;margin:20px 0}button,input,textarea,select{font:inherit;padding:8px;border:1px solid #b9a98f;border-radius:4px}button{background:#7a1f17;color:white;cursor:pointer}button:disabled{opacity:.5}input,textarea{max-width:100%;background:#fffdf6}textarea{width:100%;min-height:80px}.inline{display:inline-block;margin:3px}.notice{padding:12px;background:#e3ecd9;border:1px solid #78915a}.error{background:#ffe1d9;border-color:#ac4030}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;background:#fffaf0}th,td{padding:12px;border-bottom:1px solid #d8cbb5;text-align:left;vertical-align:top}th{white-space:nowrap}td{min-width:90px}.message{min-width:260px;max-width:450px;overflow-wrap:anywhere}.muted{color:#715f4b;font-size:13px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fffaf0;padding:16px}details{margin:8px 0}.login{max-width:420px;background:#fffaf0;padding:24px}label{display:block;margin:10px 0}code{overflow-wrap:anywhere}.bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.pagination{margin:20px 0;display:flex;gap:20px}
.speech-panel{max-width:900px;background:#fffaf0;border:1px solid #d8cbb5;border-radius:18px;padding:28px;margin-top:24px;box-shadow:0 12px 40px #2a1a1409}.speech-panel h2{margin-top:0}.speech-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.speech-grid input,.speech-grid select{width:100%}.speech-panel textarea{padding:16px;min-height:120px;line-height:1.7}.speech-panel code{background:#eee2ca;padding:3px 6px;border-radius:4px}.sample{border-left:3px solid #b8892e;padding:12px 18px;background:#f4ecdc;line-height:1.8}.speech-panel label{font-weight:600}.speech-panel small{display:block;font-weight:400;color:#715f4b;margin-top:5px}@media(max-width:600px){.speech-grid{grid-template-columns:1fr}.speech-panel{padding:18px}}
.api-panel{min-width:0;border:1px solid #d8cbb5;border-radius:12px;padding:16px;margin:20px 0}.api-panel legend{font-weight:600;color:#795d36;padding:0 8px}.voice-picker{border:1px solid #e1d8c9;border-radius:10px;padding:14px;margin:12px 0}.voice-picker summary{cursor:pointer;font-weight:600}.voice-results{width:100%;margin-top:12px}.voice-picker .voice-search{flex:1;min-width:160px}
[hidden]{display:none!important}.platform-select select{display:block;width:100%;margin-top:8px;padding:12px}.platform-select small{display:block;font-weight:400;color:#715f4b;margin-top:8px}.api-panel p{margin:4px 0}.api-panel select{width:100%}.common-voice-settings{margin:18px 0}.template-help{font-size:13px;margin-bottom:16px}
</style><main>
<h1>Quản trị dâng hương</h1>
<?php if ($error): ?><p class="notice error" role="alert"><?=h($error)?></p><?php endif ?>
<?php if ($flash): ?><p class="notice" role="status"><?=h($flash)?></p><?php endif ?>
<?php if (!$loggedIn): ?>
<div class="login"><h2>Đăng nhập</h2>
<?php if (!$configured): ?><p>Cần cấu hình <code>ADMIN_PASSWORD_HASH</code> trong config.php. Xem README để tạo mật khẩu.</p><?php else: ?>
<form method="post"><?php csrf_field() ?><input type="hidden" name="action" value="login">
<label>Mật khẩu <input type="password" name="password" required autocomplete="current-password" maxlength="1024"></label><button>Đăng nhập</button></form>
<?php endif ?></div>
<?php else: ?>
<div class="bar"><strong>Hàng đợi: <?=$paused ? 'TẠM DỪNG' : 'ĐANG CHẠY'?></strong>
<?php action_form($paused ? 'resume' : 'pause', [], $paused ? 'Tiếp tục phát' : 'Tạm dừng'); action_form('logout', [], 'Đăng xuất'); ?>
<a href="admin.php?<?=h(http_build_query(['view'=>$view,'filter'=>$filter,'q'=>$search,'page'=>$page]))?>">Làm mới</a></div>
<p class="muted">Tạm dừng áp dụng cho lượt tiếp theo; lượt đang phát sẽ hoàn tất. Mọi thay đổi được lưu vào nhật ký quản trị.</p>
<nav><?php foreach (['queue'=>'Lượt lễ','payments'=>'Giao dịch','users'=>'Người dùng','speech'=>'Giọng đọc & hiển thị','logs'=>'Webhook','audit'=>'Nhật ký quản trị'] as $key=>$label): ?>
<a href="?view=<?=h($key)?>" <?=$view===$key ? 'aria-current="page"' : ''?>><?=h($label)?></a><?php endforeach ?></nav>
<?php if ($view === 'speech' && isset($settings['speech_template'])): ?>
<section class="speech-panel"><p class="muted">THÔNG BÁO TRÊN LIVESTREAM</p><h2>Mỗi lời nhắn, một lời gửi gắm.</h2>
<p>Tự viết câu thông báo theo cách của bạn. Giọng đọc phát cùng hoạt cảnh sau khi lượt lễ được duyệt.</p>
<?php require __DIR__ . '/voice-settings-form.php'; ?></section>
<?php else: ?>
<?php if (in_array($view,['queue','payments','users'],true)): ?>
<form method="get" class="bar"><input type="hidden" name="view" value="<?=h($view)?>">
<input name="q" value="<?=h($search)?>" placeholder="<?=$view==='queue' ? 'Mã đơn hoặc ID giao dịch' : ($view==='users' ? 'Tìm Gmail hoặc tên' : 'ID giao dịch')?>" maxlength="64">
<?php if ($view!=='users'): ?>
<select name="filter"><option value="">Tất cả trạng thái</option>
<?php $options = $view==='queue' ? ['pending'=>'Chờ tiền','held'=>'Chờ duyệt','queued'=>'Chờ phát','shown'=>'Đã phát','skipped'=>'Đã bỏ qua'] : $decisionLabels;
foreach ($options as $key=>$label): ?><option value="<?=h($key)?>" <?=$filter===$key?'selected':''?>><?=h($label)?></option><?php endforeach ?></select><?php endif ?><button>Lọc</button></form>
<?php endif ?>
<p><?=$total?> bản ghi · Trang <?=$page?></p><div class="scroll"><table>
<?php if ($view === 'queue'): ?>
<tr><th>Đơn / thời gian</th><th>Thanh toán</th><th>Tên / lời nhắn</th><th>Trạng thái / thao tác</th></tr>
<?php foreach ($rows as $row): ?>
<tr><td>#<?=h($row['id'])?> · <code><?=h($row['code'] ?: 'Ẩn danh')?></code><br><span class="muted"><?=h($row['created_at'])?></span></td>
<td>Đăng ký: <?=number_format((int)$row['expected_amount'])?>đ<br>Nhận: <?=number_format((int)$row['paid_amount'])?>đ<br><code><?=h($row['tx_id'])?></code></td>
<td class="message"><strong><?=h($row['name'])?></strong><p><?=nl2br(h($row['message']))?></p>
<?php if ($row['status']==='paid' && !$row['shown'] && !$row['playing'] && $row['queue_state']!=='skipped'): ?>
<details><summary>Sửa tên / lời nhắn</summary><form method="post"><?php csrf_field() ?><input type="hidden" name="action" value="edit"><input type="hidden" name="id" value="<?=h($row['id'])?>">
<label>Tên <input name="name" value="<?=h($row['name'])?>" maxlength="40"></label>
<label>Lời nhắn <textarea name="message" maxlength="<?=maxlen((int)$row['paid_amount'])?>"><?=h($row['message'])?></textarea></label><button>Lưu nội dung</button></form></details>
<?php endif ?></td><td>
<?php if ($row['status']==='pending'): ?>Chờ nhận tiền
<?php elseif ($row['shown']): ?>Đã phát<?php action_form('replay',['id'=>$row['id']],'Phát lại'); ?>
<?php elseif ($row['playing']): ?>Đang phát / đang giữ lượt
<?php else: ?><?=h($stateLabels[$row['queue_state']] ?? $row['queue_state'])?><br>
<?php if ($row['queue_state']==='skipped'): action_form('replay',['id'=>$row['id']],'Đưa lại vào hàng đợi');
else:
action_form($row['queue_state']==='held'?'approve':'hold',['id'=>$row['id']],$row['queue_state']==='held'?'Duyệt và phát':'Giữ để duyệt');
action_form('skip',['id'=>$row['id']],'Bỏ qua'); endif ?>
<?php endif ?></td></tr><?php endforeach ?>
<?php elseif ($view === 'payments'): ?>
<tr><th>Giao dịch / thời gian</th><th>Thông tin ngân hàng</th><th>Nội dung</th><th>Đối soát</th></tr>
<?php foreach ($rows as $row): ?><tr><td><code><?=h($row['tx_id'])?></code><br><?=h($row['created_at'])?></td>
<td><?=number_format((int)$row['paid_amount'])?>đ · <?=h($row['direction'])?><br><?=h($row['gateway'])?> · <?=h($row['account_number'])?></td>
<td class="message"><?=h($row['content'])?></td><td><?=h($decisionLabels[$row['decision']] ?? $row['decision'])?>
<?php if ($row['donation_id']): ?><br>Lượt #<?=h($row['donation_id'])?><?php endif ?>
<?php if ($row['decision']==='unmatched' && $row['donation_id']===null): ?>
<form method="post"><?php csrf_field() ?><input type="hidden" name="action" value="match"><input type="hidden" name="tx_id" value="<?=h($row['tx_id'])?>">
<label>Mã đơn <input name="code" required maxlength="12" placeholder="CHUA..."></label><button>Ghép với đơn</button></form>
<details><summary>Cách xử lý khác</summary><?php action_form('anonymous',['tx_id'=>$row['tx_id']],'Tạo lễ ẩn danh'); action_form('ignore',['tx_id'=>$row['tx_id']],'Đánh dấu không thuộc dự án'); ?></details>
<?php endif ?></td></tr><?php endforeach ?>
<?php elseif ($view === 'logs'): ?>
<tr><th>Lần gọi / thời gian</th><th>Kết quả</th><th>Số giao dịch</th><th>Chi tiết</th></tr>
<?php foreach ($rows as $row): ?><tr><td>#<?=h($row['id'])?><br><?=h($row['created_at'])?></td><td>HTTP <?=h($row['response_code'])?> · <?=h($row['outcome'])?></td><td><?=h($row['transaction_count'])?> · trùng: <?=h($row['duplicate_count'])?></td><td><?=h($row['detail'])?><br><a href="?view=logs&amp;detail=<?=h($row['id'])?>">Xem dữ liệu</a></td></tr><?php endforeach ?>
<?php elseif ($view === 'users'): ?>
<tr><th>Hồ sơ Google</th><th>Tổng đã nhận</th><th>Các lượt gần đây / chặn</th></tr>
<?php foreach ($rows as $row): $level=intdiv((int)$row['total_paid'],200000); ?>
<tr><td><strong><?=h($row['display_name'])?></strong> · Lv<?=$level?><br><?=h($row['email'])?><br><span class="muted">Tạo tài khoản <?=h($row['created_at'])?> · <?=h($row['donation_count'])?> lượt</span>
<form method="post" class="inline"><?php csrf_field() ?><input type="hidden" name="action" value="block_user"><input type="hidden" name="user_id" value="<?=h($row['id'])?>"><input type="hidden" name="block_type" value="email"><button>Chặn Gmail</button></form></td>
<td><?=number_format((int)$row['total_paid'])?>đ</td><td>
<details><summary>Xem IP và trình duyệt ghi nhận</summary>
<?php foreach ($userDonations[$row['id']] ?? [] as $d): ?><div class="muted">#<?=h($d['id'])?> · <?=h($d['created_at'])?> · <?=h($d['status'])?> · <?=number_format((int)$d['paid_amount'])?>đ
<?php if ($d['ip']): ?> · <?=h(mask_ip_value($d['ip']))?> <form method="post" class="inline"><?php csrf_field() ?><input type="hidden" name="action" value="block_user"><input type="hidden" name="user_id" value="<?=h($row['id'])?>"><input type="hidden" name="block_type" value="ip"><input type="hidden" name="reference_id" value="<?=h($d['id'])?>"><button>Chặn IP</button></form><?php endif ?>
<?php if ($d['device_hash']): ?> · Mã trình duyệt <?=h(substr($d['device_hash'],0,10))?> <form method="post" class="inline"><?php csrf_field() ?><input type="hidden" name="action" value="block_user"><input type="hidden" name="user_id" value="<?=h($row['id'])?>"><input type="hidden" name="block_type" value="device"><input type="hidden" name="reference_id" value="<?=h($d['id'])?>"><button>Chặn trình duyệt</button></form><?php endif ?></div><?php endforeach ?>
</details></td></tr><?php endforeach ?>
<?php if ($blockedRows): ?><tr><td colspan="3"><h3>Danh sách đang chặn</h3>
<?php foreach ($blockedRows as $b): ?><div><?=h(['email'=>'Gmail','ip'=>'IP','device'=>'Trình duyệt'][$b['block_type']])?> · <?=h($b['identifier_hint'])?> · <?=h($b['reason'] ?: 'Không ghi lý do')?> · <?=h($b['created_at'])?>
<?php action_form('unblock_identifier',['block_id'=>$b['id']],'Gỡ chặn'); ?></div><?php endforeach ?></td></tr><?php endif ?>
<?php else: ?>
<tr><th>Thời gian</th><th>Thao tác</th><th>Chi tiết</th><th>IP</th></tr>
<?php foreach ($rows as $row): ?><tr><td><?=h($row['created_at'])?></td><td><?=h($row['action'])?></td><td class="message"><?=h($row['detail'])?></td><td><?=h($row['ip'])?></td></tr><?php endforeach ?>
<?php endif ?>
<?php if (!$rows): ?><tr><td colspan="4">Chưa có bản ghi phù hợp.</td></tr><?php endif ?>
</table></div>
<?php if ($detail): ?><h2>Dữ liệu webhook #<?=h($detail['id'])?></h2><pre><?=h($detail['payload'] ?? 'Không lưu payload cho yêu cầu này.')?></pre><?php endif ?>
<div class="pagination"><?php if ($page>1): ?><a href="?<?=h(http_build_query(['view'=>$view,'filter'=>$filter,'q'=>$search,'page'=>$page-1]))?>">← Trang trước</a><?php endif ?>
<?php if ($offset+30<$total): ?><a href="?<?=h(http_build_query(['view'=>$view,'filter'=>$filter,'q'=>$search,'page'=>$page+1]))?>">Trang sau →</a><?php endif ?></div>
<?php endif ?>
<?php endif ?></main>
<?php if ($loggedIn && $view==='speech'): ?><script src="speech-runtime.js?v=6"></script><script src="admin-voice.js?v=6"></script><?php endif ?>
</html>
