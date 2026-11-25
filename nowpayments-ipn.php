<?php
require __DIR__ . '/common.php';

function np_sort(&$value): void {
    if (!is_array($value)) return;
    ksort($value);
    foreach ($value as &$item) np_sort($item);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !defined('NOWPAYMENTS_IPN_SECRET') || trim(NOWPAYMENTS_IPN_SECRET) === '') respond(405, ['success'=>false]);
    $raw = file_get_contents('php://input', false, null, 0, 131073);
    if (strlen($raw) > 131072) respond(413, ['success'=>false]);
    $data = json_decode($raw, true);
    if (!is_array($data)) respond(400, ['success'=>false]);
    $signature = (string)($_SERVER['HTTP_X_NOWPAYMENTS_SIG'] ?? '');
    $sorted = $data;
    np_sort($sorted);
    $expected = hash_hmac('sha512', json_encode($sorted, JSON_UNESCAPED_SLASHES), trim(NOWPAYMENTS_IPN_SECRET));
    if ($signature === '' || !hash_equals($expected, $signature)) respond(401, ['success'=>false]);
    $status = strtolower((string)($data['payment_status'] ?? ''));
    $orderId = trim((string)($data['order_id'] ?? ''));
    $paymentId = trim((string)($data['payment_id'] ?? ''));
    if ($orderId === '' || $paymentId === '' || !in_array($status, ['finished','partially_paid'], true)) respond(200, ['success'=>true]);
    if ($status !== 'finished') respond(200, ['success'=>true]);
    if (strtolower((string)($data['price_currency'] ?? '')) !== strtolower((string)NOWPAYMENTS_PRICE_CURRENCY)
        || strtolower((string)($data['pay_currency'] ?? '')) !== strtolower((string)NOWPAYMENTS_PAY_CURRENCY)) respond(400, ['success'=>false]);
    $amount = $data['price_amount'] ?? null;
    if (!is_numeric($amount) || (float)$amount <= 0) respond(400, ['success'=>false]);
    $db = db();
    $db->beginTransaction();
    $s = $db->prepare("SELECT * FROM donations WHERE code=? AND payment_method='nowpayments' FOR UPDATE");
    $s->execute([$orderId]);
    $donation = $s->fetch(PDO::FETCH_ASSOC);
    if (!$donation) { $db->commit(); respond(200, ['success'=>true]); }
    if ($donation['status'] === 'paid') { $db->commit(); respond(200, ['success'=>true]); }
    $txId = 'NP_' . substr(preg_replace('/[^A-Za-z0-9_-]/', '', $paymentId), 0, 58);
    $content = 'NOWPayments ' . $orderId . ' ' . (string)($data['pay_currency'] ?? NOWPAYMENTS_PAY_CURRENCY);
    $insert = $db->prepare("INSERT INTO payment_transactions(tx_id,paid_amount,content,account_number,gateway,direction,decision) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE tx_id=tx_id");
    $insert->execute([$txId, (int)round((float)$amount), $content, '', 'NOWPAYMENTS', 'IN', 'unmatched']);
    if ($insert->rowCount() !== 0) {
        $payment = ['tx_id'=>$txId,'paid_amount'=>(int)round((float)$amount)];
        attach_payment($db, $payment, $donation);
        $db->prepare('UPDATE donations SET provider_payment_id=? WHERE id=?')->execute([$paymentId, $donation['id']]);
        record_kpi_payment($db, (int)round((float)$amount));
    }
    $db->commit();
    respond(200, ['success'=>true]);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log('NOWPayments IPN: ' . $e->getMessage());
    respond(500, ['success'=>false]);
}
