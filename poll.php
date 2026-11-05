<?php
require __DIR__ . '/speech.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if (!hash_equals(OVERLAY_KEY, $_GET['k'] ?? '')) { http_response_code(403); exit('[]'); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('[]'); }
$db = db();
try {
    $db->beginTransaction();
    $settings = $db->query('SELECT * FROM app_settings WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
    if (!$settings) throw new RuntimeException('Missing queue settings');
    if ($settings['paused']) { $db->commit(); exit('[]'); }
    // A replay of an older ID must not overlap a newer currently playing item.
    $active = $db->query("SELECT id FROM donations WHERE status='paid' AND shown=0 AND queue_state='queued'
        AND claimed_until>NOW() LIMIT 1 FOR UPDATE")->fetchColumn();
    if ($active !== false) { $db->commit(); exit('[]'); }
    $row = $db->query("SELECT d.id,d.name,d.message,d.paid_amount,d.donor_avatar,
        COALESCE((SELECT FLOOR(SUM(x.paid_amount)/200000) FROM donations x WHERE x.user_id=d.user_id AND x.status='paid'),0) AS donor_level,
        (d.claimed_until > NOW()) AS active_claim FROM donations d
        WHERE d.status='paid' AND d.shown=0 AND d.queue_state='queued' ORDER BY d.id LIMIT 1 FOR UPDATE")
        ->fetch(PDO::FETCH_ASSOC);
    if (!$row || $row['active_claim']) { $db->commit(); exit('[]'); }
    $token = bin2hex(random_bytes(32));
    $seconds = max(30, (int)OVERLAY_LEASE_SECONDS);
    $db->prepare("UPDATE donations SET claim_token=?, claimed_until=DATE_ADD(NOW(), INTERVAL $seconds SECOND) WHERE id=?")
       ->execute([$token, $row['id']]);
    $db->commit();
    unset($row['active_claim']);
    $row['claim_token'] = $token;
    $row['tier'] = tier((int)$row['paid_amount']);
    $row['lease_seconds'] = $seconds;
    $row['speech'] = speech_options($settings);
    $row['speech_text'] = speech_text($row, $settings);
    echo json_encode([$row], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    error_log('Overlay claim: ' . $e->getMessage());
    http_response_code(500); echo '[]';
}
