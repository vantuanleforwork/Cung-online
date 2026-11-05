<?php
// Không triển khai công cụ này vào vùng web công khai.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
fwrite(STDOUT, "Nhập mật khẩu quản trị (ít nhất 12 ký tự; nhập liệu có thể hiện trên terminal): ");
$password = rtrim(fgets(STDIN), "\r\n");
if (strlen($password) < 12) { fwrite(STDERR, "Mật khẩu quá ngắn.\n"); exit(1); }
fwrite(STDOUT, "Dán giá trị này vào ADMIN_PASSWORD_HASH trong config.php:\n" . password_hash($password, PASSWORD_DEFAULT) . "\n");
