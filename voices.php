<?php
require __DIR__ . '/speech.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

try {
    $db = db();
    $settings = $db->query('SELECT * FROM app_settings WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    if (!$settings) respond(500, ['error' => 'Chưa cấu hình hệ thống.']);
    
    $rows = $db->query('SELECT id, name, voice_id, tier_min FROM custom_voice_options ORDER BY tier_min ASC, id ASC')->fetchAll(PDO::FETCH_ASSOC);
    
    $tier2Voices = [];
    $tier3Voices = [];
    foreach ($rows as $r) {
        $item = ['id' => $r['voice_id'], 'name' => $r['name'], 'tier_min' => (int)$r['tier_min']];
        if ((int)$r['tier_min'] <= 2) {
            $tier2Voices[] = $item;
        }
        $tier3Voices[] = $item;
    }
    
    respond(200, [
        'speech_enabled' => (bool)$settings['speech_enabled'],
        'tier1' => [
            'min_amount' => 10000,
            'can_choose' => false,
            'default_voice_id' => $settings['tier1_voice_id'] ?? '',
            'hint' => 'Dưới 50k sử dụng giọng đọc mặc định'
        ],
        'tier2' => [
            'min_amount' => 50000,
            'can_choose' => true,
            'default_voice_id' => $settings['tier2_voice_id'] ?? '',
            'label' => 'Mở khóa mốc 50k',
            'voices' => $tier2Voices
        ],
        'tier3' => [
            'min_amount' => 200000,
            'can_choose' => true,
            'default_voice_id' => $settings['tier3_voice_id'] ?? '',
            'label' => 'Mở khóa VIP 200k',
            'voices' => $tier3Voices
        ]
    ]);
} catch (Throwable $e) {
    error_log('Voices list: ' . $e->getMessage());
    respond(500, ['error' => 'Chưa tải được danh sách giọng.']);
}

