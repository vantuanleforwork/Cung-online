<?php
require __DIR__ . '/common.php';
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

donor_session();
if (empty($_SESSION['donor_id'])) respond(200, ['logged_in' => false, 'items' => [], 'has_more' => false]);

$limit = filter_var($_GET['limit'] ?? 5, FILTER_VALIDATE_INT);
$offset = filter_var($_GET['offset'] ?? 0, FILTER_VALIDATE_INT);
if ($limit === false) $limit = 5;
if ($offset === false) $offset = 0;
$limit = max(1, min(5, (int)$limit));
$offset = max(0, min(10000, (int)$offset));

$db = db();
$s = $db->prepare('SELECT id,created_at,code,expected_amount,paid_amount,status,queue_state,shown
    FROM donations WHERE user_id=? ORDER BY id DESC LIMIT :limit OFFSET :offset');
$s->bindValue(1, (int)$_SESSION['donor_id'], PDO::PARAM_INT);
$s->bindValue(':limit', $limit + 1, PDO::PARAM_INT);
$s->bindValue(':offset', $offset, PDO::PARAM_INT);
$s->execute();
$rows = $s->fetchAll(PDO::FETCH_ASSOC);
$hasMore = count($rows) > $limit;
$rows = array_slice($rows, 0, $limit);

$items = array_map(static function (array $row): array {
    $state = 'Chờ thanh toán';
    if ($row['status'] === 'paid') {
        if ($row['queue_state'] === 'held') $state = 'Chờ duyệt';
        elseif ($row['queue_state'] === 'skipped') $state = 'Đã bỏ qua';
        elseif ((int)$row['shown'] === 1) $state = 'Đã hiển thị';
        else $state = 'Đã nhận tiền';
    }
    return [
        'id' => (int)$row['id'],
        'created_at' => $row['created_at'],
        'code' => (string)($row['code'] ?? ''),
        'amount' => (int)($row['paid_amount'] ?? $row['expected_amount']),
        'status' => $state,
    ];
}, $rows);

respond(200, ['logged_in' => true, 'items' => $items, 'has_more' => $hasMore]);
