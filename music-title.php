<?php
require __DIR__ . '/common.php';
if (!hash_equals(OVERLAY_KEY,$_GET['k'] ?? '')) respond(403,['error'=>'Sai khóa OBS.']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405,['error'=>'Chỉ hỗ trợ POST.']);
$input = input_json(1024);
$id = filter_var($input['id'] ?? null,FILTER_VALIDATE_INT);
if (!$id || $id<1) respond(400,['error'=>'Bài nhạc không hợp lệ.']);
try {
    $db = db();
    $query = $db->prepare("SELECT q.video_id,q.title FROM music_requests q JOIN donations d ON d.id=q.donation_id WHERE q.id=? AND q.state IN ('waiting','playing') AND d.status='paid' AND d.is_test=0");
    $query->execute([$id]);
    $song = $query->fetch(PDO::FETCH_ASSOC);
    if (!$song) respond(404,['error'=>'Bài nhạc không còn trong hàng đợi.']);
    $title = $song['title'];
    if ($title === '' && function_exists('curl_init')) {
        $url = 'https://www.youtube.com/oembed?format=json&url='.rawurlencode('https://www.youtube.com/watch?v='.$song['video_id']);
        $http = curl_init($url);
        $body = '';
        curl_setopt_array($http,[CURLOPT_CONNECTTIMEOUT=>2,CURLOPT_TIMEOUT=>4,CURLOPT_FOLLOWLOCATION=>false,
            CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_WRITEFUNCTION=>static function($handle,$chunk) use (&$body) {
                if (strlen($body)+strlen($chunk)>65536) return 0;
                $body .= $chunk; return strlen($chunk);
            }]);
        $ok = curl_exec($http);
        $status = curl_getinfo($http,CURLINFO_HTTP_CODE);
        curl_close($http);
        $data = $ok && $status===200 ? json_decode($body,true) : null;
        if (is_string($data['title'] ?? null)) {
            $title = clean($data['title'],200);
            $db->prepare("UPDATE music_requests SET title=? WHERE id=? AND title=''")->execute([$title,$id]);
        }
    }
    respond(200,['id'=>$id,'title'=>$title]);
} catch (Throwable $error) { respond(503,['error'=>'Chưa lấy được tên bài nhạc.']); }
