<?php
const DONATE_SOUND_FILE = 'uploads/donate-sound.mp3';
const DONATE_SOUND_VOLUME_FILE = 'uploads/donate-sound-volume.json';
const DONATE_SOUND_MAX_BYTES = 2 * 1024 * 1024;

function donate_sound_volume(PDO $db): int {
    $path = __DIR__.'/'.DONATE_SOUND_VOLUME_FILE;
    if (is_file($path)) {
        $raw = @file_get_contents($path, false, null, 0, 32);
        $saved = is_string($raw) ? json_decode($raw, true) : null;
        if (is_int($saved) && $saved >= 0 && $saved <= 100) return $saved;
    }
    return (int)(donation_settings($db)['donate_sound_volume'] ?? 100);
}

function save_donate_sound_volume($input): void {
    $volume = filter_var($input, FILTER_VALIDATE_INT, ['options'=>['min_range'=>0,'max_range'=>100]]);
    if ($volume === false) throw new InvalidArgumentException('Âm lượng phải từ 0 đến 100%.');
    $destination = __DIR__.'/'.DONATE_SOUND_VOLUME_FILE;
    $directory = dirname($destination);
    if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException('Không tạo được thư mục lưu âm lượng.');
    }
    if (!is_writable($directory)) throw new RuntimeException('Thư mục lưu âm lượng chưa có quyền ghi.');
    $temporary = @tempnam($directory, 'donate-volume-');
    if ($temporary === false) throw new RuntimeException('Không tạo được tệp âm lượng tạm.');
    try {
        $contents = json_encode($volume, JSON_THROW_ON_ERROR);
        if (@file_put_contents($temporary, $contents) !== strlen($contents) ||
            !@chmod($temporary, 0644) || !@rename($temporary, $destination)) {
            throw new RuntimeException('Không ghi được cấu hình âm lượng.');
        }
    } finally {
        if (is_file($temporary)) @unlink($temporary);
    }
}

function donate_sound_url(): ?string {
    $file = __DIR__ . '/' . DONATE_SOUND_FILE;
    if (!is_file($file)) return null;
    $hash = @hash_file('sha256', $file);
    return $hash ? DONATE_SOUND_FILE . '?v=' . substr($hash, 0, 16) : null;
}

// Read Layer III headers directly so uploads also work when PHP Fileinfo is disabled.
function donate_mp3_frame(string $data, int $offset): ?array {
    if ($offset + 4 > strlen($data)) return null;
    $version = (ord($data[$offset + 1]) >> 3) & 3;
    $layer = (ord($data[$offset + 1]) >> 1) & 3;
    if (ord($data[$offset]) !== 255 || (ord($data[$offset + 1]) & 224) !== 224 || $version === 1 || $layer !== 1) {
        return null;
    }
    $rateByte = ord($data[$offset + 2]);
    $rateIndex = ($rateByte >> 2) & 3;
    $bitrateIndex = $rateByte >> 4;
    if ($rateIndex === 3 || $bitrateIndex === 0 || $bitrateIndex === 15) return null;
    $bitrate = ($version === 3
        ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]
        : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[$bitrateIndex];
    $sampleRate = [44100,48000,32000][$rateIndex] >> ([0=>2,2=>1,3=>0][$version]);
    $length = intdiv(($version === 3 ? 144000 : 72000) * $bitrate, $sampleRate) + (($rateByte >> 1) & 1);
    return [$version, $sampleRate, $length];
}

function is_donate_mp3(string $data): bool {
    $offset = 0;
    if (strlen($data) >= 10 && strncmp($data, 'ID3', 3) === 0) {
        $tagLength = 0;
        for ($i = 6; $i < 10; $i++) {
            $byte = ord($data[$i]);
            if ($byte > 127) return false;
            $tagLength = ($tagLength << 7) | $byte;
        }
        $offset = 10 + $tagLength;
    }
    $limit = min(strlen($data) - 4, $offset + 4096);
    for (; $offset <= $limit; $offset++) {
        $frame = donate_mp3_frame($data, $offset);
        if ($frame === null) continue;
        $next = donate_mp3_frame($data, $offset + $frame[2]);
        if ($next !== null && $frame[0] === $next[0] && $frame[1] === $next[1]
            && $offset + $frame[2] + $next[2] <= strlen($data)) return true;
    }
    return false;
}

function save_donate_sound(array $file): void {
    $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if (in_array($error, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
        throw new InvalidArgumentException('Tệp MP3 vượt giới hạn tải lên của hosting. Hãy chọn tệp nhỏ hơn 2 MB.');
    }
    if ($error === UPLOAD_ERR_NO_FILE) throw new InvalidArgumentException('Hãy chọn tệp MP3 trước khi lưu.');
    if ($error === UPLOAD_ERR_PARTIAL) throw new InvalidArgumentException('Tệp MP3 tải lên chưa đủ. Hãy thử lại.');
    if ($error !== UPLOAD_ERR_OK) throw new RuntimeException('Hosting không nhận được tệp MP3.');
    $uploaded = $file['tmp_name'] ?? null;
    if (!is_string($uploaded) || !is_uploaded_file($uploaded)) throw new RuntimeException('Không đọc được tệp MP3 đã tải lên.');
    $data = @file_get_contents($uploaded, false, null, 0, DONATE_SOUND_MAX_BYTES + 1);
    if ($data === false) throw new RuntimeException('Không đọc được tệp MP3 đã tải lên.');
    if (strlen($data) > DONATE_SOUND_MAX_BYTES) throw new InvalidArgumentException('Tệp MP3 phải nhỏ hơn hoặc bằng 2 MB.');
    if (!is_donate_mp3($data)) throw new InvalidArgumentException('Tệp không chứa âm thanh MP3 hợp lệ.');

    $destination = __DIR__ . '/' . DONATE_SOUND_FILE;
    $directory = dirname($destination);
    if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException('Không tạo được thư mục âm thanh donate.');
    }
    if (!is_writable($directory)) throw new RuntimeException('Thư mục uploads trên hosting chưa có quyền ghi.');
    $temporary = @tempnam($directory, 'donate-sound-');
    if ($temporary === false) throw new RuntimeException('Không tạo được tệp âm thanh tạm.');
    try {
        if (!@move_uploaded_file($uploaded, $temporary) || !@chmod($temporary, 0644) ||
            !@rename($temporary, $destination)) {
            throw new RuntimeException('Không ghi được tệp âm thanh vào thư mục uploads trên hosting.');
        }
    } finally {
        if (is_file($temporary)) @unlink($temporary);
    }
}

function reset_donate_sound(): void {
    $file = __DIR__ . '/' . DONATE_SOUND_FILE;
    if (is_file($file) && !unlink($file)) throw new RuntimeException('Không đặt lại được âm thanh donate.');
}
