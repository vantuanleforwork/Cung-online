<?php
// One-time cPanel deploy migration. Never copy this script into the web root.
if (PHP_SAPI !== 'cli' || empty($argv[1])) exit(1);
require rtrim($argv[1], '/\\').'/config.php';

$db = db();
$match = '(d.id, SHA2(d.code,256)) IN ((779,?),(780,?),(781,?))';
$codes = [
    '310240787782d99a1515da0c41ca01d593ee7c9cd64a682d5cbaacc267af4d6c',
    '7fd9cd9517423a4caf4fbd395782fe937f952d3a7472f35835838d54ef04e63f',
    'eb364f5da72d5ef123692df21413f4f4a500ec38c7ee34198892df4c54a674f0',
];
$delete = $db->prepare("DELETE d FROM donations d
    WHERE $match AND d.status='pending' AND d.expected_amount=50000
    AND COALESCE(d.paid_amount,0)=0 AND d.tx_id IS NULL AND d.is_test=0
    AND NOT EXISTS (
        SELECT 1 FROM payment_transactions p
        WHERE p.donation_id=d.id OR (p.direction='IN' AND LOCATE(d.code,UPPER(p.content))>0)
    )");
$delete->execute($codes);
echo 'Incident cleanup: removed '.$delete->rowCount()." unpaid orders.\n";
$remaining = $db->prepare("SELECT COUNT(*) FROM donations d WHERE $match");
$remaining->execute($codes);
if ((int)$remaining->fetchColumn() !== 0) {
    fwrite(STDERR, "A matching order was protected; verify its payment in admin.\n");
    exit(1);
}
