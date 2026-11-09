<?php
function kpi_default_stages(): array {
    return [
        'stage1'=>'assets/kpi/mage-25.png', 'stage2'=>'assets/kpi/mage-50.png',
        'stage3'=>'assets/kpi/mage-75.png', 'stage4'=>'assets/kpi/mage-100.png', 'stage5'=>null,
    ];
}

function ensure_kpi_state(PDO $db): void {
    try {
        if ($db->query('SELECT id FROM donation_kpi_state WHERE id=1')->fetchColumn()) return;
    } catch (PDOException $error) {
        if ((int)($error->errorInfo[1] ?? 0) !== 1146) throw $error;
    }
    $db->exec("CREATE TABLE IF NOT EXISTS donation_kpi_state (
        id TINYINT PRIMARY KEY, target_amount INT UNSIGNED NOT NULL DEFAULT 0,
        collected BIGINT UNSIGNED NOT NULL DEFAULT 0, stage_count TINYINT NOT NULL DEFAULT 4,
        stage_images TEXT NULL, base_image VARCHAR(100) NULL,
        event_seq BIGINT UNSIGNED NOT NULL DEFAULT 0, event_at BIGINT UNSIGNED NULL
    ) ENGINE=InnoDB");
    $target = 0;
    $collected = 0;
    try {
        $legacy = $db->query('SELECT goal_date,target_amount FROM donation_kpi ORDER BY goal_date DESC LIMIT 1')->fetch(PDO::FETCH_ASSOC);
        $target = (int)($legacy['target_amount'] ?? 0);
        if ($target > 0) {
            $start = new DateTimeImmutable($legacy['goal_date'], new DateTimeZone('Asia/Ho_Chi_Minh'));
            $sum = $db->prepare("SELECT COALESCE(SUM(d.paid_amount),0)
                FROM donations d LEFT JOIN payment_transactions p ON p.tx_id=d.tx_id
                WHERE d.status='paid' AND d.is_test=0 AND d.paid_amount>0
                AND UNIX_TIMESTAMP(COALESCE(p.created_at,d.created_at))>=?");
            $sum->execute([$start->getTimestamp()]);
            $collected = (int)$sum->fetchColumn();
        }
    } catch (PDOException $error) {
        if ((int)($error->errorInfo[1] ?? 0) !== 1146) throw $error;
    }
    $db->prepare('INSERT IGNORE INTO donation_kpi_state(id,target_amount,collected) VALUES(1,?,?)')
       ->execute([$target,$collected]);
}

function kpi_stage_number(int $collected, int $target, int $count): int {
    return $target > 0 ? intdiv(min($collected, $target) * $count, $target) : 0;
}

function kpi_progress(PDO $db): array {
    ensure_kpi_state($db);
    $row = $db->query('SELECT *, GREATEST(0,LEAST(60,CAST(event_at AS SIGNED)+60-CAST(UNIX_TIMESTAMP() AS SIGNED))) AS remaining
        FROM donation_kpi_state WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    $target = (int)$row['target_amount'];
    $total = (int)$row['collected'];
    $count = (int)$row['stage_count'];
    $stages = $row['stage_images'] === null ? kpi_default_stages() : json_decode($row['stage_images'], true, 16, JSON_THROW_ON_ERROR);
    $base = $row['base_image'] ?: 'assets/kpi/mage-0.png';
    $stage = kpi_stage_number($total, $target, $count);
    $reachedImages = array_filter(array_slice(array_values($stages), 0, $stage));
    return [
        'target'=>$target, 'total'=>$total, 'percent'=>$target > 0 ? intdiv(min($total,$target)*100,$target) : 0,
        'stage'=>$stage, 'stage_count'=>$count, 'stage_images'=>$stages, 'base_image'=>$base,
        'image'=>$reachedImages ? end($reachedImages) : $base,
        'event'=>(int)$row['event_seq'], 'remaining'=>(int)$row['remaining'],
    ];
}

// Called within the payment transaction, once for each committed batch.
function record_kpi_payment(PDO $db, int $amount): void {
    if ($amount <= 0) return;
    try {
        $row = $db->query('SELECT target_amount,collected,stage_count FROM donation_kpi_state WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $error) {
        // The widget or admin will initialize the table on first load.
        if ((int)($error->errorInfo[1] ?? 0) === 1146) return;
        throw $error;
    }
    if (!$row || !$row['target_amount']) return;
    $before = (int)$row['collected'];
    $after = $before + $amount;
    $target = (int)$row['target_amount'];
    $count = (int)$row['stage_count'];
    $advanced = kpi_stage_number($after,$target,$count) > kpi_stage_number($before,$target,$count);
    $db->prepare('UPDATE donation_kpi_state SET collected=?, event_seq=event_seq+?,
        event_at=IF(?,UNIX_TIMESTAMP(),event_at) WHERE id=1')->execute([$after,(int)$advanced,(int)$advanced]);
}

function reset_kpi(PDO $db): void {
    ensure_kpi_state($db);
    $db->exec('UPDATE donation_kpi_state SET collected=0,event_at=NULL WHERE id=1');
}

function store_kpi_image(array $file): ?string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    $tmp = $file['tmp_name'] ?? '';
    if (($file['error'] ?? null) !== UPLOAD_ERR_OK || !is_uploaded_file($tmp) || filesize($tmp) > 2*1024*1024) {
        throw new InvalidArgumentException('Ảnh mỗi giai đoạn phải nhỏ hơn hoặc bằng 2 MB.');
    }
    $image = @getimagesize($tmp);
    $extensions = [IMAGETYPE_GIF=>'gif',IMAGETYPE_JPEG=>'jpg',IMAGETYPE_PNG=>'png',IMAGETYPE_WEBP=>'webp'];
    if (!$image || !isset($extensions[$image[2]]) || min($image[0],$image[1]) < 1 || max($image[0],$image[1]) > 2048) {
        throw new InvalidArgumentException('Chỉ nhận GIF, PNG, JPG hoặc WebP tối đa 2048 × 2048 px.');
    }
    $dir = __DIR__.'/uploads/kpi';
    if (!is_dir($dir) && !@mkdir($dir,0755,true) && !is_dir($dir)) throw new RuntimeException('Không tạo được thư mục KPI.');
    $relative = 'uploads/kpi/'.bin2hex(random_bytes(16)).'.'.$extensions[$image[2]];
    $path = __DIR__.'/'.$relative;
    if (!move_uploaded_file($tmp,$path)) throw new RuntimeException('Không lưu được ảnh KPI.');
    if (!chmod($path,0644)) {
        @unlink($path);
        throw new RuntimeException('Không đặt được quyền đọc ảnh KPI.');
    }
    return $relative;
}

function save_kpi_settings(PDO $db, array $input, array $files): void {
    $target = filter_var($input['target_amount'] ?? '', FILTER_VALIDATE_INT, ['options'=>['min_range'=>0,'max_range'=>1000000000]]);
    $count = filter_var($input['stage_count'] ?? '', FILTER_VALIDATE_INT);
    $keys = is_array($input['stage_order'] ?? null) ? array_values($input['stage_order']) : [];
    $expected = array_keys(kpi_default_stages());
    $sorted = $keys;
    sort($sorted);
    if ($target === false || !in_array($count,[4,5],true) || $sorted !== $expected) {
        throw new InvalidArgumentException('Kiểm tra mục tiêu và thứ tự các mốc KPI.');
    }
    ensure_kpi_state($db);
    $added = [];
    $replaced = [];
    $db->beginTransaction();
    try {
        $row = $db->query('SELECT stage_images,base_image FROM donation_kpi_state WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
        $old = $row['stage_images'] === null ? kpi_default_stages() : json_decode($row['stage_images'],true,16,JSON_THROW_ON_ERROR);
        $old['base'] = $row['base_image'];
        foreach (array_merge($keys,['base']) as $key) {
            $new = store_kpi_image($files['kpi_'.$key] ?? []);
            if ($new === null) continue;
            $added[] = $new;
            $replaced[] = $old[$key];
            $old[$key] = $new;
        }
        $ordered = [];
        foreach ($keys as $key) $ordered[$key] = $old[$key];
        $db->prepare('UPDATE donation_kpi_state SET target_amount=?,stage_count=?,stage_images=?,base_image=?,event_at=NULL WHERE id=1')
           ->execute([$target,$count,json_encode($ordered,JSON_THROW_ON_ERROR),$old['base']]);
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        foreach ($added as $path) @unlink(__DIR__.'/'.$path);
        throw $error;
    }
    foreach ($replaced as $path) {
        if (is_string($path) && preg_match('~^uploads/kpi/[a-f0-9]{32}\.(gif|jpg|png|webp)$~D',$path)) @unlink(__DIR__.'/'.$path);
    }
}
