<?php
function ensure_pk_schema(PDO $db): void {
    require_schema($db, ['pk_options'=>['id','name','image_path','active','sort_order'], 'pk_battles'=>['id','started_at','ends_at','status'], 'donation_settings'=>['pk_enabled','pk_min','pk_duration'], 'donations'=>['pk_option_id','pk_battle_id']]);
}

function pk_options(PDO $db, bool $activeOnly = true): array {
    ensure_pk_schema($db);
    $sql = 'SELECT id,name,image_path,active,sort_order FROM pk_options' . ($activeOnly ? ' WHERE active=1' : '') . ' ORDER BY sort_order,id';
    return $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
}

function pk_current(PDO $db): ?array {
    ensure_pk_schema($db);
    $db->exec("UPDATE pk_battles SET status='finished' WHERE status='active' AND ends_at<=NOW()");
    $battle = $db->query("SELECT * FROM pk_battles WHERE status='active' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    if (!$battle) return null;
    $rows = $db->prepare("SELECT o.id,o.name,o.image_path,COALESCE(SUM(d.paid_amount),0) total FROM pk_options o LEFT JOIN donations d ON d.pk_option_id=o.id AND d.pk_battle_id=? AND d.status='paid' AND d.is_test=0 GROUP BY o.id ORDER BY o.sort_order,o.id");
    $rows->execute([(int)$battle['id']]);
    $options = $rows->fetchAll(PDO::FETCH_ASSOC);
    $total = array_sum(array_map(static fn($row) => (int)$row['total'], $options));
    foreach ($options as &$option) { $option['total'] = (int)$option['total']; $option['percent'] = $total > 0 ? round($option['total'] / $total * 100, 2) : 0; }
    unset($option);
    $recent = $db->prepare("SELECT id,pk_option_id,paid_amount FROM donations WHERE pk_battle_id=? AND status='paid' AND is_test=0 ORDER BY id DESC LIMIT 1");
    $recent->execute([(int)$battle['id']]);
    $last = $recent->fetch(PDO::FETCH_ASSOC) ?: null;
    return ['id'=>(int)$battle['id'],'started_at'=>$battle['started_at'],'ends_at'=>$battle['ends_at'],'total'=>$total,'options'=>$options,'last_donation'=>$last];
}

function pk_assign_paid(PDO $db, array $donation, int $paid): void {
    if (($donation['donation_kind'] ?? '') !== 'pk' || empty($donation['pk_option_id']) || !empty($donation['is_test']) || $paid < (int)($donation['required_amount'] ?? 0)) return;
    ensure_pk_schema($db);
    $settings = donation_settings($db);
    $db->query("UPDATE pk_battles SET status='finished' WHERE status='active' AND ends_at<=NOW()");
    $battle = $db->query("SELECT * FROM pk_battles WHERE status='active' ORDER BY id DESC LIMIT 1 FOR UPDATE")->fetch(PDO::FETCH_ASSOC);
    if (!$battle) {
        $seconds = max(30, min(86400, (int)$settings['pk_duration']));
        $db->exec("INSERT INTO pk_battles(started_at,ends_at) VALUES(NOW(),DATE_ADD(NOW(),INTERVAL {$seconds} SECOND))");
        $battle = ['id'=>(int)$db->lastInsertId()];
    }
    $db->prepare('UPDATE donations SET pk_battle_id=? WHERE id=? AND pk_battle_id IS NULL')->execute([(int)$battle['id'], (int)$donation['id']]);
}

function pk_save_option(PDO $db, array $input, array $file = []): void {
    ensure_pk_schema($db);
    $id = filter_var($input['id'] ?? 0, FILTER_VALIDATE_INT);
    $name = clean((string)($input['name'] ?? ''), 80);
    if ($id === false || $id < 0 || $name === '') throw new InvalidArgumentException('Tên option PK không được để trống.');
    $path = '';
    if ($id > 0) { $q=$db->prepare('SELECT image_path FROM pk_options WHERE id=?'); $q->execute([$id]); $path=(string)$q->fetchColumn(); }
    if (!empty($file['tmp_name']) && is_uploaded_file($file['tmp_name'])) {
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || (int)($file['size'] ?? 0) > 2097152) throw new InvalidArgumentException('Ảnh PK tối đa 2 MB.');
        $info = @getimagesize($file['tmp_name']);
        if (!$info || !in_array($info['mime'], ['image/jpeg','image/png','image/gif','image/webp'], true)) throw new InvalidArgumentException('Ảnh PK cần là JPG, PNG, GIF hoặc WebP.');
        $dir = __DIR__ . '/uploads/pk'; if (!is_dir($dir) && !mkdir($dir, 0755, true)) throw new RuntimeException('Không tạo được thư mục ảnh PK.');
        $ext = ['image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp'][$info['mime']];
        $fileName = 'option-' . bin2hex(random_bytes(12)) . '.' . $ext;
        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $fileName)) throw new RuntimeException('Không lưu được ảnh PK.');
        $path = 'uploads/pk/' . $fileName;
    }
    $active = isset($input['active']) ? 1 : 0;
    $sort = max(0, min(999, (int)($input['sort_order'] ?? 0)));
    if ($id) $db->prepare('UPDATE pk_options SET name=?,image_path=?,active=?,sort_order=? WHERE id=?')->execute([$name,$path,$active,$sort,$id]);
    else $db->prepare('INSERT INTO pk_options(name,image_path,active,sort_order) VALUES(?,?,?,?)')->execute([$name,$path,$active,$sort]);
}

function pk_delete_option(PDO $db, int $id): void { ensure_pk_schema($db); $db->prepare('DELETE FROM pk_options WHERE id=?')->execute([$id]); }
