<?php
require __DIR__ . '/speech.php';
if (!hash_equals(OVERLAY_KEY, $_GET['k'] ?? '')) respond(403, ['error' => 'Sai khóa overlay.']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Chỉ hỗ trợ POST.']);
try {
    $settings = db()->query('SELECT * FROM app_settings WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    if (!$settings) throw new RuntimeException('Missing settings');
    $demo = preview_donation();
    $demo['speech'] = speech_options($settings); $demo['speech_text'] = speech_text($demo, $settings);
    respond(200, ['demo' => $demo]);
} catch (Throwable $e) { error_log('Overlay settings: ' . $e->getMessage()); respond(500, ['error' => 'Chưa đọc được cấu hình giọng. Kiểm tra migration 003.']); }
