<?php
require __DIR__ . '/common.php';
try {
    $settings = donation_settings();
    respond(200, ['message_min'=>(int)$settings['message_min'], 'tier2_min'=>(int)$settings['tier2_min'], 'tier3_min'=>(int)$settings['tier3_min'],
        'music_min'=>(int)$settings['music_min'], 'music_seconds'=>(int)$settings['music_seconds'], 'music_enabled'=>(bool)$settings['music_enabled']]);
} catch (Throwable $error) { respond(503,['error'=>'Vui lòng đăng nhập admin một lần để hoàn tất cập nhật.']); }
