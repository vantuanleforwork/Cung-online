<?php
require __DIR__ . '/common.php';
$logId = null;
// Store authenticated payloads only, never store the Authorization header/token.
function webhook_result(int $status, string $outcome, string $detail = '', ?string $payload = null) {
    global $db, $logId;
    try {
        if ($logId === null) {
            $db->prepare('INSERT INTO webhook_logs(response_code,outcome,detail,payload) VALUES(?,?,?,?)')
               ->execute([$status, $outcome, $detail, $payload]);
        } else {
            $db->prepare('UPDATE webhook_logs SET response_code=?,outcome=?,detail=? WHERE id=?')
               ->execute([$status, $outcome, $detail, $logId]);
        }
    } catch (Throwable $e) {
        error_log('Webhook log: ' . $e->getMessage());
        $status = 500;
    }
    respond($status, ['success' => $status === 200]);
}

try {
    $db = db();
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!hash_equals('Bearer ' . PAY2S_SECRET, $h)) webhook_result(401, 'unauthorized');
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') webhook_result(405, 'wrong_method');
    $raw = file_get_contents('php://input', false, null, 0, 131073);
    if (strlen($raw) > 131072) webhook_result(413, 'invalid', 'Payload exceeds 128 KiB');
    $shape = json_decode($raw);
    $d = json_decode($raw, true);
    if (!is_object($shape) || !isset($shape->transactions) || !is_array($shape->transactions) ||
        !is_array($d) || !isset($d['transactions']) || !is_array($d['transactions']) ||
        count($d['transactions']) < 1 || count($d['transactions']) > 100 ||
        array_keys($d['transactions']) !== range(0, count($d['transactions']) - 1)) {
        // Invalid JSON may not be UTF-8; do not persist it verbatim.
        webhook_result(400, 'invalid', 'Expected transactions array with 1-100 entries');
    }
    $transactions = [];
    $siteTransactions = [];
    foreach ($d['transactions'] as $i => $t) {
        if (!is_array($t)) webhook_result(400, 'invalid', 'Invalid transaction at index ' . $i, $raw);
        // Other sites and personal transfers must not enter this site's ledger or logs.
        if (isset($t['content']) && is_string($t['content']) && !is_site_transfer($t['content'])) continue;
        $tx = $t['id'] ?? $t['checksum'] ?? null;
        $amount = $t['transferAmount'] ?? null;
        $direction = $t['transferType'] ?? null;
        // Bank notifications must provide an explicit receiving account and direction.
        if ((!is_string($tx) && !is_int($tx)) || (string)$tx === '' || strlen((string)$tx) > 64 ||
            (!is_int($amount) && !is_string($amount)) ||
            filter_var($amount, FILTER_VALIDATE_INT) === false || (int)$amount <= 0 ||
            !is_string($direction) || !in_array(strtoupper($direction), ['IN', 'OUT'], true) ||
            !isset($t['accountNumber']) || !is_string($t['accountNumber']) ||
            trim($t['accountNumber']) === '' || mb_strlen($t['accountNumber']) > 64 ||
            !isset($t['content']) || !is_string($t['content']) || mb_strlen($t['content']) > 4000 ||
            (isset($t['gateway']) && (!is_string($t['gateway']) || mb_strlen($t['gateway']) > 64))) {
            webhook_result(400, 'invalid', 'Invalid fields at index ' . $i, $raw);
        }
        $transactions[] = ['tx_id' => (string)$tx, 'paid_amount' => (int)$amount,
            'direction' => strtoupper($direction), 'account_number' => trim($t['accountNumber']),
            'gateway' => $t['gateway'] ?? '', 'content' => $t['content']];
        $siteTransactions[] = $t;
    }
    // Acknowledge unrelated batches so the provider does not retry them.
    if (!$transactions) respond(200, ['success' => true]);
    $d['transactions'] = $siteTransactions;
    $raw = json_encode($d, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $db->prepare("INSERT INTO webhook_logs(response_code,outcome,transaction_count,payload) VALUES(500,'processing',?,?)")
       ->execute([count($transactions), $raw]);
    $logId = $db->lastInsertId();
    $duplicates = 0;
    // Entire batch either commits or is retried. Log success is committed with payments.
    $db->beginTransaction();
    foreach ($transactions as $payment) {
        $decision = $payment['direction'] !== 'IN' ? 'ignored_out' :
            ($payment['account_number'] !== trim(ACCOUNT_NO) ? 'wrong_account' :
            ($payment['paid_amount'] < MIN_AMOUNT ? 'below_min' : 'unmatched'));
        $insert = $db->prepare('INSERT INTO payment_transactions(tx_id,paid_amount,content,account_number,gateway,direction,decision)
            VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE tx_id=tx_id');
        $insert->execute([$payment['tx_id'], $payment['paid_amount'], $payment['content'],
            $payment['account_number'], $payment['gateway'], $payment['direction'], $decision]);
        if ($insert->rowCount() === 0) { $duplicates++; continue; }
        if ($decision !== 'unmatched') continue;
        $row = null;
        if (preg_match('/' . preg_quote(PREFIX, '/') . '[A-Z0-9]{6}/', strtoupper($payment['content']), $m)) {
            $s = $db->prepare('SELECT * FROM donations WHERE code=? FOR UPDATE');
            $s->execute([$m[0]]);
            $candidate = $s->fetch(PDO::FETCH_ASSOC);
            if ($candidate && $candidate['status'] === 'pending') $row = $candidate;
        }
        if ($row) {
            attach_payment($db, $payment, $row);
        } elseif (ANON_FALLBACK) {
            $db->prepare("INSERT INTO donations(name,status,paid_amount,tx_id,queue_state) VALUES('Ẩn danh','paid',?,?,?)")
               ->execute([$payment['paid_amount'], $payment['tx_id'], review_state()]);
            $donationId = $db->lastInsertId();
            $db->prepare("UPDATE payment_transactions SET donation_id=?,decision='anonymous' WHERE tx_id=?")
               ->execute([$donationId, $payment['tx_id']]);
        }
    }
    $db->prepare("UPDATE webhook_logs SET response_code=200,outcome='processed',duplicate_count=? WHERE id=?")
       ->execute([$duplicates, $logId]);
    $db->commit();
    respond(200, ['success' => true]);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log('Pay2S webhook: ' . $e->getMessage());
    if (isset($db)) webhook_result(500, 'failed', 'Processing failed; retry required.');
    respond(500, ['success' => false]);
}
