<?php
if (empty($loggedIn)) { http_response_code(403); exit; }
$musicSettings = donation_settings($db);
$untitledId = music_untitled_id($db);
if ($untitledId) refresh_music_title($db,$untitledId);
$musicRows = music_queue($db,$musicSettings);
$musicState = $db->query('SELECT paused FROM music_state WHERE id=1')->fetch(PDO::FETCH_ASSOC);
?>
<section class="settings-workspace"><h2>Hàng đợi nhạc</h2>
<p class="muted">Mọi bài nhạc phải được duyệt trước khi OBS phát. Hãy kiểm tra quyền sử dụng trên livestream; một video phát được trên YouTube vẫn có thể khiến livestream bị ngắt. Làm mới trang để cập nhật danh sách.</p>
<div class="bar"><strong><?=$musicState['paused']?'ĐANG DỪNG':'SẴN SÀNG PHÁT'?></strong>
<?php action_form($musicState['paused']?'music_resume':'music_pause',[],$musicState['paused']?'Tiếp tục':'Dừng / tạm dừng'); action_form('music_next',[],'Bài tiếp theo'); ?></div>
<form method="post" class="bar">
<?php csrf_field() ?><input type="hidden" name="action" value="music_add">
<label>Thêm bài thủ công bằng link YouTube<input type="url" name="music_url" maxlength="2048" placeholder="https://www.youtube.com/watch?v=… hoặc https://youtu.be/…" required></label>
<button type="submit">Thêm bài chờ duyệt</button>
</form>
<div class="scroll"><table><thead><tr><th>Bài nhạc / người gửi</th><th>Số tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
<?php foreach ($musicRows as $song): ?><tr><td><a data-music-id="<?=h($song['id'])?>" href="https://www.youtube.com/watch?v=<?=h($song['video_id'])?>" target="_blank" rel="noopener noreferrer"><?=h($song['title'] ?: 'Đang lấy tên bài…')?></a><br><strong><?=h($song['name'])?></strong><p><?=h($song['message'])?></p></td><td><?=$song['donation_id']===null?'Thêm thủ công':number_format((int)$song['paid_amount'],0,',','.').'đ'?></td><td><?=$song['state']==='playing'?'Đang phát':(!$song['approved']?'Chờ duyệt quyền phát':'Chờ phát')?></td><td><?php if (!$song['approved'] && $song['state']==='waiting'): ?><?php action_form('music_approve',['id'=>$song['id']],'Duyệt phát (đã kiểm tra quyền)'); ?><?php endif ?><?php action_form('music_remove',['id'=>$song['id']],'Gỡ bài'); ?></td></tr><?php endforeach ?>
<?php if (!$musicRows): ?><tr><td colspan="4" class="muted">Chưa có bài nhạc trong hàng đợi.</td></tr><?php endif ?>
</tbody></table></div></section>
