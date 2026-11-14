<?php
require __DIR__ . '/speech.php';
require_once __DIR__ . '/speech-schema.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if (!hash_equals(OVERLAY_KEY, $_GET['k'] ?? '')) { http_response_code(403); exit('[]'); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('[]'); }
$db = db();
try {
    try { ensure_speech_schema($db); } catch (Throwable $ignore) {}
    $db->beginTransaction();
    $settings = $db->query('SELECT * FROM app_settings WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
    if (!$settings) throw new RuntimeException('Missing queue settings');
    if ($settings['paused']) { $db->commit(); exit('[]'); }
    // A replay of an older ID must not overlap a newer currently playing item.
    $active = $db->query("SELECT id FROM donations WHERE status='paid' AND shown=0 AND queue_state='queued'
        AND claimed_until>NOW() LIMIT 1 FOR UPDATE")->fetchColumn();
    if ($active !== false) { $db->commit(); exit('[]'); }
    $cols = array_column($db->query('SHOW COLUMNS FROM donations')->fetchAll(PDO::FETCH_ASSOC), 'Field');
    $hasVoiceCols = in_array('selected_voice_id', $cols, true) && in_array('voice_name', $cols, true);
    $voiceSelect = $hasVoiceCols ? "d.selected_voice_id,d.voice_name," : "NULL AS selected_voice_id,NULL AS voice_name,";
    $row = $db->query("SELECT d.id,d.name,d.message,d.paid_amount,d.donation_kind,d.youtube_id,d.user_id,{$voiceSelect}
        (d.paid_amount >= d.required_amount) AS spin_eligible,
        (SELECT q.id FROM music_requests q WHERE q.donation_id=d.id LIMIT 1) AS music_request_id,
        (SELECT q.title FROM music_requests q WHERE q.donation_id=d.id LIMIT 1) AS music_title,
        COALESCE(NULLIF(u.custom_avatar_path,''),NULLIF(u.google_avatar_url,''),NULLIF(d.donor_avatar,'')) AS donor_avatar,
        (d.claimed_until > NOW()) AS active_claim FROM donations d LEFT JOIN donor_users u ON u.id=d.user_id
        WHERE d.status='paid' AND d.shown=0 AND d.queue_state='queued' ORDER BY d.id LIMIT 1 FOR UPDATE")
        ->fetch(PDO::FETCH_ASSOC);
    if (!$row || $row['active_claim']) { $db->commit(); exit('[]'); }
    $token = bin2hex(random_bytes(32));
    $seconds = max(30, (int)OVERLAY_LEASE_SECONDS);
    $db->prepare("UPDATE donations SET claim_token=?, claimed_until=DATE_ADD(NOW(), INTERVAL $seconds SECOND) WHERE id=?")
       ->execute([$token, $row['id']]);
    $db->commit();
    unset($row['active_claim']);

    $row['donor_level'] = 0;
    if ($row['user_id']) {
        try {
            $userId = (int)$row['user_id'];
            $row['donor_level'] = donor_level($db, $userId);
            if ($row['donor_level'] > 0) {
                $skins = donor_skin_profile($db, $userId, $row['donor_level']);
                $row['donor_skin'] = $skins['catalog'][$skins['selected']] ?? null;
            }
        } catch (Throwable $error) {
            error_log('Overlay donor skin: ' . $error->getMessage());
        }
    }
    unset($row['user_id']);
    $row['claim_token'] = $token;
    $row['tier'] = donation_tier((int)$row['paid_amount']);
    $row['lease_seconds'] = $seconds;
    $row['donate_sound_url'] = donate_sound_url();
    $row['donate_sound_volume'] = donate_sound_volume($db);
    if ($row['donation_kind'] === 'roulette' && $row['spin_eligible']) {
        $row['roulette'] = roulette_spin($db, (int)$row['id']);
        unset($row['roulette']['wheel_id']);
    }
    unset($row['spin_eligible']);
    $row['speech'] = speech_options_for_donation($settings, $row);
    $row['speech_text'] = speech_text($row, $settings);
    // Return the claim immediately. External TTS/title requests can outlive the
    // OBS request timeout, leaving an unseen claim blocking the whole queue.
    // The overlay prepares speech via tts.php while it displays the donation.
    echo json_encode([$row], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    error_log('Overlay claim: ' . $e->getMessage());
    http_response_code(500); echo '[]';
}
