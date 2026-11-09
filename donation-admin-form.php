<?php
if (empty($loggedIn)) { http_response_code(403); exit; }
$donate = donation_settings($db);
$donateSound = donate_sound_url();
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
      <h3>Khung nhạc chờ</h3>
      <label><input type="checkbox" name="music_idle_enabled" <?=$donate['music_idle_enabled']?'checked':''?>> Luôn hiển thị khung nhạc chờ khi chưa có bài</label>
      <label>Nội dung mời order nhạc<textarea name="music_idle_message" maxlength="300" rows="3"><?=h($donate['music_idle_message'])?></textarea></label>
      <p class="muted">Khung chờ xuất hiện khi bật donate phát nhạc và hàng đợi trống. Khi có bài, khung tự chuyển sang trình phát.</p>
      <h3>Vị trí và kích thước trong OBS</h3>
      <p class="muted">Khung 1920 × 1080. Kéo trình phát trong preview hoặc nhập thông số. Widget hiển thị tên bài, tiến độ và bài sắp phát. Vùng video được đặt trong suốt hoàn toàn.</p>
      <div class="speech-grid">
      <?php foreach (['music_x'=>['Cách trái X',0,1680], 'music_y'=>['Cách trên Y',0,940], 'music_width'=>['Chiều rộng',240,960], 'music_height'=>['Chiều cao',140,700]] as $key=>[$label,$min,$max]): ?>
        <label><?=h($label)?> (px)<input type="number" name="<?=h($key)?>" min="<?=$min?>" max="<?=$max?>" required value="<?=h($donate[$key])?>"></label>
      <?php endforeach ?>
      </div>
      <label>Xem trước<select name="music_preview_state"><option value="playing">Đang phát nhạc</option><option value="idle">Chờ order nhạc</option></select></label>
      <div class="preview-iframe-wrapper"><iframe id="musicPositionPreview" src="music-preview.html?v=36" title="Preview vị trí và kích thước trình phát nhạc"></iframe></div>
      <p class="muted">Nhạc chỉ xếp hàng khi thanh toán đủ mức tối thiểu. Video bị chặn nhúng hoặc lỗi sẽ được bỏ qua. Bài đang phát hoàn tất trước khi áp dụng thứ tự mới.</p>
    </section>
    <button type="submit">Lưu cài đặt donate</button>
  </form>
  <section class="speech-panel" aria-labelledby="donateSoundTitle">
    <h3 id="donateSoundTitle">Âm thanh donate</h3>
    <p class="muted">Tệp MP3 tối đa 2 MB. OBS phát tối đa 10 giây đầu làm tiếng báo donate.</p>
    <?php if ($donateSound): ?>
      <audio controls preload="none" src="<?=h($donateSound)?>" aria-label="Nghe thử âm thanh donate đã lưu"></audio>
    <?php else: ?>
      <p class="muted">Đang dùng âm thanh mặc định.</p>
    <?php endif ?>
    <form method="post" enctype="multipart/form-data">
      <?php csrf_field() ?>
      <input type="hidden" name="action" value="upload_donate_sound">
      <label>Chọn tệp MP3 <input type="file" name="donate_sound" accept=".mp3,audio/mpeg" required></label>
      <button type="submit">Lưu âm thanh</button>
    </form>
    <?php if ($donateSound) action_form('reset_donate_sound', [], 'Dùng lại âm thanh mặc định'); ?>
  </section>
  <section class="speech-panel" aria-labelledby="donorSkinTitle">
    <h3 id="donorSkinTitle">Skin</h3>
    <p class="muted">Skin mới xuất hiện trong hồ sơ donate. Người dùng mở khóa theo cấp và chọn một skin để hiển thị trên OBS.</p>
    <form method="post" enctype="multipart/form-data">
      <?php csrf_field() ?>
      <input type="hidden" name="action" value="upload_donor_skin">
      <div class="speech-grid">
        <label>Tên skin <input name="skin_name" maxlength="60" required></label>
        <label>Tệp GIF <input type="file" name="skin_gif" accept=".gif,image/gif" required></label>
      </div>
      <p class="muted">Tối đa 2 MB và 1024 × 1024 px.</p>
      <button type="submit">Thêm skin</button>
    </form>
    <h4>Skin hiện có</h4>
    <?php $skinCatalog = donor_skin_catalog($db); ?>
    <?php if (!$skinCatalog): ?><p class="muted">Chưa có skin nào.</p><?php endif ?>
    <ul class="admin-skin-list">
      <?php foreach ($skinCatalog as $key=>$skin): ?>
        <li>
          <img src="<?=h($skin['url'])?>" alt="" width="48" height="48" loading="lazy"><span><?=h($skin['name'])?></span>
          <form method="post" onsubmit="return confirm('Xóa skin này khỏi hồ sơ donate và OBS? Người dùng đã mở khóa sẽ lấy lại lượt chọn.')">
            <?php csrf_field() ?>
            <input type="hidden" name="action" value="remove_donor_skin">
            <input type="hidden" name="skin_key" value="<?=h($key)?>">
            <button type="submit" aria-label="<?=h('Xóa skin '.$skin['name'])?>">Xóa</button>
          </form>
        </li>
      <?php endforeach ?>
    </ul>
  </section>
</section>
