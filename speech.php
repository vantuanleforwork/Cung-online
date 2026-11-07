<?php
require_once __DIR__ . '/common.php';
require_once __DIR__ . '/elevenlabs.php';
require_once __DIR__ . '/custom-voice.php';

function fpt_api_key() { return getenv('FPT_TTS_API_KEY') ?: (defined('FPT_TTS_API_KEY') ? FPT_TTS_API_KEY : ''); }
function fpt_voices() {
    return ['banmai' => 'Ban Mai · nữ miền Bắc', 'thuminh' => 'Thu Minh · nữ miền Bắc',
        'leminh' => 'Lê Minh · nam miền Bắc', 'lannhi' => 'Lan Nhi · nữ miền Nam',
        'linhsan' => 'Linh San · nữ miền Nam', 'myan' => 'Mỹ An · nữ miền Trung', 'giahuy' => 'Gia Huy · nam miền Trung'];
}
function offering(int $amount) { return [1 => 'thắp hương', 2 => 'dâng hoa quả', 3 => 'dâng gà luộc'][tier($amount)]; }

function money_words(int $amount) {
    if ($amount === 0) return 'không đồng';
    $digits = ['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
    $units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ', 'tỷ tỷ'];
    $groups = [];
    while ($amount > 0) { $groups[] = $amount % 1000; $amount = intdiv($amount, 1000); }
    $parts = [];
    for ($i = count($groups) - 1; $i >= 0; $i--) {
        $n = $groups[$i];
        if ($n === 0) continue;
        $h = intdiv($n, 100); $t = intdiv($n % 100, 10); $u = $n % 10;
        $words = [];
        $full = $h > 0 || count($parts) > 0;
        if ($full) $words[] = $digits[$h] . ' trăm';
        if ($t >= 2) $words[] = $digits[$t] . ' mươi';
        elseif ($t === 1) $words[] = 'mười';
        elseif ($u > 0 && $full) $words[] = 'lẻ';
        if ($u > 0) $words[] = ($u === 1 && $t >= 2) ? 'mốt' : (($u === 5 && $t >= 1) ? 'lăm' : $digits[$u]);
        if ($units[$i] !== '') $words[] = $units[$i];
        $parts[] = implode(' ', $words);
    }
    return implode(' ', $parts) . ' đồng';
}

function speech_text(array $donation, array $settings) {
    $amount = (int)$donation['paid_amount'];
    $message = trim((string)($donation['message'] ?? ''));
    $name = trim((string)($donation['name'] ?? '')) ?: 'Ẩn danh';
    $amountFormatted = number_format($amount, 0, ',', '.') . ' đồng';
    $amountNum = number_format($amount, 0, ',', '.');
    $amountWords = money_words($amount);
    $messageClause = $message === '' ? '' : 'Với lời nhắn: ' . $message;

    $replace = [
        '{user}' => $name,
        '{name}' => $name,
        '{amount}' => $amountFormatted,
        '{so_tien}' => $amountFormatted,
        '{amount_num}' => $amountNum,
        '{amount_words}' => $amountWords,
        '{message}' => $message,
        '{noi_dung}' => $message,
        '{content}' => $message,
        '{message_clause}' => $messageClause,
        '{offering}' => offering($amount),
    ];
    $text = strtr($settings['speech_template'], $replace);
    return trim(preg_replace('/\s+/u', ' ', $text));
}
function speech_options(array $settings) {
    // Only these public options are ever sent to the overlay. Never expose credentials.
    return ['enabled' => (bool)$settings['speech_enabled'], 'provider' => $settings['speech_provider'],
        'voice' => $settings['speech_voice'], 'rate' => (float)$settings['speech_rate'],
        'volume' => (float)$settings['speech_volume'],
        'display_seconds' => max(8, min(30, (int)$settings['display_seconds'])),
        'eleven_voice_id' => $settings['eleven_voice_id'] ?? '', 'eleven_model' => $settings['eleven_model'] ?? 'eleven_flash_v2_5',
        'tier1_voice_id' => $settings['tier1_voice_id'] ?? '',
        'tier2_voice_id' => $settings['tier2_voice_id'] ?? '',
        'tier3_voice_id' => $settings['tier3_voice_id'] ?? '',
        'custom_api_url' => $settings['custom_api_url'] ?? 'https://api.vibi.pro/v1',
        'custom_api_engine' => $settings['custom_api_engine'] ?? 'elevenlabs',
        'custom_api_model' => $settings['custom_api_model'] ?? 'eleven_flash_v2_5', 'custom_voice_id' => $settings['custom_voice_id'] ?? ''];
}
function speech_options_for_donation(array $settings, array $donation) {
    $options = speech_options($settings);
    $amount = (int)($donation['paid_amount'] ?? $donation['expected_amount'] ?? 10000);
    $t = tier($amount);
    $activeVoice = '';
    if (!empty($donation['selected_voice_id'])) {
        $activeVoice = trim((string)$donation['selected_voice_id']);
    }
    if ($activeVoice === '') {
        if ($t === 1) {
            $activeVoice = trim((string)($settings['tier1_voice_id'] ?? ''));
        } elseif ($t === 2) {
            $activeVoice = trim((string)($settings['tier2_voice_id'] ?? '')) ?: trim((string)($settings['tier1_voice_id'] ?? ''));
        } else {
            $activeVoice = trim((string)($settings['tier3_voice_id'] ?? '')) ?: (trim((string)($settings['tier2_voice_id'] ?? '')) ?: trim((string)($settings['tier1_voice_id'] ?? '')));
        }
    }
    if ($activeVoice === '') {
        $activeVoice = $options['custom_voice_id'] ?: $options['eleven_voice_id'];
    }
    $options['custom_voice_id'] = $activeVoice;
    $options['eleven_voice_id'] = $activeVoice;
    $options['tier'] = $t;
    if ($options['provider'] === 'browser' && !empty($activeVoice)) {
        try {
            $hasCustom = custom_api_key(db(), $options['custom_api_url'] ?? 'https://api.vibi.pro/v1') !== '';
            $hasEleven = eleven_api_key(db()) !== '';
            if ($hasCustom) {
                $options['provider'] = 'custom_api';
            } elseif ($hasEleven) {
                $options['provider'] = 'elevenlabs';
            }
        } catch (Throwable $ignore) {}
    }
    return $options;
}
function provider_audio(PDO $db, string $text, array $options, ?string $elevenKey = null, ?string $customKey = null) {
    $voiceId = trim((string)($options['custom_voice_id'] ?: $options['eleven_voice_id'] ?: ''));
    $isUuid = (bool)preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $voiceId);
    $isMinimaxNumeric = (bool)preg_match('/^\d{10,25}$/', $voiceId);
    $isElevenlabsId = (bool)preg_match('/^[A-Za-z0-9]{18,24}$/', $voiceId);
    
    // Nếu Voice ID là dạng UUID (vibi.pro / minimax) nhưng đang để provider elevenlabs trực tiếp:
    if (($isUuid || $isMinimaxNumeric) && $options['provider'] === 'elevenlabs') {
        $vibiKey = $customKey ?: custom_api_key($db, $options['custom_api_url'] ?? 'https://api.vibi.pro/v1');
        if ($vibiKey !== '') {
            $options['provider'] = 'custom_api';
            $options['custom_voice_id'] = $voiceId;
            return custom_audio($db, $text, $options, $vibiKey);
        }
    }

    // Nếu Voice ID là dạng ElevenLabs ID nhưng provider đang để custom_api:
    // vibi.pro hỗ trợ cả ElevenLabs ID qua endpoint /v1/text-to-speech/{voice_id} (provider=elevenlabs).
    // Nhưng nếu custom_api không có key mà ElevenLabs trực tiếp có key:
    if ($isElevenlabsId && $options['provider'] === 'custom_api') {
        $vibiKey = $customKey ?: custom_api_key($db, $options['custom_api_url'] ?? 'https://api.vibi.pro/v1');
        if ($vibiKey === '') {
            $elKey = $elevenKey ?: eleven_api_key($db);
            if ($elKey !== '') {
                $options['provider'] = 'elevenlabs';
                $options['eleven_voice_id'] = $voiceId;
                return eleven_audio($db, $text, $options, $elKey);
            }
        }
    }

    if ($options['provider'] === 'custom_api') {
        if (empty($options['custom_voice_id'])) throw new SpeechProviderException('Cần chọn Voice ID cho Custom API Voice trước khi tạo giọng.');
        return custom_audio($db, $text, $options, $customKey);
    }
    if ($options['provider'] === 'elevenlabs') {
        if (empty($options['eleven_voice_id'])) throw new SpeechProviderException('Cần chọn Voice ID ElevenLabs trước khi tạo giọng.');
        return eleven_audio($db, $text, $options, $elevenKey);
    }
    return fpt_audio($db, $text, $options);
}
function preview_donation() { return ['name' => 'Nguyễn Văn An', 'paid_amount' => 10000, 'tier' => 1, 'message' => 'Chúc kênh livestream phát triển thuận lợi, vạn sự như ý!']; }

