<?php
if (empty($loggedIn)) { http_response_code(403); exit; }
$donate = donation_settings($db);
?>
<section data-tabs="donate" class="settings-workspace">
  <h2>Cài đặt donate</h2>
  <div class="workspace-tabs" role="tablist" aria-label="Cài đặt donate">
    <button type="button" role="tab" data-tab="message">Lời nhắn</button>
    <button type="button" role="tab" data-tab="music">Phát nhạc</button>
  </div>
  <form method="post" id="donationSettingsForm">
    <?php csrf_field() ?><input type="hidden" name="action" value="save_donation_settings">
    <section data-panel="message" role="tabpanel">
      <h3>Mức tiền và hiệu ứng lời nhắn</h3>
      <div class="speech-grid">
      <?php foreach (['message_min'=>'Số tiền donate tối thiểu (đ)','tier2_min'=>'Mốc rồng / mở chọn giọng (đ)','tier3_min'=>'Mốc tiên nữ / giọng VIP (đ)'] as $key=>$label): ?>
        <label><?=h($label)?><input type="number" name="<?=h($key)?>" min="1000" max="50000000" step="1" required value="<?=h($donate[$key])?>"></label>
      <?php endforeach ?>
      </div><p class="muted">Ba mức tăng dần. Thay đổi áp dụng cho đơn mới; mốc hiệu ứng được tính theo số tiền thực nhận.</p>
    </section>
    <section data-panel="music" role="tabpanel">
      <h3>Donate phát nhạc YouTube</h3>
      <label><input type="checkbox" name="music_enabled" <?=$donate['music_enabled']?'checked':''?>> Bật donate phát nhạc</label>
      <div class="speech-grid">
      <?php foreach (['music_min'=>['Số tiền tối thiểu (đ)',1000,50000000], 'music_seconds'=>['Thời lượng tối đa mỗi bài (giây)',10,3600], 'music_volume'=>['Âm lượng (%)',0,100], 'music_opacity'=>['Độ đậm nền trình phát (%)',0,100]] as $key=>[$label,$min,$max]): ?>
        <label><?=h($label)?><input type="number" name="<?=h($key)?>" min="<?=$min?>" max="<?=$max?>" required value="<?=h($donate[$key])?>"></label>
      <?php endforeach ?>
        <label>Thứ tự phát<select name="music_order"><option value="time" <?=$donate['music_order']==='time'?'selected':''?>>Thanh toán trước phát trước</option><option value="amount" <?=$donate['music_order']==='amount'?'selected':''?>>Số tiền cao trước, bằng tiền theo thời gian</option></select></label>
      </div>
      <h3>Vị trí và kích thước trong OBS</h3>
      <p class="muted">Khung 1920 × 1080. Kéo trình phát trong preview hoặc nhập thông số. Widget hiển thị tên bài, tiến độ và bài sắp phát. Vùng video được đặt trong suốt hoàn toàn.</p>
      <div class="speech-grid">
      <?php foreach (['music_x'=>['Cách trái X',0,1680], 'music_y'=>['Cách trên Y',0,940], 'music_width'=>['Chiều rộng',240,960], 'music_height'=>['Chiều cao',140,700]] as $key=>[$label,$min,$max]): ?>
        <label><?=h($label)?> (px)<input type="number" name="<?=h($key)?>" min="<?=$min?>" max="<?=$max?>" required value="<?=h($donate[$key])?>"></label>
      <?php endforeach ?>
      </div>
      <div class="preview-iframe-wrapper"><iframe id="musicPositionPreview" src="music-preview.html?v=34" title="Preview vị trí và kích thước trình phát nhạc"></iframe></div>
      <p class="muted">Nhạc chỉ xếp hàng khi thanh toán đủ mức tối thiểu. Video bị chặn nhúng hoặc lỗi sẽ được bỏ qua. Bài đang phát hoàn tất trước khi áp dụng thứ tự mới.</p>
    </section>
    <button type="submit">Lưu cài đặt donate</button>
  </form>
</section>
