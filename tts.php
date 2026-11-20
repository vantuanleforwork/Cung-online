<?php
require __DIR__ . '/speech.php';
if (!hash_equals(OVERLAY_KEY, $_GET['k'] ?? '')) respond(403, ['error' => 'Sai khóa overlay.']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Chỉ hỗ trợ POST.']);
$in = input_json(2048);
$metadata = [];
try {
    $db = db();
    $settings = $db->query('SELECT * FROM app_settings WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    if (!$settings) respond(200, ['disabled' => true]);
    if (($in['preview'] ?? false) === true) {
        if (!$settings['speech_enabled']) respond(200, ['disabled' => true]);
        if (!in_array($settings['speech_provider'], ['fpt','elevenlabs','custom_api'], true)) {
            if (custom_api_key($db, $settings['custom_api_url'] ?? 'https://api.vibi.pro/v1') !== '') {
                $settings['speech_provider'] = 'custom_api';
            } elseif (eleven_api_key($db) !== '') {
                $settings['speech_provider'] = 'elevenlabs';
            }
        }
        $row = preview_donation();
        if (isset($in['tier']) && in_array((int)$in['tier'], [1, 2, 3], true)) {
            $row['tier'] = (int)$in['tier'];
            $row['paid_amount'] = [1 => (int)donation_settings()['message_min'], 2 => (int)donation_settings()['tier2_min'], 3 => (int)donation_settings()['tier3_min']][$row['tier']];
        } elseif (isset($in['amount']) && (int)$in['amount'] >= 1000) {
            $row['paid_amount'] = (int)$in['amount'];
            $row['tier'] = donation_tier($row['paid_amount']);
        }
        $vId = trim((string)($in['voice_id'] ?? $in['selected_voice_id'] ?? ''));
        if ($vId !== '') {
            $row['selected_voice_id'] = $vId;
        }
        if (!empty($in['message'])) {
            $row['message'] = trim((string)$in['message']);
        }
        if (!empty($in['name'])) {
            $row['name'] = trim((string)$in['name']);
        }
        if (($in['roulette_preview'] ?? false) === true) {
            $row['roulette'] = ['name'=>'Thử thách mẫu', 'options'=>['Thêm một thử thách'], 'winner'=>0];
        }
    } else {
        $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT); $token = $in['claim_token'] ?? '';
        if (!$id || !is_string($token)) respond(400, ['error' => 'Thiếu lượt phát.']);
        $s = $db->prepare("SELECT d.*,q.id AS music_request_id,q.title AS music_title
            FROM donations d LEFT JOIN music_requests q ON q.donation_id=d.id
            WHERE d.id=? AND d.claim_token=? AND d.status='paid' AND d.shown=0 AND d.queue_state='queued' AND d.claimed_until>NOW()");
        $s->execute([$id, $token]); $row = $s->fetch(PDO::FETCH_ASSOC);
        if (!$row) respond(409, ['error' => 'Lượt phát đã hết hạn.']);
        if ($row['donation_kind'] === 'roulette' && (int)$row['paid_amount'] >= (int)$row['required_amount']) {
            $row['roulette'] = roulette_spin($db, (int)$row['id']);
        }
        if ($row['donation_kind'] === 'music' && $row['music_request_id'] && $row['music_title'] === '') {
            try {
                $pending = false;
                $row['music_title'] = refresh_music_title($db, (int)$row['music_request_id'], false, $pending) ?? '';
                if ($pending) respond(202, ['audio_url' => null]);
            } catch (Throwable $error) {
                error_log('Donate music title: ' . $error->getMessage());
            }
        }
    }
    $text = speech_text($row, $settings);
    $music = ($row['donation_kind'] ?? '') === 'music';
    $metadata = $music ? ['music_title' => $row['music_title'] ?? '', 'speech_text' => $text] : [];
    $options = speech_options_for_donation($settings, $row);
    if (!$options['enabled'] || $options['volume'] === 0.0) respond(200, $metadata + ['disabled' => true]);
    if (!in_array($options['provider'], ['fpt','elevenlabs','custom_api'], true)) {
        if ($music) respond(200, $metadata);
        respond(400, ['error' => 'Chọn Custom API Voice, ElevenLabs hoặc FPT.AI trong admin.']);
    }
    $url = provider_audio($db, $text, $options, null, null, ($in['refresh_audio'] ?? false) === true);
    respond($url === null ? 202 : 200, $metadata + ['audio_url' => $url]);
} catch (Throwable $e) {
    error_log('TTS: ' . $e->getMessage());
    respond(503, $metadata + ['error' => $e instanceof SpeechProviderException ? $e->getMessage() : 'Chưa tạo được giọng đọc. Kiểm tra API key, cURL, Voice ID và hạn mức; có thể xóa bộ nhớ giọng trong admin để thử lại.']);
}
