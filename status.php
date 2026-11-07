<?php
require __DIR__ . '/common.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Chỉ hỗ trợ POST.']);
$in = input_json(1024);
$token = $in['status_token'] ?? '';
if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)) respond(404, ['error' => 'Không tìm thấy đơn.']);
try {
    $db = db();
    // A consistent snapshot keeps state/queue counts in agreement.
    $db->beginTransaction();
    $s = $db->prepare('SELECT id,code,status,paid_amount,shown,queue_state,donation_kind,music_min_amount,(claimed_until > NOW()) AS playing FROM donations WHERE status_token=?');
    $s->execute([$token]);
    $row = $s->fetch(PDO::FETCH_ASSOC);
    if (!$row) { $db->rollBack(); respond(404, ['error' => 'Không tìm thấy đơn.']); }
    $state = 'pending';
    $ahead = 0;
    if ($row['status'] === 'paid') {
        if ($row['queue_state'] === 'skipped') $state = 'skipped';
        elseif ($row['shown']) $state = 'shown';
        elseif ($row['queue_state'] === 'held') $state = 'review';
        elseif ($row['playing']) $state = 'playing';
        else {
            $state = 'queued';
            $s = $db->prepare("SELECT COUNT(*) FROM donations WHERE is_test=0 AND status='paid' AND shown=0 AND queue_state='queued' AND id<?");
            $s->execute([$row['id']]);
            $ahead = (int)$s->fetchColumn();
        }
    }
    $paused = (bool)$db->query('SELECT paused FROM app_settings WHERE id=1')->fetchColumn();
    $db->commit();
    respond(200, ['code' => $row['code'], 'state' => $state, 'paid_amount' => $row['paid_amount'],
        'ahead' => $ahead, 'paused' => $paused, 'kind'=>$row['donation_kind'], 'music_eligible'=>$row['donation_kind']==='music' && (int)$row['paid_amount'] >= (int)$row['music_min_amount']]);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log('Payment status: ' . $e->getMessage());
    respond(500, ['error' => 'Chưa kiểm tra được trạng thái.']);
}
