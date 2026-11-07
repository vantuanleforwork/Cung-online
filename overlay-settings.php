<?php
require __DIR__ . '/speech.php';
if (!hash_equals(OVERLAY_KEY, $_GET['k'] ?? '')) respond(403, ['error' => 'Sai khóa overlay.']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Chỉ hỗ trợ POST.']);
$in = input_json(2048);
try {
    $settings = db()->query('SELECT * FROM app_settings WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    if (!$settings) throw new RuntimeException('Missing settings');
    $demo = preview_donation();
    $tier = isset($in['tier']) && in_array((int)$in['tier'], [1, 2, 3], true) ? (int)$in['tier'] : (int)($_GET['tier'] ?? 1);
    if (in_array($tier, [1, 2, 3], true)) {
        $demo['tier'] = $tier;
        $demo['paid_amount'] = [1 => (int)donation_settings()['message_min'], 2 => (int)donation_settings()['tier2_min'], 3 => (int)donation_settings()['tier3_min']][$tier];
    }
    $vId = trim((string)($in['voice_id'] ?? $_GET['voice_id'] ?? $_GET['voice'] ?? ''));
    if ($vId !== '') {
        $demo['selected_voice_id'] = $vId;
    }
    $demo['speech'] = speech_options_for_donation($settings, $demo);
    $demo['speech_text'] = speech_text($demo, $settings);
    respond(200, ['demo' => $demo]);
} catch (Throwable $e) { error_log('Overlay settings: ' . $e->getMessage()); respond(500, ['error' => 'Chưa đọc được cấu hình giọng. Kiểm tra migration 003.']); }
