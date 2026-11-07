<?php
require __DIR__ . '/common.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(405,['error'=>'Chỉ hỗ trợ GET.']);
try {
    $db = db();
    $settings = donation_settings($db);
    $rows = music_queue($db,$settings);
    $state = $db->query('SELECT paused FROM music_state WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    respond(200,['items'=>$rows,'paused'=>(bool)$state['paused'],'order'=>$settings['music_order']]);
} catch (Throwable $error) { respond(503,['error'=>'Chưa tải được hàng đợi nhạc.']); }
