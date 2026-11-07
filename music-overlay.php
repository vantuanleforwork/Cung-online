<?php
require __DIR__ . '/common.php';
if (!hash_equals(OVERLAY_KEY, $_GET['k'] ?? '')) respond(403,['error'=>'Sai khóa OBS.']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405,['error'=>'Chỉ hỗ trợ POST.']);
try { respond(200,music_heartbeat(db(),input_json(4096))); }
catch (InvalidArgumentException $error) { respond(400,['error'=>$error->getMessage()]); }
catch (Throwable $error) { error_log('Music overlay: '.$error->getMessage()); respond(503,['error'=>'Chưa kết nối được trình phát nhạc.']); }
