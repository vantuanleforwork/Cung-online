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

    $personal = $scope === 'me' && $donorId > 0;
    $donorFilter = $personal ? 'AND d.user_id = :uid' : '';
    $s = $db->prepare("SELECT d.id, d.created_at, d.code, d.paid_amount, d.expected_amount, d.name, d.message,
               d.shown, d.queue_state, d.user_id, d.donation_kind, d.required_amount,
               q.id AS music_id, q.title AS music_title, COALESCE(q.video_id,d.youtube_id) AS music_video_id,
               (q.title_retry_at IS NULL OR q.title_retry_at<=NOW()) AS music_title_due,
               COALESCE(NULLIF(u.custom_avatar_path,''), NULLIF(u.google_avatar_url,''), NULLIF(d.donor_avatar,'')) AS donor_avatar
        FROM donations d
        LEFT JOIN donor_users u ON u.id=d.user_id
        LEFT JOIN music_requests q ON q.donation_id=d.id
        WHERE d.status='paid' AND d.is_test=0 $donorFilter
        ORDER BY d.id DESC LIMIT :limit OFFSET :offset");
    if ($personal) $s->bindValue(':uid', $donorId, PDO::PARAM_INT);

    $s->bindValue(':limit', $limit + 1, PDO::PARAM_INT);
    $s->bindValue(':offset', $offset, PDO::PARAM_INT);
    $s->execute();
    $rows = $s->fetchAll(PDO::FETCH_ASSOC);
    $hasMore = count($rows) > $limit;
    $rows = array_slice($rows, 0, $limit);

    $spinIds = array_column(array_filter($rows, static fn($row) => $row['donation_kind'] === 'roulette'), 'id');
    $spins = [];
    if ($spinIds) {
        $placeholders = implode(',', array_fill(0, count($spinIds), '?'));
        $spinQuery = $db->prepare("SELECT donation_id,snapshot FROM roulette_spins WHERE donation_id IN ($placeholders)");
        $spinQuery->execute($spinIds);
        $spins = $spinQuery->fetchAll(PDO::FETCH_KEY_PAIR);
    }
    // Reuse the queue's cached title. Limit uncached YouTube lookups per history request.
    foreach ($rows as &$row) {
        if (!$row['music_id'] || $row['music_title'] !== '' || !$row['music_title_due']) continue;
        try { $row['music_title'] = refresh_music_title($db, (int)$row['music_id'], true); }
        catch (Throwable $error) { error_log('Donation history music title: ' . $error->getMessage()); }
        break;
    }
    unset($row);

    $items = array_map(static function (array $row) use ($donorId, $spins): array {
        $name = trim((string)($row['name'] ?? '')) ?: 'Người ủng hộ';
        $state = 'Thành công';
        if ($row['queue_state'] === 'held') $state = 'Chờ duyệt';
        elseif ($row['queue_state'] === 'skipped') $state = 'Đã bỏ qua';
        elseif ((int)$row['shown'] === 1) $state = 'Đã lên live';
        else $state = 'Đã nhận';

        $amt = (int)($row['paid_amount'] ?? 0);
        if ($amt <= 0) $amt = (int)($row['expected_amount'] ?? 0);
        $spin = isset($spins[$row['id']]) ? json_decode($spins[$row['id']], true) : null;
        $winner = (int)$row['shown'] === 1 && $row['queue_state'] === 'queued' &&
            (int)$row['paid_amount'] >= (int)$row['required_amount']
            ? ($spin['options'][$spin['winner']] ?? '') : '';

        return [
            'id' => (int)$row['id'],
            'created_at' => $row['created_at'],
            'code' => (string)($row['code'] ?? ''),
            'amount' => $amt,
            'name' => $name,
            'message' => (string)($row['message'] ?? ''),
            'kind' => $row['donation_kind'],
            'music_title' => (string)($row['music_title'] ?? ''),
            'music_video_id' => $row['donation_kind'] === 'music' ? (string)($row['music_video_id'] ?? '') : '',
            'roulette_name' => (string)($spin['name'] ?? ''),
            'roulette_result' => $winner,
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
