<?php if (empty($loggedIn)) { http_response_code(403); exit; } ?>
<section class="revenue-panel" aria-labelledby="revenueTitle">
  <h2 id="revenueTitle">Doanh thu donate</h2>
  <nav class="revenue-tabs" aria-label="Khoảng thống kê">
    <?php foreach (['day'=>'Ngày','month'=>'Tháng','year'=>'Năm','range'=>'Khoảng ngày'] as $periodKey=>$periodLabel): ?>
      <a href="?view=revenue&amp;period=<?=h($periodKey)?>" <?=$periodKey===$revenuePeriod ? 'aria-current="page"' : ''?>><?=h($periodLabel)?></a>
    <?php endforeach ?>
  </nav>
  <form method="get" class="bar revenue-filter">
    <input type="hidden" name="view" value="revenue"><input type="hidden" name="period" value="<?=h($revenuePeriod)?>">
    <?php if ($revenuePeriod==='range'): ?>
      <label>Từ ngày<input type="date" name="from" value="<?=h($revenueFrom)?>" min="2000-01-01" max="2100-12-31" required></label>
      <label>Đến ngày<input type="date" name="to" value="<?=h($revenueTo)?>" min="2000-01-01" max="2100-12-31" required></label>
    <?php else: ?>
      <label>Chọn <?=h(['day'=>'ngày','month'=>'tháng','year'=>'năm'][$revenuePeriod])?>
        <input type="<?=h(['day'=>'date','month'=>'month','year'=>'number'][$revenuePeriod])?>" name="date" value="<?=h($revenueDate)?>" <?=$revenuePeriod==='year' ? 'min="2000" max="2100"' : ''?> required>
      </label>
    <?php endif ?><button type="submit">Xem thống kê</button>
  </form>
  <div class="revenue-summary"><p class="muted">Tổng doanh thu · <?=h($revenueDate)?></p>
    <strong id="revenueTotal"><?=number_format($revenueTotal,0,',','.')?><small> đ</small></strong>
    <p><?=number_format($revenueCount,0,',','.')?> lượt donate <span class="muted">· Trung bình <?=number_format($revenueCount ? $revenueTotal/$revenueCount : 0,0,',','.')?>đ / lượt</span></p>
  </div>
  <p class="muted">Tính các lượt đã thanh toán theo giờ Việt Nam. Lượt test được loại khỏi thống kê.</p>
  <section class="revenue-chart" aria-labelledby="revenueChartTitle">
    <div class="revenue-chart-heading"><h3 id="revenueChartTitle">Biểu đồ doanh thu</h3><span class="muted">Rê chuột, chạm hoặc chọn cột để xem số tiền</span></div>
    <?php if ($revenuePeriod==='range' && $revenueGrouping==='month'): ?><p class="muted">Khoảng trên 366 ngày được gộp theo tháng.</p><?php endif ?>
    <div class="revenue-chart-body">
      <div class="revenue-chart-scale" aria-hidden="true"><span><?=number_format($revenuePeak,0,',','.')?>đ</span><span><?=number_format($revenuePeak/2,0,',','.')?>đ</span><span>0đ</span></div>
      <div class="revenue-chart-scroll" tabindex="0" role="region" aria-label="Biểu đồ doanh thu, cuộn ngang để xem thêm">
        <div class="revenue-chart-columns" style="--bar-count:<?=count($revenueRows)?>">
        <?php foreach ($revenueRows as $revenueRow): $height=$revenuePeak>0 ? max(0, min(100,$revenueRow['amount']/$revenuePeak*100)) : 0; ?>
          <div class="revenue-chart-column">
            <button type="button" class="revenue-chart-bar" data-label="<?=h($revenueRow['bucket'])?>" data-amount="<?=$revenueRow['amount']?>" data-count="<?=$revenueRow['donations']?>" aria-describedby="revenueChartTooltip" aria-label="<?=h($revenueRow['bucket'].' · '.number_format($revenueRow['amount'],0,',','.').' đồng · '.$revenueRow['donations'].' lượt')?>">
              <span style="height:<?=round($height,4)?>%" <?=$revenueRow['amount']===0?'class="is-zero"':''?>></span>
            </button>
            <span class="revenue-chart-label" aria-hidden="true"><?=h($revenueRow['short_label'])?></span>
          </div>
        <?php endforeach ?>
        </div>
      </div>
    </div>
    <div id="revenueChartTooltip" class="revenue-chart-tooltip" role="tooltip" hidden></div>
    <?php if (!$revenueCount): ?><p class="muted">Chưa có doanh thu trong thời gian này.</p><?php endif ?>
  </section>
  <div class="scroll"><table><thead><tr><th><?=h(['hour'=>'Giờ','day'=>'Ngày','month'=>'Tháng'][$revenueGrouping])?></th><th>Số lượt</th><th>Doanh thu</th></tr></thead><tbody>
  <?php foreach ($revenueRows as $revenueRow): ?><tr><td><?=h($revenueRow['bucket'])?></td><td><?=h($revenueRow['donations'])?></td><td><?=number_format((int)$revenueRow['amount'],0,',','.')?>đ</td></tr><?php endforeach ?>
  <?php if (!$revenueCount): ?><tr><td colspan="3" class="muted">Chưa có doanh thu trong thời gian này.</td></tr><?php endif ?>
  </tbody></table></div>
</section>
