<?php
require __DIR__ . '/common.php';
if (!hash_equals(OVERLAY_KEY, $_GET['k'] ?? '')) respond(403, ['success' => false]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['success' => false]);
$in = input_json(1024); $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT); $token = $in['claim_token'] ?? '';
if (!$id || !is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)) respond(400, ['success' => false]);
try {
    $db = db(); $db->beginTransaction();
    $seconds = max(30, (int)OVERLAY_LEASE_SECONDS);
    $s = $db->prepare("UPDATE donations SET claimed_until=DATE_ADD(NOW(),INTERVAL $seconds SECOND)
        WHERE id=? AND claim_token=? AND status='paid' AND shown=0 AND queue_state='queued' AND claimed_until>NOW()");
    $s->execute([$id, $token]);
    $s = $db->prepare("SELECT 1 FROM donations WHERE id=? AND claim_token=? AND status='paid' AND shown=0 AND queue_state='queued' AND claimed_until>NOW()");
    $s->execute([$id, $token]); $ok = (bool)$s->fetchColumn(); $db->commit();
    respond($ok ? 200 : 409, ['success' => $ok]);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log('Overlay renew: ' . $e->getMessage()); respond(500, ['success' => false]);
}
