<?php
require __DIR__ . '/common.php';
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

try {
    donor_session();
    $donorId = !empty($_SESSION['donor_id']) ? (int)$_SESSION['donor_id'] : 0;
    $scope = trim((string)($_GET['scope'] ?? ''));

    $limit = filter_var($_GET['limit'] ?? 5, FILTER_VALIDATE_INT);
    $offset = filter_var($_GET['offset'] ?? 0, FILTER_VALIDATE_INT);
    if ($limit === false) $limit = 5;
    if ($offset === false) $offset = 0;
    $limit = max(1, min(50, (int)$limit));
    $offset = max(0, min(10000, (int)$offset));

    $db = db();

    // Nếu xem lịch sử riêng "Của tôi" và đã đăng nhập
    if ($scope === 'me' && $donorId > 0) {
        $sql = 'SELECT d.id, d.created_at, d.code, d.paid_amount, d.expected_amount, d.name, d.message, d.shown, d.queue_state, d.user_id,
                       COALESCE(NULLIF(u.custom_avatar_path,""), NULLIF(u.google_avatar_url,""), NULLIF(d.donor_avatar,"")) AS donor_avatar
                FROM donations d
                LEFT JOIN donor_users u ON u.id = d.user_id
                WHERE d.user_id = :uid AND d.status = "paid"
                ORDER BY d.id DESC LIMIT :limit OFFSET :offset';
        $s = $db->prepare($sql);
        $s->bindValue(':uid', $donorId, PDO::PARAM_INT);
    } else {
        // Mặc định: Lấy danh sách các phiên donate THÀNH CÔNG gần nhất cho Van Tuan Le (status = "paid")
        $sql = 'SELECT d.id, d.created_at, d.code, d.paid_amount, d.expected_amount, d.name, d.message, d.shown, d.queue_state, d.user_id,
                       COALESCE(NULLIF(u.custom_avatar_path,""), NULLIF(u.google_avatar_url,""), NULLIF(d.donor_avatar,"")) AS donor_avatar
                FROM donations d
                LEFT JOIN donor_users u ON u.id = d.user_id
                WHERE d.status = "paid"
                ORDER BY d.id DESC LIMIT :limit OFFSET :offset';
        $s = $db->prepare($sql);
    }

    $s->bindValue(':limit', $limit + 1, PDO::PARAM_INT);
    $s->bindValue(':offset', $offset, PDO::PARAM_INT);
    $s->execute();
    $rows = $s->fetchAll(PDO::FETCH_ASSOC);
    $hasMore = count($rows) > $limit;
    $rows = array_slice($rows, 0, $limit);

    $items = array_map(static function (array $row) use ($donorId): array {
        $name = trim((string)($row['name'] ?? '')) ?: 'Người ủng hộ';
        $state = 'Thành công';
        if ($row['queue_state'] === 'held') $state = 'Chờ duyệt';
        elseif ($row['queue_state'] === 'skipped') $state = 'Đã bỏ qua';
        elseif ((int)$row['shown'] === 1) $state = 'Đã lên live';
        else $state = 'Đã nhận';

        $amt = (int)($row['paid_amount'] ?? 0);
        if ($amt <= 0) $amt = (int)($row['expected_amount'] ?? 0);

        return [
            'id' => (int)$row['id'],
            'created_at' => $row['created_at'],
            'code' => (string)($row['code'] ?? ''),
            'amount' => $amt,
            'name' => $name,
            'message' => (string)($row['message'] ?? ''),
            'avatar' => (string)($row['donor_avatar'] ?? ''),
            'status' => $state,
            'is_me' => ($donorId > 0 && isset($row['user_id']) && (int)$row['user_id'] === $donorId)
        ];
    }, $rows);

    respond(200, [
        'logged_in' => ($donorId > 0),
        'items' => $items,
        'has_more' => $hasMore,
        'scope' => ($scope === 'me' ? 'me' : 'all')
    ]);
} catch (Throwable $e) {
    error_log('Donation history: ' . $e->getMessage());
    respond(200, [
        'logged_in' => false,
        'items' => [],
        'has_more' => false,
        'scope' => 'all'
    ]);
}
