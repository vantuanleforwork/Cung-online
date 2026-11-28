<?php
if (empty($loggedIn)) { http_response_code(403); exit; }
$options = pk_options($db, false);
?>
<section class="speech-panel" aria-labelledby="pkAdminTitle">
  <h2 id="pkAdminTitle">Cấu hình option PK</h2>
  <p class="muted">Mỗi option là một bên thi đấu. Tải ảnh đại diện, đặt thứ tự hiển thị và bật những option đang nhận donate.</p>
  <p><a href="overlay.html?preview=1&amp;pk=1&amp;autoplay=1" target="_blank" rel="noopener">Xem thử khung PK lớn và khung PK nhỏ ↗</a></p>
  <?php foreach (array_merge($options, [['id'=>0,'name'=>'','image_path'=>'','active'=>1,'sort_order'=>count($options)]]) as $option): ?>
  <form method="post" enctype="multipart/form-data" class="pk-option-editor">
    <?php csrf_field(); ?><input type="hidden" name="action" value="save_pk_option"><input type="hidden" name="id" value="<?=h($option['id'])?>">
    <div class="speech-grid">
      <label>Tên option<input name="name" maxlength="80" required value="<?=h($option['name'])?>" placeholder="Ví dụ: Đội Rồng"></label>
      <label>Thứ tự<input name="sort_order" type="number" min="0" max="999" value="<?=h($option['sort_order'])?>"></label>
    </div>
    <label>Ảnh option (JPG, PNG, GIF, WebP · tối đa 2 MB)<input type="file" name="image" accept="image/jpeg,image/png,image/gif,image/webp"></label>
    <?php if ($option['image_path']): ?><img src="<?=h($option['image_path'])?>" alt="<?=h($option['name'])?>" width="120" height="90" style="object-fit:cover;border-radius:12px" loading="lazy"><?php endif ?>
    <label><input type="checkbox" name="active" <?=$option['active']?'checked':''?>> Đang mở cho người xem</label>
    <button type="submit"><?=$option['id'] ? 'Lưu option' : '＋ Thêm option'?></button>
    <?php if ($option['id']): ?><button type="submit" name="delete" value="1" formnovalidate>Xóa option</button><?php endif ?>
  </form>
  <?php endforeach ?>
</section>
