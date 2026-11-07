<?php
require __DIR__ . '/common.php';
if (!hash_equals(OVERLAY_KEY,$_GET['k'] ?? '')) respond(403,['error'=>'Sai khóa OBS.']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405,['error'=>'Chỉ hỗ trợ POST.']);
$input = input_json(1024);
$id = filter_var($input['id'] ?? null,FILTER_VALIDATE_INT);
if (!$id || $id<1) respond(400,['error'=>'Bài nhạc không hợp lệ.']);
try {
    $title = refresh_music_title(db(),$id);
    if ($title === null) respond(404,['error'=>'Bài nhạc không còn trong hàng đợi.']);
    respond(200,['id'=>$id,'title'=>$title]);
} catch (Throwable $error) { respond(503,['error'=>'Chưa lấy được tên bài nhạc.']); }
