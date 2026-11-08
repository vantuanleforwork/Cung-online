<?php
$savedWheels = $wheels ?? [];
$newWheel = ['id'=>0, 'name'=>'', 'minimum'=>10000, 'active'=>1, 'options_json'=>'[{"label":"","frequency":1}]'];
$renderOption = static function (array $option, int $total): void {
    $percentage = $total ? 100 * $option['frequency'] / $total : 0;
?>
    <div class="roulette-option" data-roulette-row>
      <input name="option_label[]" aria-label="Tên kết quả" placeholder="Tên kết quả" maxlength="48" required value="<?=h($option['label'])?>">
      <input name="option_frequency[]" aria-label="Tần suất" type="number" inputmode="numeric" min="0" max="10000" step="1" required value="<?=h($option['frequency'])?>">
      <span data-roulette-percent><?=h(rtrim(rtrim(number_format($percentage, 2, ',', ''), '0'), ','))?>%</span>
      <button type="button" class="roulette-secondary roulette-remove" data-roulette-remove aria-label="Xóa kết quả" title="Xóa kết quả" disabled>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 3v7m4-7v7"/></svg>
      </button>
    </div>
<?php }; ?>
<section class="roulette-admin" aria-labelledby="rouletteAdminTitle">
  <div class="roulette-admin-heading">
    <div><h2 id="rouletteAdminTitle">Vòng quay đã lưu</h2><p class="muted">Chọn vòng để chỉnh sửa hoặc gửi lượt thử vào hàng đợi OBS.</p></div>
    <a href="overlay.html?preview=1&amp;roulette=1&amp;autoplay=1" target="_blank" rel="noopener">Xem thử hiệu ứng</a>
  </div>
  <?php if (!$savedWheels): ?><p class="muted">Chưa có vòng quay. Tạo vòng đầu tiên bên dưới.</p><?php endif ?>
  <?php foreach (array_merge($savedWheels, [$newWheel]) as $wheel):
    $saved = (int)$wheel['id'] > 0;
    $options = roulette_options($wheel);
    $total = array_sum(array_column($options, 'frequency'));
  ?>
  <article class="roulette-admin-card">
    <?php if ($saved): ?>
    <header class="roulette-card-heading">
      <div>
        <h3><?=h($wheel['name'])?></h3>
        <div class="roulette-meta">
          <span class="roulette-badge <?=$wheel['active'] ? 'is-active' : ''?>"><?=$wheel['active'] ? 'Đang mở' : 'Đã đóng'?></span>
          <span><?=count($options)?> ô · Từ <?=number_format((int)$wheel['minimum'], 0, ',', '.')?>đ</span>
        </div>
      </div>
      <form method="post">
        <?php csrf_field(); ?>
        <input type="hidden" name="action" value="test_roulette_obs">
        <input type="hidden" name="id" value="<?=h($wheel['id'])?>">
        <button class="roulette-secondary" type="submit">Bắn test OBS</button>
      </form>
    </header>
    <?php endif ?>
    <details <?=!$saved && !$savedWheels ? 'open' : ''?>>
      <summary><?=$saved ? 'Chỉnh sửa vòng quay' : '＋ Tạo vòng quay mới'?></summary>
      <form method="post" data-roulette-editor>
        <?php csrf_field(); ?>
        <input type="hidden" name="action" value="save_roulette">
        <input type="hidden" name="id" value="<?=h($wheel['id'])?>">
        <div class="roulette-form-fields">
          <label>Tên vòng quay <input name="name" maxlength="100" required value="<?=h($wheel['name'])?>"></label>
          <label>Donate tối thiểu (VNĐ) <input name="minimum" type="number" min="1000" max="50000000" required value="<?=h($wheel['minimum'])?>"></label>
        </div>
        <fieldset class="roulette-options">
          <legend>Danh sách kết quả và tần suất</legend>
          <p class="muted">Các ô có cùng tần suất sẽ có cùng cơ hội. Tần suất 0 sẽ không trúng.</p>
          <div class="roulette-option roulette-column-head" aria-hidden="true">
            <span>Kết quả</span><span>Tần suất</span><span>%</span><span></span>
          </div>
          <div data-roulette-rows>
            <?php foreach ($options as $option) $renderOption($option, $total); ?>
          </div>
          <template data-roulette-template><?php $renderOption(['label'=>'', 'frequency'=>1], 1); ?></template>
          <div class="roulette-form-actions">
            <button class="roulette-secondary" type="button" data-roulette-add disabled>＋ Thêm kết quả</button>
          </div>
        </fieldset>
        <div class="roulette-form-actions roulette-save">
          <label><input type="checkbox" name="active" <?=$wheel['active'] ? 'checked' : ''?>> Mở nhận lượt quay</label>
          <button type="submit">Lưu vòng quay</button>
        </div>
      </form>
    </details>
  </article>
  <?php endforeach ?>
</section>
