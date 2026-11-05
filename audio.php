<?php
require __DIR__ . '/common.php';
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET','HEAD'], true)) { http_response_code(405); exit; }
$file = $_GET['file'] ?? ''; $expires = $_GET['expires'] ?? ''; $sig = $_GET['sig'] ?? '';
if (!is_string($file) || !preg_match('/^[a-f0-9]{64}$/D', $file) || !is_string($expires) || !ctype_digit($expires) ||
    (int)$expires < time() || (int)$expires > time() + 3700 || !is_string($sig) ||
    !hash_equals(hash_hmac('sha256', 'tts-audio|' . $file . '|' . $expires, OVERLAY_KEY), $sig)) {
    http_response_code(403); exit;
}
try {
    $s = db()->prepare("SELECT audio_content FROM tts_audio_cache WHERE cache_key=? AND state='ready' AND audio_content IS NOT NULL");
    $s->execute([$file]); $audio = $s->fetchColumn();
    if (!is_string($audio) || $audio === '') { http_response_code(404); exit; }
    $length = strlen($audio); $start = 0; $end = $length - 1;
    if (isset($_SERVER['HTTP_RANGE'])) {
        $range = $_SERVER['HTTP_RANGE'];
        if (!preg_match('/^bytes=(\d*)-(\d*)$/D', $range, $m) || ($m[1] === '' && $m[2] === '')) {
            header('Content-Range: bytes */' . $length); http_response_code(416); exit;
        }
        if ($m[1] === '') { $start = max(0, $length - (int)$m[2]); }
        else { $start = (int)$m[1]; if ($m[2] !== '') $end = min($end, (int)$m[2]); }
        if ($start > $end || $start >= $length) { header('Content-Range: bytes */' . $length); http_response_code(416); exit; }
        http_response_code(206); header("Content-Range: bytes $start-$end/$length");
    }
    header('Content-Type: audio/mpeg'); header('Accept-Ranges: bytes'); header('Content-Length: ' . ($end - $start + 1));
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') echo substr($audio, $start, $end - $start + 1);
} catch (Throwable $e) { error_log('TTS audio: ' . $e->getMessage()); http_response_code(500); }
