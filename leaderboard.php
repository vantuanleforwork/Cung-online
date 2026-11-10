<?php
require __DIR__ . '/common.php';
header('X-Content-Type-Options: nosniff');

$period = $_GET['period'] ?? 'day';
if (!is_string($period) || !in_array($period, ['day', 'month', 'all'], true)) {
    respond(400, ['error' => 'Khoảng thời gian không hợp lệ.']);
}

try {
    $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
    $parameters = [];
    $dateFilter = '';
    if ($period !== 'all') {
        $start = $period === 'day' ? $now->setTime(0, 0) : $now->modify('first day of this month')->setTime(0, 0);
        $end = $period === 'day' ? $start->modify('+1 day') : $start->modify('+1 month');
        $dateFilter = ' AND UNIX_TIMESTAMP(COALESCE(p.created_at, d.created_at)) >= ? AND UNIX_TIMESTAMP(COALESCE(p.created_at, d.created_at)) < ?';
        $parameters = [$start->getTimestamp(), $end->getTimestamp()];
    }
    // Accounts accumulate by user ID. Legacy guest donations accumulate by name.
    $query = db()->prepare("SELECT totals.total, latest.name, u.display_name,
        COALESCE(NULLIF(u.custom_avatar_path, ''), NULLIF(u.google_avatar_url, ''), latest.donor_avatar, '') AS avatar
        FROM (
            SELECT SUM(d.paid_amount) AS total, MAX(d.id) AS latest_id
            FROM donations d LEFT JOIN payment_transactions p ON p.tx_id = d.tx_id
            WHERE d.status = 'paid' AND d.is_test=0 AND d.paid_amount > 0
              AND (d.user_id IS NOT NULL OR TRIM(d.name) <> 'Ẩn danh') $dateFilter
            GROUP BY CASE WHEN d.user_id IS NOT NULL THEN CONCAT('user:', d.user_id)
                ELSE CONCAT('guest:', TRIM(d.name)) END
            ORDER BY total DESC, latest_id ASC LIMIT 10
        ) totals
        JOIN donations latest ON latest.id = totals.latest_id
        LEFT JOIN donor_users u ON u.id = latest.user_id
        ORDER BY totals.total DESC, totals.latest_id ASC");
    $query->execute($parameters);
    $items = [];
    foreach ($query->fetchAll(PDO::FETCH_ASSOC) as $index => $row) {
        $items[] = [
            'rank' => $index + 1,
            'name' => trim((string)($row['display_name'] ?: $row['name'])) ?: 'Người ủng hộ',
            'avatar' => (string)$row['avatar'],
            'amount' => (int)$row['total'],
        ];
    }
    respond(200, ['period' => $period, 'items' => $items]);
} catch (Throwable $error) {
    error_log('Leaderboard: ' . $error->getMessage());
    respond(503, ['error' => 'Chưa tải được bảng xếp hạng. Vui lòng thử lại.']);
}
