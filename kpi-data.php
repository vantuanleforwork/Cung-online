<?php
function kpi_day(): DateTimeImmutable {
    return new DateTimeImmutable('today', new DateTimeZone('Asia/Ho_Chi_Minh'));
}

function kpi_target(PDO $db, DateTimeImmutable $day): int {
    try {
        $query = $db->prepare('SELECT target_amount FROM donation_kpi WHERE goal_date=?');
        $query->execute([$day->format('Y-m-d')]);
        return (int)$query->fetchColumn();
    } catch (PDOException $error) {
        if ((int)($error->errorInfo[1] ?? 0) !== 1146) throw $error;
        return 0;
    }
}

function save_kpi_target(PDO $db, DateTimeImmutable $day, $input): void {
    $target = is_string($input) ? filter_var($input, FILTER_VALIDATE_INT, [
        'options'=>['min_range'=>0,'max_range'=>1000000000],
    ]) : false;
    if ($target === false) throw new InvalidArgumentException('Nhập KPI từ 0 đến 1.000.000.000đ.');
    $db->exec('CREATE TABLE IF NOT EXISTS donation_kpi (
        goal_date DATE PRIMARY KEY, target_amount INT UNSIGNED NOT NULL
    ) ENGINE=InnoDB');
    $db->prepare('INSERT INTO donation_kpi(goal_date,target_amount) VALUES(?,?)
        ON DUPLICATE KEY UPDATE target_amount=VALUES(target_amount)')->execute([$day->format('Y-m-d'),$target]);
}

function kpi_progress(PDO $db, DateTimeImmutable $day): array {
    $target = kpi_target($db, $day);
    if ($target === 0) return ['target'=>0, 'total'=>0, 'percent'=>0, 'milestone'=>0];
    $query = $db->prepare("SELECT COALESCE(SUM(d.paid_amount),0)
        FROM donations d LEFT JOIN payment_transactions p ON p.tx_id=d.tx_id
        WHERE d.status='paid' AND d.is_test=0 AND d.paid_amount>0
        AND UNIX_TIMESTAMP(COALESCE(p.created_at,d.created_at))>=?
        AND UNIX_TIMESTAMP(COALESCE(p.created_at,d.created_at))<?");
    $query->execute([$day->getTimestamp(),$day->modify('+1 day')->getTimestamp()]);
    $total = (int)$query->fetchColumn();
    $percent = (int)floor(min($total, $target) * 100 / $target);
    return ['target'=>$target, 'total'=>$total, 'percent'=>$percent, 'milestone'=>intdiv($percent,25)*25];
}