function fpt_audio(PDO $db, string $text, array $options) {
    if (!function_exists('curl_init') || fpt_api_key() === '') throw new RuntimeException('Cần cấu hình API key FPT.AI và bật PHP cURL.');
    $speed = max(-3, min(3, (int)round(($options['rate'] - 1) * 6)));
    $key = hash('sha256', $text . '|' . $options['voice'] . '|' . $speed);
    // Prevent parallel requests from billing twice for the same text/voice.
    $s = $db->prepare("INSERT IGNORE INTO tts_audio_cache(cache_key,state) VALUES(?,'generating')");
    $s->execute([$key]);
    if ($s->rowCount() === 0) {
        $s = $db->prepare('SELECT state,audio_url FROM tts_audio_cache WHERE cache_key=?'); $s->execute([$key]);
        $row = $s->fetch(PDO::FETCH_ASSOC);
        if ($row['state'] === 'ready') return $row['audio_url'];
        if ($row['state'] === 'failed') throw new RuntimeException('Tạo giọng FPT.AI thất bại. Kiểm tra API key/hạn mức; xóa bộ nhớ giọng trong admin để thử lại.');
        return null;
    }
    try {
        $curl = curl_init('https://api.fpt.ai/hmi/tts/v5');
        curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $text,
            CURLOPT_HTTPHEADER => ['api_key: ' . fpt_api_key(), 'voice: ' . $options['voice'], 'speed: ' . $speed, 'format: mp3', 'Content-Type: text/plain; charset=utf-8'],
            CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 20]);
        $raw = curl_exec($curl); $status = curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
        $response = is_string($raw) ? json_decode($raw, true) : null;
        $url = $response['async'] ?? '';
        $host = is_string($url) ? (parse_url($url, PHP_URL_HOST) ?: '') : '';
        if ($status !== 200 || !is_array($response) || (int)($response['error'] ?? -1) !== 0 ||
            !is_string($url) || parse_url($url, PHP_URL_SCHEME) !== 'https' ||
            !preg_match('/(^|\.)(amazonaws\.com|fpt\.ai)$/iD', $host)) {
            throw new RuntimeException('FPT.AI chưa tạo được âm thanh. Kiểm tra API key và hạn mức dịch vụ.');
        }
        $db->prepare("UPDATE tts_audio_cache SET state='ready',audio_url=? WHERE cache_key=?")->execute([$url, $key]);
        return $url;
    } catch (Throwable $e) {
        $db->prepare("UPDATE tts_audio_cache SET state='failed' WHERE cache_key=?")->execute([$key]);
        throw $e;
    }
}
