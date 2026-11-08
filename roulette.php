<?php
function ensure_roulette_schema(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS roulette_wheels (
        id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
        minimum INT NOT NULL, options_json TEXT NOT NULL, active TINYINT NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $db->exec("CREATE TABLE IF NOT EXISTS roulette_spins (
        donation_id INT PRIMARY KEY, snapshot TEXT NOT NULL,
        FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function roulette_save(PDO $db, array $input): void {
    $id = filter_var($input['id'] ?? 0, FILTER_VALIDATE_INT);
    $minimum = filter_var($input['minimum'] ?? null, FILTER_VALIDATE_INT);
    $name = clean(is_string($input['name'] ?? null) ? $input['name'] : '', 100);
    $labels = $input['option_label'] ?? null;
    $frequencies = $input['option_frequency'] ?? null;
    if ($id === false || $id < 0 || $name === '' || $minimum < 1000 || $minimum > 50000000 ||
        !is_array($labels) || !is_array($frequencies) || count($labels) < 1 || count($labels) > 16 ||
        array_keys($labels) !== array_keys($frequencies)) {
        throw new InvalidArgumentException('Nhập tên vòng, mức donate từ 1.000đ đến 50.000.000đ và từ 1 đến 16 ô.');
    }
    $options = [];
    foreach ($labels as $index => $label) {
        $label = is_string($label) ? clean($label, 48) : '';
        $frequency = filter_var($frequencies[$index], FILTER_VALIDATE_INT);
        if ($label === '' || $frequency === false || $frequency < 0 || $frequency > 10000) {
            throw new InvalidArgumentException('Mỗi ô cần tên và tần suất nguyên từ 0 đến 10.000.');
        }
        $options[] = ['label'=>$label, 'frequency'=>$frequency];
    }
    if (array_sum(array_column($options, 'frequency')) === 0) throw new InvalidArgumentException('Ít nhất một ô phải có tần suất lớn hơn 0.');
    ensure_roulette_schema($db);
    $values = [$name, $minimum, json_encode($options, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), (int)isset($input['active'])];
    if ($id) {
        $db->prepare('UPDATE roulette_wheels SET name=?,minimum=?,options_json=?,active=? WHERE id=?')->execute([...$values, $id]);
    } else {
        $db->prepare('INSERT INTO roulette_wheels(name,minimum,options_json,active) VALUES(?,?,?,?)')->execute($values);
    }
}

function roulette_options(array $wheel): array {
    $options = json_decode($wheel['options_json'], true, 32, JSON_THROW_ON_ERROR);
    if (!$options || isset($options[0]['frequency'])) return $options;
    $count = count($options);
    $equal = true;
    foreach ($options as $index => $option) {
        $equal = $equal && $option['weight'] === intdiv(10000, $count) + (int)($index < 10000 % $count);
    }
    return array_map(static fn($option) => ['label'=>$option['label'], 'frequency'=>$equal ? 1 : $option['weight']], $options);
}

function roulette_snapshot(array $wheel): array {
    $options = roulette_options($wheel);
    $draw = random_int(1, array_sum(array_column($options, 'frequency')));
    foreach ($options as $index => $option) {
        $draw -= $option['frequency'];
        if ($draw <= 0) return ['name'=>$wheel['name'], 'options'=>array_column($options, 'label'), 'winner'=>$index];
    }
    throw new RuntimeException('Invalid roulette weights');
}

function roulette_queue_test(PDO $db, array $input): void {
    $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id) throw new InvalidArgumentException('Hãy lưu vòng quay trước khi bắn test OBS.');
    ensure_roulette_schema($db);
    $db->beginTransaction();
    try {
        $query = $db->prepare('SELECT * FROM roulette_wheels WHERE id=? FOR UPDATE');
        $query->execute([$id]);
        $wheel = $query->fetch(PDO::FETCH_ASSOC);
        if (!$wheel) throw new InvalidArgumentException('Không tìm thấy vòng quay đã lưu.');
        $spin = json_encode(roulette_snapshot($wheel), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $db->prepare("INSERT INTO donations(name,expected_amount,paid_amount,required_amount,status,queue_state,is_test,donation_kind)
            VALUES ('Test OBS',?,?,?,'paid','queued',1,'roulette')")
           ->execute([$wheel['minimum'], $wheel['minimum'], $wheel['minimum']]);
        $db->prepare('INSERT INTO roulette_spins(donation_id,snapshot) VALUES(?,?)')->execute([$db->lastInsertId(), $spin]);
        $db->commit();
    } catch (Throwable $error) {
        $db->rollBack();
        throw $error;
    }
}

function roulette_spin(PDO $db, int $donationId): ?array {
    $query = $db->prepare('SELECT snapshot FROM roulette_spins WHERE donation_id=?');
    $query->execute([$donationId]);
    $snapshot = $query->fetchColumn();
    return $snapshot === false ? null : json_decode($snapshot, true, 32, JSON_THROW_ON_ERROR);
}
