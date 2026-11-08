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
    $lines = preg_split('/\R/u', trim(is_string($input['options'] ?? null) ? $input['options'] : ''));
    $lines = array_values(array_filter(array_map('trim', $lines ?: []), 'strlen'));
    $count = count($lines);
    if ($id === false || $id < 0 || $name === '' || $minimum < 1000 || $minimum > 50000000 || $count < 1 || $count > 16) {
        throw new InvalidArgumentException('Nhập tên vòng, mức donate từ 1.000đ đến 50.000.000đ và từ 1 đến 16 ô.');
    }
    $options = [];
    $custom = false;
    foreach ($lines as $line) {
        [$label, $percent] = array_pad(explode('|', $line, 2), 2, '');
        $label = clean($label, 48);
        $percent = trim($percent);
        if ($label === '' || ($percent !== '' && !preg_match('/^\d{1,3}(?:[.,]\d{1,2})?$/D', $percent))) {
            throw new InvalidArgumentException('Mỗi ô cần tên. Tỉ lệ có thể có tối đa hai chữ số thập phân.');
        }
        $custom = $custom || $percent !== '';
        $options[] = ['label'=>$label, 'weight'=>$percent === '' ? null : (int)round((float)str_replace(',', '.', $percent) * 100)];
    }
    foreach ($options as $index => &$option) {
        if (!$custom) $option['weight'] = intdiv(10000, $count) + (int)($index < 10000 % $count);
        if ($option['weight'] === null) throw new InvalidArgumentException('Điền tỉ lệ cho tất cả các ô hoặc để trống tất cả.');
    }
    unset($option);
    if (array_sum(array_column($options, 'weight')) !== 10000) throw new InvalidArgumentException('Tổng tỉ lệ phải bằng 100%.');
    ensure_roulette_schema($db);
    $values = [$name, $minimum, json_encode($options, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), (int)isset($input['active'])];
    if ($id) {
        $db->prepare('UPDATE roulette_wheels SET name=?,minimum=?,options_json=?,active=? WHERE id=?')->execute([...$values, $id]);
    } else {
        $db->prepare('INSERT INTO roulette_wheels(name,minimum,options_json,active) VALUES(?,?,?,?)')->execute($values);
    }
}

function roulette_snapshot(array $wheel): array {
    $options = json_decode($wheel['options_json'], true, 32, JSON_THROW_ON_ERROR);
    $draw = random_int(1, 10000);
    foreach ($options as $index => $option) {
        $draw -= $option['weight'];
        if ($draw <= 0) return ['name'=>$wheel['name'], 'options'=>array_column($options, 'label'), 'winner'=>$index];
    }
    throw new RuntimeException('Invalid roulette weights');
}

function roulette_spin(PDO $db, int $donationId): ?array {
    $query = $db->prepare('SELECT snapshot FROM roulette_spins WHERE donation_id=?');
    $query->execute([$donationId]);
    $snapshot = $query->fetchColumn();
    return $snapshot === false ? null : json_decode($snapshot, true, 32, JSON_THROW_ON_ERROR);
}
