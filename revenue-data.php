<?php
// Included only inside the authenticated admin branch.
if (empty($loggedIn)) { http_response_code(403); exit; }
$revenuePeriod = $_GET['period'] ?? 'day';
if (!is_string($revenuePeriod) || !in_array($revenuePeriod, ['day', 'month', 'year'], true)) {
    throw new InvalidArgumentException('Khoảng thống kê không hợp lệ.');
}
$revenueNow = new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
$revenueFormat = ['day' => 'Y-m-d', 'month' => 'Y-m', 'year' => 'Y'][$revenuePeriod];
$revenueDate = $_GET['date'] ?? $revenueNow->format($revenueFormat);
if (!is_string($revenueDate)) throw new InvalidArgumentException('Ngày thống kê không hợp lệ.');
$revenueStart = DateTimeImmutable::createFromFormat('!' . $revenueFormat, $revenueDate, new DateTimeZone('Asia/Ho_Chi_Minh'));
if (!$revenueStart || $revenueStart->format($revenueFormat) !== $revenueDate || (int)$revenueStart->format('Y') < 2000 || (int)$revenueStart->format('Y') > 2100) {
    throw new InvalidArgumentException('Ngày thống kê không hợp lệ.');
}
$revenueEnd = $revenueStart->modify(['day' => '+1 day', 'month' => '+1 month', 'year' => '+1 year'][$revenuePeriod]);
$bucketFormat = ['day' => '%H:00', 'month' => '%d/%m', 'year' => '%m/%Y'][$revenuePeriod];
$query = $db->prepare("SELECT DATE_FORMAT(DATE_ADD('1970-01-01', INTERVAL (UNIX_TIMESTAMP(COALESCE(p.created_at,d.created_at))+25200) SECOND), '$bucketFormat') AS bucket,
    SUM(d.paid_amount) AS amount, COUNT(*) AS donations
    FROM donations d LEFT JOIN payment_transactions p ON p.tx_id=d.tx_id
    WHERE d.status='paid' AND d.is_test=0 AND d.paid_amount>0
    AND UNIX_TIMESTAMP(COALESCE(p.created_at,d.created_at))>=? AND UNIX_TIMESTAMP(COALESCE(p.created_at,d.created_at))<?
    GROUP BY bucket ORDER BY MIN(COALESCE(p.created_at,d.created_at))");
$query->execute([$revenueStart->getTimestamp(), $revenueEnd->getTimestamp()]);
$revenueRows = $query->fetchAll(PDO::FETCH_ASSOC);
$revenueTotal = array_sum(array_column($revenueRows, 'amount'));
$revenueCount = array_sum(array_column($revenueRows, 'donations'));
