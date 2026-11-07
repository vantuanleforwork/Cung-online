<?php
// Included only inside the authenticated admin branch.
if (empty($loggedIn)) { http_response_code(403); exit; }
$revenuePeriod = $_GET['period'] ?? 'day';
if (!is_string($revenuePeriod) || !in_array($revenuePeriod, ['day','month','year','range'], true)) {
    throw new InvalidArgumentException('Khoảng thống kê không hợp lệ.');
}
$revenueTimezone = new DateTimeZone('Asia/Ho_Chi_Minh');
$revenueNow = new DateTimeImmutable('now', $revenueTimezone);
$parseRevenueDate = static function ($value, string $format) use ($revenueTimezone): DateTimeImmutable {
    if (!is_string($value) || strlen($value)>10 || strpos($value, "\0")!==false) throw new InvalidArgumentException('Ngày thống kê không hợp lệ.');
    $date = DateTimeImmutable::createFromFormat('!' . $format, $value, $revenueTimezone);
    if (!$date || $date->format($format)!==$value || (int)$date->format('Y')<2000 || (int)$date->format('Y')>2100) {
        throw new InvalidArgumentException('Ngày thống kê không hợp lệ.');
    }
    return $date;
};
if ($revenuePeriod === 'range') {
    $revenueFrom = $_GET['from'] ?? $revenueNow->format('Y-m-01');
    $revenueTo = $_GET['to'] ?? $revenueNow->format('Y-m-d');
    $revenueStart = $parseRevenueDate($revenueFrom,'Y-m-d');
    $lastDate = $parseRevenueDate($revenueTo,'Y-m-d');
    if ($lastDate < $revenueStart) throw new InvalidArgumentException('Ngày đến phải bằng hoặc sau ngày bắt đầu.');
    $revenueEnd = $lastDate->modify('+1 day');
    $revenueDate = $revenueStart->format('d/m/Y') . ' — ' . $lastDate->format('d/m/Y');
    $revenueGrouping = $revenueStart->diff($revenueEnd)->days>366 ? 'month' : 'day';
} else {
    $format = ['day'=>'Y-m-d','month'=>'Y-m','year'=>'Y'][$revenuePeriod];
    $revenueDate = $_GET['date'] ?? $revenueNow->format($format);
    $revenueStart = $parseRevenueDate($revenueDate,$format);
    $revenueEnd = $revenueStart->modify(['day'=>'+1 day','month'=>'+1 month','year'=>'+1 year'][$revenuePeriod]);
    $revenueGrouping = ['day'=>'hour','month'=>'day','year'=>'month'][$revenuePeriod];
}
$sqlFormat = ['hour'=>'%Y-%m-%d %H','day'=>'%Y-%m-%d','month'=>'%Y-%m'][$revenueGrouping];
$query = $db->prepare("SELECT DATE_FORMAT(DATE_ADD('1970-01-01', INTERVAL (UNIX_TIMESTAMP(COALESCE(p.created_at,d.created_at))+25200) SECOND), '$sqlFormat') AS bucket_key,
    SUM(d.paid_amount) AS amount, COUNT(*) AS donations
    FROM donations d LEFT JOIN payment_transactions p ON p.tx_id=d.tx_id
    WHERE d.status='paid' AND d.is_test=0 AND d.paid_amount>0
    AND UNIX_TIMESTAMP(COALESCE(p.created_at,d.created_at))>=? AND UNIX_TIMESTAMP(COALESCE(p.created_at,d.created_at))<?
    GROUP BY bucket_key ORDER BY bucket_key");
$query->execute([$revenueStart->getTimestamp(),$revenueEnd->getTimestamp()]);
$paidBuckets = array_column($query->fetchAll(PDO::FETCH_ASSOC),null,'bucket_key');
$revenueRows = [];
$cursor = $revenueGrouping==='month' ? $revenueStart->modify('first day of this month') : $revenueStart;
$keyFormat = ['hour'=>'Y-m-d H','day'=>'Y-m-d','month'=>'Y-m'][$revenueGrouping];
$labelFormat = ['hour'=>'H:00','day'=>'d/m/Y','month'=>'m/Y'][$revenueGrouping];
while ($cursor < $revenueEnd) {
    $key = $cursor->format($keyFormat);
    $row = $paidBuckets[$key] ?? ['amount'=>0,'donations'=>0];
    $revenueRows[] = [
        'bucket'=>$cursor->format($labelFormat),
        'short_label'=>$cursor->format(['hour'=>'H:00','day'=>'d/m','month'=>'m/Y'][$revenueGrouping]),
        'amount'=>(int)$row['amount'], 'donations'=>(int)$row['donations']
    ];
    $cursor = $cursor->modify(['hour'=>'+1 hour','day'=>'+1 day','month'=>'+1 month'][$revenueGrouping]);
}
$revenueTotal = array_sum(array_column($revenueRows,'amount'));
$revenueCount = array_sum(array_column($revenueRows,'donations'));
$revenuePeak = max(array_column($revenueRows,'amount'));
