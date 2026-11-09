<?php
function donor_skin_catalog(): array {
    return [
        'itachi'=>['name'=>'Itachi','url'=>'assets/skins/itachi.gif'],
        'naruto'=>['name'=>'Naruto','url'=>'assets/skins/naruto.gif'],
    ];
}

function donor_skin_record(PDO $db, int $userId): array {
    try {
        $query = $db->prepare('SELECT unlocked_json,active_skin FROM donor_skins WHERE user_id=?');
        $query->execute([$userId]);
        $row = $query->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $error) {
        if ((int)($error->errorInfo[1] ?? 0) !== 1146) throw $error;
        $row = false;
    }
    return $row ? [
        'unlocked'=>json_decode($row['unlocked_json'], true, 16, JSON_THROW_ON_ERROR),
        'selected'=>$row['active_skin']
    ] : ['unlocked'=>[], 'selected'=>null];
}

function donor_skin_options(array $record, int $level): array {
    $unlocked = array_slice($record['unlocked'], 0, $level);
    return [
        'unlocked'=>$unlocked,
        'selected'=>in_array($record['selected'], $unlocked, true) ? $record['selected'] : null,
        'remaining'=>max(0, min($level, count(donor_skin_catalog())) - count($unlocked)),
    ];
}

function donor_skin_profile(PDO $db, int $userId, int $level): array {
    return donor_skin_options(donor_skin_record($db, $userId), $level) + ['catalog'=>donor_skin_catalog()];
}

function select_donor_skin(PDO $db, int $userId, string $skin): array {
    if (!isset(donor_skin_catalog()[$skin])) throw new InvalidArgumentException('Skin này chưa có.');
    $db->exec("CREATE TABLE IF NOT EXISTS donor_skins (
        user_id BIGINT UNSIGNED PRIMARY KEY,
        unlocked_json TEXT NOT NULL,
        active_skin VARCHAR(32) NULL,
        FOREIGN KEY (user_id) REFERENCES donor_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $db->beginTransaction();
    try {
        $user = $db->prepare('SELECT id FROM donor_users WHERE id=? FOR UPDATE');
        $user->execute([$userId]);
        if (!$user->fetchColumn()) throw new InvalidArgumentException('Phiên đăng nhập đã hết hạn.');
        $level = donor_level($db, $userId);
        if ($level < 1) throw new InvalidArgumentException('Đạt Lv1 trở lên để mở khóa 1 skin bạn muốn.');
        $record = donor_skin_record($db, $userId);
        $available = donor_skin_options($record, $level);
        if (!in_array($skin, $available['unlocked'], true)) {
            if (!$available['remaining']) throw new InvalidArgumentException('Hãy lên level để mở khóa thêm skin.');
            $record['unlocked'][] = $skin;
        }
        $record['selected'] = $skin;
        $db->prepare('INSERT INTO donor_skins(user_id,unlocked_json,active_skin) VALUES(?,?,?)
            ON DUPLICATE KEY UPDATE unlocked_json=VALUES(unlocked_json),active_skin=VALUES(active_skin)')
            ->execute([$userId,json_encode($record['unlocked'], JSON_THROW_ON_ERROR),$skin]);
        $db->commit();
        return donor_skin_options($record, $level) + ['catalog'=>donor_skin_catalog()];
    } catch (Throwable $error) {
        $db->rollBack();
        throw $error;
    }
}
