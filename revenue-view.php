<?php if (empty($loggedIn)) { http_response_code(403); exit; } ?>
<section class="revenue-panel" aria-labelledby="revenueTitle">
  <h2 id="revenueTitle">Doanh thu donate</h2>
  <nav class="revenue-tabs" aria-label="Khoảng thống kê">
    <?php foreach (['day'=>'Ngày','month'=>'Tháng','year'=>'Năm'] as $periodKey=>$periodLabel): ?>
      <a href="?view=revenue&amp;period=<?=h($periodKey)?>" <?=$periodKey===$revenuePeriod ? 'aria-current="page"' : ''?>><?=h($periodLabel)?></a>
    <?php endforeach ?>
  </nav>
  <form method="get" class="bar revenue-filter">
    <input type="hidden" name="view" value="revenue"><input type="hidden" name="period" value="<?=h($revenuePeriod)?>">
    <label>Chọn <?=h(['day'=>'ngày','month'=>'tháng','year'=>'năm'][$revenuePeriod])?>
      <input type="<?=h(['day'=>'date','month'=>'month','year'=>'number'][$revenuePeriod])?>" name="date" value="<?=h($revenueDate)?>" <?=$revenuePeriod==='year' ? 'min="2000" max="2100"' : ''?> required>
    </label><button type="submit">Xem thống kê</button>
  </form>
  <div class="revenue-summary"><p class="muted">Tổng doanh thu · <?=h($revenueDate)?></p>
    <strong id="revenueTotal"><?=number_format($revenueTotal,0,',','.')?><small> đ</small></strong>
    <p><?=number_format($revenueCount,0,',','.')?> lượt donate <span class="muted">· Trung bình <?=number_format($revenueCount ? $revenueTotal/$revenueCount : 0,0,',','.')?>đ / lượt</span></p>
  </div>
  <p class="muted">Tính các lượt đã thanh toán theo giờ Việt Nam. Lượt test được loại khỏi thống kê.</p>
  <div class="scroll"><table><thead><tr><th><?=h(['day'=>'Giờ','month'=>'Ngày','year'=>'Tháng'][$revenuePeriod])?></th><th>Số lượt</th><th>Doanh thu</th></tr></thead><tbody>
  <?php foreach ($revenueRows as $revenueRow): ?><tr><td><?=h($revenueRow['bucket'])?></td><td><?=h($revenueRow['donations'])?></td><td><?=number_format((int)$revenueRow['amount'],0,',','.')?>đ</td></tr><?php endforeach ?>
  <?php if (!$revenueRows): ?><tr><td colspan="3" class="muted">Chưa có doanh thu trong thời gian này.</td></tr><?php endif ?>
  </tbody></table></div>
</section>
