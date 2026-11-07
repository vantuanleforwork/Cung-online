<?php
if (empty($loggedIn)) { http_response_code(403); exit; }
$musicSettings = donation_settings($db);
$musicRows = music_queue($db,$musicSettings);
$musicState = $db->query('SELECT paused FROM music_state WHERE id=1')->fetch(PDO::FETCH_ASSOC);
?>
<section class="settings-workspace"><h2>Hàng đợi nhạc</h2>
<p class="muted">Nhạc được phát qua nguồn OBS hiện tại. Làm mới trang để cập nhật danh sách.</p>
<div class="bar"><strong><?=$musicState['paused']?'ĐANG DỪNG':'SẴN SÀNG PHÁT'?></strong>
<?php action_form($musicState['paused']?'music_resume':'music_pause',[],$musicState['paused']?'Tiếp tục':'Dừng / tạm dừng'); action_form('music_next',[],'Bài tiếp theo'); ?></div>
<div class="scroll"><table><thead><tr><th>Bài nhạc / người gửi</th><th>Số tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
<?php foreach ($musicRows as $song): ?><tr><td><a href="https://www.youtube.com/watch?v=<?=h($song['video_id'])?>" target="_blank" rel="noopener noreferrer"><?=h($song['title'] ?: ('YouTube · '.$song['video_id']))?></a><br><strong><?=h($song['name'])?></strong><p><?=h($song['message'])?></p></td><td><?=number_format((int)$song['paid_amount'],0,',','.')?>đ</td><td><?=$song['state']==='playing'?'Đang phát':'Chờ phát'?></td><td><?php action_form('music_remove',['id'=>$song['id']],'Gỡ bài'); ?></td></tr><?php endforeach ?>
<?php if (!$musicRows): ?><tr><td colspan="4" class="muted">Chưa có bài nhạc trong hàng đợi.</td></tr><?php endif ?>
</tbody></table></div></section>
