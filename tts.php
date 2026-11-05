<?php
require __DIR__ . '/speech.php';
if (!hash_equals(OVERLAY_KEY, $_GET['k'] ?? '')) respond(403, ['error' => 'Sai khóa overlay.']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Chỉ hỗ trợ POST.']);
$in = input_json(2048);
try {
    $db = db();
    $settings = $db->query('SELECT * FROM app_settings WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    if (!$settings || !$settings['speech_enabled']) respond(200, ['disabled' => true]);
    if (!in_array($settings['speech_provider'], ['fpt','elevenlabs','custom_api'], true)) respond(400, ['error' => 'Chọn Custom API Voice, ElevenLabs hoặc FPT.AI trong admin.']);
    if (($in['preview'] ?? false) === true) $row = preview_donation();
    else {
        $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT); $token = $in['claim_token'] ?? '';
        if (!$id || !is_string($token)) respond(400, ['error' => 'Thiếu lượt phát.']);
        $s = $db->prepare("SELECT * FROM donations WHERE id=? AND claim_token=? AND status='paid' AND shown=0 AND queue_state='queued' AND claimed_until>NOW()");
        $s->execute([$id, $token]); $row = $s->fetch(PDO::FETCH_ASSOC);
        if (!$row) respond(409, ['error' => 'Lượt phát đã hết hạn.']);
    }
    $url = provider_audio($db, speech_text($row, $settings), speech_options($settings));
    respond($url === null ? 202 : 200, ['audio_url' => $url]);
} catch (Throwable $e) {
    error_log('TTS: ' . $e->getMessage());
    respond(503, ['error' => $e instanceof SpeechProviderException ? $e->getMessage() : 'Chưa tạo được giọng đọc. Kiểm tra API key, cURL, Voice ID và hạn mức; có thể xóa bộ nhớ giọng trong admin để thử lại.']);
}
