<?php
function donor_skin_catalog(PDO $db): array {
    $catalog = [
        'itachi'=>['name'=>'Itachi','url'=>'assets/skins/itachi.gif'],
        'naruto'=>['name'=>'Naruto','url'=>'assets/skins/naruto.gif'],
    ];
    try {
        $rows = $db->query('SELECT id,name FROM uploaded_donor_skins ORDER BY id');
        foreach ($rows as $row) {
            $key = 'gif-' . $row['id'];
            $catalog[$key] = ['name'=>$row['name'], 'url'=>'uploads/skins/'.$key.'.gif'];
        }
    } catch (PDOException $error) {
        if ((int)($error->errorInfo[1] ?? 0) !== 1146) throw $error;
    }
    try {
        $removed = $db->query('SELECT skin_key FROM removed_donor_skins')->fetchAll(PDO::FETCH_COLUMN);
        $catalog = array_diff_key($catalog, array_fill_keys($removed, true));
    } catch (PDOException $error) {
        if ((int)($error->errorInfo[1] ?? 0) !== 1146) throw $error;
    }
    try {
        $saved = $db->query('SELECT skin_keys FROM donor_skin_order WHERE id=1')->fetchColumn();
        if ($saved !== false) {
            $keys = json_decode($saved, true, 16, JSON_THROW_ON_ERROR);
            $ordered = [];
            foreach ($keys as $key) {
                if (isset($catalog[$key])) $ordered[$key] = $catalog[$key];
            }
            $catalog = $ordered + $catalog;
        }
    } catch (PDOException $error) {
        if ((int)($error->errorInfo[1] ?? 0) !== 1146) throw $error;
    }
    return $catalog;
}

function save_donor_skin_order(PDO $db, string $order): void {
    $keys = explode(',', $order);
    $catalogKeys = array_keys(donor_skin_catalog($db));
    if (count($keys) !== count($catalogKeys) || count(array_unique($keys)) !== count($keys)
        || array_diff($keys, $catalogKeys)) {
        throw new InvalidArgumentException('Danh sách skin đã thay đổi. Hãy tải lại trang và thử lại.');
    }
    $db->exec("CREATE TABLE IF NOT EXISTS donor_skin_order (
        id TINYINT PRIMARY KEY, skin_keys TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $db->prepare('INSERT INTO donor_skin_order(id,skin_keys) VALUES(1,?) ON DUPLICATE KEY UPDATE skin_keys=VALUES(skin_keys)')
       ->execute([json_encode($keys, JSON_THROW_ON_ERROR)]);
}

function remove_donor_skin(PDO $db, string $key): void {
    if (!isset(donor_skin_catalog($db)[$key])) {
        throw new InvalidArgumentException('Skin này không còn trong danh sách.');
    }
    $db->exec("CREATE TABLE IF NOT EXISTS removed_donor_skins (
        skin_key VARCHAR(32) PRIMARY KEY
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $db->prepare('INSERT IGNORE INTO removed_donor_skins(skin_key) VALUES(?)')->execute([$key]);
}

function upload_donor_skin(PDO $db, $name, array $file): void {
    $name = is_string($name) ? clean($name, 60) : '';
    if ($name === '') throw new InvalidArgumentException('Hãy nhập tên skin.');
    $tmp = $file['tmp_name'] ?? '';
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($tmp)
        || filesize($tmp) > 2 * 1024 * 1024) {
        throw new InvalidArgumentException('Hãy chọn tệp GIF tối đa 2 MB.');
    }
    $info = @getimagesize($tmp);
    if (!$info || $info[2] !== IMAGETYPE_GIF || $info[0] < 1 || $info[1] < 1 || max($info[0], $info[1]) > 1024) {
        throw new InvalidArgumentException('Chỉ nhận ảnh GIF tối đa 1024 × 1024 px.');
    }
    $dir = __DIR__.'/uploads/skins';
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Không tạo được thư mục skin.');
    }
    $db->exec("CREATE TABLE IF NOT EXISTS uploaded_donor_skins (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(60) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $path = null;
    $db->beginTransaction();
    try {
        $db->prepare('INSERT INTO uploaded_donor_skins(name) VALUES(?)')->execute([$name]);
        $path = $dir.'/gif-'.$db->lastInsertId().'.gif';
        if (!move_uploaded_file($tmp, $path) || !chmod($path, 0644)) {
            throw new RuntimeException('Không lưu được tệp skin.');
        }
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        if ($path !== null && is_file($path)) unlink($path);
        throw $error;
    }
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

function donor_skin_options(array $record, int $level, array $catalog): array {
    $unlocked = array_slice(array_values(array_intersect($record['unlocked'], array_keys($catalog))), 0, $level);
    return [
        'unlocked'=>$unlocked,
        'selected'=>in_array($record['selected'], $unlocked, true) ? $record['selected'] : null,
        'remaining'=>max(0, min($level, count($catalog)) - count($unlocked)),
    ];
}

function donor_skin_profile(PDO $db, int $userId, int $level): array {
    $catalog = donor_skin_catalog($db);
    return donor_skin_options(donor_skin_record($db, $userId), $level, $catalog) + ['catalog'=>$catalog];
}

function select_donor_skin(PDO $db, int $userId, string $skin): array {
    $catalog = donor_skin_catalog($db);
    if (!isset($catalog[$skin])) throw new InvalidArgumentException('Skin này chưa có.');
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
        $available = donor_skin_options($record, $level, $catalog);
        if (!in_array($skin, $available['unlocked'], true)) {
            if (!$available['remaining']) throw new InvalidArgumentException('Hãy lên level để mở khóa thêm skin.');
            $record['unlocked'] = $available['unlocked'];
            $record['unlocked'][] = $skin;
        }
        $record['selected'] = $skin;
        $db->prepare('INSERT INTO donor_skins(user_id,unlocked_json,active_skin) VALUES(?,?,?)
            ON DUPLICATE KEY UPDATE unlocked_json=VALUES(unlocked_json),active_skin=VALUES(active_skin)')
            ->execute([$userId,json_encode($record['unlocked'], JSON_THROW_ON_ERROR),$skin]);
        $db->commit();
        return donor_skin_options($record, $level, $catalog) + ['catalog'=>$catalog];
    } catch (Throwable $error) {
        $db->rollBack();
        throw $error;
    }
}
