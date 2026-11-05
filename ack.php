<?php
require 'config.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if (!hash_equals(OVERLAY_KEY, $_GET['k'] ?? '')) { http_response_code(403); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
$in = json_decode(file_get_contents('php://input'), true);
$id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT);
$token = $in['claim_token'] ?? '';
if (!$id || !is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)) {
    http_response_code(400); exit('{"success":false}');
}
try {

    $s = db()->prepare("UPDATE donations SET shown=1 WHERE id=? AND status='paid' AND queue_state='queued' AND claim_token=?");
    $s->execute([$id, $token]);
    $s = db()->prepare('SELECT 1 FROM donations WHERE id=? AND shown=1 AND claim_token=?');
    $s->execute([$id, $token]);
    if (!$s->fetchColumn()) { http_response_code(409); exit('{"success":false}'); }
    echo '{"success":true}';
} catch (Throwable $e) {
    error_log('Overlay ack: ' . $e->getMessage());
    http_response_code(500); echo '{"success":false}';
}
