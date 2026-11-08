<?php
const DONATE_SOUND_FILE = 'uploads/donate-sound.mp3';
const DONATE_SOUND_MAX_BYTES = 2 * 1024 * 1024;

function donate_sound_url(): ?string {
    $file = __DIR__ . '/' . DONATE_SOUND_FILE;
    if (!is_file($file)) return null;
    $hash = @hash_file('sha256', $file);
    return $hash ? DONATE_SOUND_FILE . '?v=' . substr($hash, 0, 16) : null;
}

function save_donate_sound(array $file): void {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK ||
        !is_string($file['tmp_name'] ?? null) || !is_uploaded_file($file['tmp_name']) ||
        $file['size'] < 1 || $file['size'] > DONATE_SOUND_MAX_BYTES ||
        (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) !== 'audio/mpeg') {
        throw new InvalidArgumentException('Chọn tệp âm thanh MP3 hợp lệ, tối đa 2 MB.');
    }
    $destination = __DIR__ . '/' . DONATE_SOUND_FILE;
    $directory = dirname($destination);
    if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException('Không tạo được thư mục âm thanh donate.');
    }
    $temporary = tempnam($directory, 'donate-sound-');
    if ($temporary === false) throw new RuntimeException('Không tạo được tệp âm thanh tạm.');
    try {
        if (!move_uploaded_file($file['tmp_name'], $temporary) || !chmod($temporary, 0644) ||
            !rename($temporary, $destination)) {
            throw new RuntimeException('Không lưu được âm thanh donate.');
        }
    } finally {
        if (is_file($temporary)) unlink($temporary);
    }
}

function reset_donate_sound(): void {
    $file = __DIR__ . '/' . DONATE_SOUND_FILE;
    if (is_file($file) && !unlink($file)) throw new RuntimeException('Không đặt lại được âm thanh donate.');
}
