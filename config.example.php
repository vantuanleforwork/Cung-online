<?php
// Copy to config.php and fill in deployment-specific values. Never commit config.php.
date_default_timezone_set('Asia/Ho_Chi_Minh');
ini_set('display_errors', '0');
ini_set('log_errors', '1');

const DB_DSN = 'mysql:host=localhost;dbname=your_database;charset=utf8mb4';
const DB_USER = 'your_database_user';
const DB_PASS = '';
const BANK_ID = 'MB';
const ACCOUNT_NO = '';
const ACCOUNT_NAME = '';
const PAY2S_SECRET = '';
const OVERLAY_KEY = '';
const PREFIX = 'DNTVTL';
const MIN_AMOUNT = 10000;
const OVERLAY_LEASE_SECONDS = 60;
const ANON_FALLBACK = false;
const REQUIRE_REVIEW = true;
const FPT_TTS_API_KEY = '';
const ADMIN_PASSWORD_HASH = '';
const BLOCKED = [];
const GOOGLE_CLIENT_ID = '';
const GOOGLE_CLIENT_SECRET = '';
const GOOGLE_REDIRECT_URI = 'https://your-domain.example/google-callback.php';
const DONOR_ID_HMAC_KEY = '';

function db() {
    static $p;
    return $p ??= new PDO(DB_DSN, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
}
function tier(int $a) { return $a >= 200000 ? 3 : ($a >= 50000 ? 2 : 1); }
function maxlen(int $a) { return tier($a) === 1 ? 100 : 225; }
function clean($s, $max) {
    $s = preg_replace('/[\\x00-\\x1F\\x7F]/u', ' ', (string)$s);
    $s = trim(mb_substr($s, 0, $max));
    foreach (BLOCKED as $w) $s = str_ireplace($w, '***', $s);
    return $s;
}
