<?php
require_once __DIR__ . '/common.php';

class SpeechProviderException extends RuntimeException {}

function eleven_models() {
    return ['eleven_flash_v2_5' => 'Flash v2.5 · nhanh, hỗ trợ tiếng Việt', 'eleven_v3' => 'Eleven v3 · giàu biểu cảm, hỗ trợ tiếng Việt'];
}
function posted_eleven_key(array $in) {
    $raw = $in['eleven_api_key'] ?? '';
    if (!is_string($raw)) throw new InvalidArgumentException('API key ElevenLabs không hợp lệ.');
    $key = trim($raw);
    if (strlen($key) > 512 || ($key !== '' && preg_match('/[^\x21-\x7E]/', $key))) {
        throw new InvalidArgumentException('API key ElevenLabs không hợp lệ. Dán nguyên khóa, không thêm khoảng trắng.');
    }
    return $key;
}
function eleven_api_key(PDO $db) {
    $s = $db->query("SELECT api_key FROM tts_credentials WHERE provider='elevenlabs'");
    $key = $s->fetchColumn();
    return $key ?: (getenv('ELEVENLABS_API_KEY') ?: (defined('ELEVENLABS_API_KEY') ? ELEVENLABS_API_KEY : ''));
}
function eleven_request(string $text, array $options) {
    return ['text' => $text, 'model_id' => $options['eleven_model'], 'language_code' => 'vi',
        'voice_settings' => ['stability' => .5, 'similarity_boost' => .75, 'speed' => min(1.2, max(.75, (float)$options['rate']))]];
}
function eleven_cache_key(string $text, array $options, string $apiKey) {
    return hash('sha256', 'elevenlabs|' . json_encode(eleven_request($text, $options), JSON_UNESCAPED_UNICODE) .
        '|' . $options['eleven_voice_id'] . '|' . hash('sha256', $apiKey));
}
function local_audio_url(string $cacheKey) {
    $expires = time() + 3600;
    $signature = hash_hmac('sha256', 'tts-audio|' . $cacheKey . '|' . $expires, OVERLAY_KEY);
    return 'audio.php?' . http_build_query(['file' => $cacheKey, 'expires' => $expires, 'sig' => $signature]);
}
function eleven_error(int $status, string $code = '') {
    if (in_array($code, ['quota_exceeded','insufficient_credits','payment_required'], true) || $status === 402) return 'Tài khoản ElevenLabs đã hết hạn mức hoặc số dư. Kiểm tra tài khoản trước khi thử lại.';
    if ($code === 'voice_not_found') return 'Không tìm thấy Voice ID ElevenLabs hoặc tài khoản chưa được phép dùng giọng này.';
    if ($status === 401) return 'API key ElevenLabs không đúng hoặc đã bị thu hồi.';
    if ($status === 403) return 'ElevenLabs từ chối quyền truy cập. Kiểm tra quyền Text to Speech và quyền dùng giọng.';
    if ($status === 404) return 'Không tìm thấy Voice ID ElevenLabs hoặc tài khoản chưa được phép dùng giọng này.';
    if ($status === 429) return 'ElevenLabs đang giới hạn yêu cầu hoặc tài khoản đã hết hạn mức. Kiểm tra tài khoản rồi thử lại.';
    if ($status === 400 || $status === 422) return 'ElevenLabs không chấp nhận cấu hình giọng/model hoặc nội dung đọc.';
    return 'Chưa kết nối được ElevenLabs. Kiểm tra cURL, kết nối ra ngoài của hosting và thử lại.';
}
function eleven_audio(PDO $db, string $text, array $options, ?string $overrideKey = null) {
    $apiKey = $overrideKey ?: eleven_api_key($db);
    if ($apiKey === '' || !function_exists('curl_init')) throw new SpeechProviderException('Cần nhập API key ElevenLabs trong admin và bật PHP cURL.');
    if (mb_strlen($text) > 4500) throw new SpeechProviderException('Câu đọc quá dài. Hãy rút gọn mẫu câu và tránh lặp lại biến lời nhắn.');
    $key = eleven_cache_key($text, $options, $apiKey);
    $s = $db->prepare("INSERT IGNORE INTO tts_audio_cache(cache_key,state) VALUES(?,'generating')"); $s->execute([$key]);
    $owner = $s->rowCount() === 1;
    if (!$owner) {
        $s = $db->prepare('SELECT state,(audio_content IS NOT NULL) AS has_audio FROM tts_audio_cache WHERE cache_key=?'); $s->execute([$key]);
        $row = $s->fetch(PDO::FETCH_ASSOC);
        if ($row['state'] === 'ready' && $row['has_audio']) return local_audio_url($key);
        if ($row['state'] === 'failed') throw new SpeechProviderException('Lần tạo giọng ElevenLabs trước đã lỗi. Kiểm tra key/hạn mức và xóa bộ nhớ giọng trong admin để thử lại.');
        // A killed PHP request must not leave the cache stuck forever; generation timeout is 20s.
        $s = $db->prepare("UPDATE tts_audio_cache SET state='generating',created_at=NOW() WHERE cache_key=? AND state='generating' AND created_at<NOW()-INTERVAL 2 MINUTE");
        $s->execute([$key]); if ($s->rowCount() === 0) return null;
    }
    try {
        $audio = ''; $limit = 3 * 1024 * 1024;
        $curl = curl_init('https://api.elevenlabs.io/v1/text-to-speech/' . rawurlencode($options['eleven_voice_id']) . '?output_format=mp3_44100_128');
        curl_setopt_array($curl, [CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode(eleven_request($text, $options), JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => ['xi-api-key: ' . $apiKey, 'Content-Type: application/json', 'Accept: audio/mpeg'],
            CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 20,
            CURLOPT_WRITEFUNCTION => function ($handle, $chunk) use (&$audio, $limit) {
                if (strlen($audio) + strlen($chunk) > $limit) return 0;
                $audio .= $chunk; return strlen($chunk);
            }]);
        $ok = curl_exec($curl); $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $type = (string)curl_getinfo($curl, CURLINFO_CONTENT_TYPE); curl_close($curl);
        if ($ok === false || $status !== 200 || stripos($type, 'audio/') !== 0 || strlen($audio) < 10) {
            $errorData = json_decode($audio, true);
            $detail = is_array($errorData) && is_array($errorData['detail'] ?? null) ? $errorData['detail'] : [];
            $code = $detail['status'] ?? $detail['code'] ?? '';
            throw new SpeechProviderException(eleven_error($status, is_string($code) ? $code : ''));
        }
        $s = $db->prepare("UPDATE tts_audio_cache SET state='ready',audio_content=? WHERE cache_key=?");
        $s->bindValue(1, $audio, PDO::PARAM_LOB); $s->bindValue(2, $key); $s->execute();
        return local_audio_url($key);
    } catch (Throwable $e) {
        $db->prepare("UPDATE tts_audio_cache SET state='failed' WHERE cache_key=?")->execute([$key]);
        throw $e;
    }
}
