<?php
$newWheel = ['id'=>0, 'name'=>'', 'minimum'=>10000, 'active'=>1, 'options_json'=>'[]'];
?>
<section class="panel">
  <h2>Thiết lập vòng quay</h2>
  <p>Mỗi dòng là một ô. Chỉ nhập tên để chia đều 100% giữa các ô. Muốn tự đặt tỉ lệ, nhập dạng <code>Tên ô | 50</code> cho từng dòng sao cho tổng bằng 100%.</p>
  <p><a href="overlay.html?preview=1&amp;roulette=1&amp;autoplay=1" target="_blank" rel="noopener">Xem thử hiệu ứng OBS</a></p>
  <?php foreach (array_merge([$newWheel], $wheels ?? []) as $wheel):
    $options = json_decode($wheel['options_json'], true) ?: [];
    $lines = [];
    $equal = true;
    foreach ($options as $index => $option) {
        $count = count($options);
        $equal = $equal && $option['weight'] === intdiv(10000, $count) + (int)($index < 10000 % $count);
    }
    foreach ($options as $option) $lines[] = $option['label'] . ($equal ? '' : ' | ' . ($option['weight'] / 100));
  ?>
  <details <?=!$wheel['id'] ? 'open' : ''?>>
    <summary><?=h($wheel['name'] ?: 'Tạo vòng quay mới')?><?=$wheel['id'] && !$wheel['active'] ? ' · Đã đóng' : ''?></summary>
    <form method="post">
      <?php csrf_field(); ?>
      <input type="hidden" name="action" value="save_roulette">
      <input type="hidden" name="id" value="<?=h($wheel['id'])?>">
      <label>Tên vòng quay <input name="name" maxlength="100" required value="<?=h($wheel['name'])?>"></label>
      <label>Donate tối thiểu (VNĐ) <input name="minimum" type="number" min="1000" max="50000000" required value="<?=h($wheel['minimum'])?>"></label>
      <label>Các ô (từ 1 đến 16 ô) <textarea name="options" rows="5" maxlength="1200" required><?=h(implode("\n", $lines))?></textarea></label>
      <label><input type="checkbox" name="active" <?=$wheel['active'] ? 'checked' : ''?>> Mở nhận lượt quay</label>
      <button>Lưu vòng quay</button>
    </form>
  </details>
  <?php endforeach ?>
</section>
