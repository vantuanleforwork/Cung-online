<?php
require_once __DIR__ . '/elevenlabs.php';

function custom_api_url(string $url) {
    $url = rtrim(trim($url), '/');
    $parts = parse_url($url);
    if (!$parts || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host']) ||
        isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment']) ||
        (isset($parts['port']) && $parts['port'] !== 443) || strlen($url) > 255 ||
        !preg_match('/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/iD', $parts['host']) ||
        strpos($parts['host'], '.') === false || filter_var($parts['host'], FILTER_VALIDATE_IP)) {
        throw new InvalidArgumentException('API URL cần là tên miền HTTPS công khai, không kèm key, query hoặc cổng riêng.');
    }
    return preg_match('~/v1$~', $url) ? $url : $url . '/v1';
}
function posted_custom_key(array $in) {
    $raw = $in['custom_api_key'] ?? '';
    if (!is_string($raw)) throw new InvalidArgumentException('API key Custom Voice không hợp lệ.');
    $key = trim($raw);
    if (strlen($key) > 512 || ($key !== '' && preg_match('/[^\x21-\x7E]/', $key))) throw new InvalidArgumentException('API key Custom Voice không hợp lệ. Không thêm khoảng trắng.');
    return $key;
}
function custom_api_key(PDO $db, string $base) {
    $storedBase = $db->query('SELECT custom_api_url FROM app_settings WHERE id=1')->fetchColumn();
    if ($base !== $storedBase) return ''; // Do not send an existing key to a different configured endpoint.
    $s = $db->query("SELECT api_key FROM tts_credentials WHERE provider='custom_api'");
    return $s->fetchColumn() ?: '';
}
function custom_voice_fields(array $in) {
    $base = trim((string)($in['custom_api_url'] ?? 'https://api.vibi.pro/v1'));
    $engine = trim((string)($in['custom_api_engine'] ?? 'elevenlabs'));
    $model = trim((string)($in['custom_api_model'] ?? 'eleven_flash_v2_5'));
    if (!empty($in['custom_model_preset'])) {
        if ($in['custom_model_preset'] === '__custom__' && !empty($in['custom_model_other'])) {
            $model = trim((string)$in['custom_model_other']);
        } elseif ($in['custom_model_preset'] !== '__custom__') {
            $model = trim((string)$in['custom_model_preset']);
        }
    }
    $voice = trim((string)($in['custom_voice_id'] ?? ''));
    if (!is_string($base) || !is_string($engine) || !in_array($engine, ['elevenlabs','minimax','capcut'], true) ||
        !is_string($model) || !preg_match('/^[A-Za-z0-9_.-]{1,100}$/D', $model) ||
        !is_string($voice) || ($voice !== '' && !preg_match('/^[A-Za-z0-9_.-]{1,160}$/D', $voice))) {
        throw new InvalidArgumentException('Kiểm tra API URL, engine, model và Voice ID của Custom API Voice.');
    }
    return ['custom_api_url' => custom_api_url($base), 'custom_api_engine' => $engine,
        'custom_api_model' => $model, 'custom_voice_id' => $voice];
}
function custom_voice_request(string $text, array $options) {
    $engine = $options['custom_api_engine'];
    $settings = ['speed' => (float)$options['rate']];
    if ($engine === 'elevenlabs') $settings += ['stability' => .5, 'similarity_boost' => .75];
    else $settings['pitch'] = 0;
    if ($engine === 'minimax') $settings['vol'] = 1.0;
    return ['text' => $text, 'provider' => $engine, 'model_id' => $options['custom_api_model'],
        'language_code' => $engine === 'minimax' ? 'Vietnamese' : 'vi',
        'voice_settings' => $settings, 'export_transcript' => false];
}
function custom_cache_key(string $text, array $options, string $key) {
    return hash('sha256', 'custom_api|' . $options['custom_api_url'] . '|' . $options['custom_voice_id'] . '|' .
        json_encode(custom_voice_request($text, $options), JSON_UNESCAPED_UNICODE) . '|' . hash('sha256', $key));
}
function custom_api_http(string $base, string $path, string $key, string $method = 'GET', ?array $body = null) {
    if (!function_exists('curl_init')) throw new SpeechProviderException('Hosting cần bật PHP cURL để dùng API Voice.');
    custom_api_url($base); // validate HTTPS/public-host syntax; retain the explicit API version for catalog calls
    $base = rtrim(trim($base), '/');
    $host = parse_url($base, PHP_URL_HOST);
    $ips = gethostbynamel($host) ?: [];
    $public = array_values(array_filter($ips, function ($ip) {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }));
    if (!$public || count($public) !== count($ips)) throw new SpeechProviderException('API host không phân giải được thành địa chỉ IPv4 công khai. Kiểm tra API URL và DNS hosting.');
    // Pin the validated DNS result; redirects are disabled so credentials stay on the selected API host.
    $curl = curl_init($base . $path); $raw = '';
    $options = [CURLOPT_HTTPHEADER => ['xi-api-key: ' . $key, 'Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 15, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_RESOLVE => [$host . ':443:' . $public[0]],
        CURLOPT_WRITEFUNCTION => function ($handle, $chunk) use (&$raw) {
            if (strlen($raw) + strlen($chunk) > 1048576) return 0;
            $raw .= $chunk; return strlen($chunk);
        }];
    if ($method === 'POST') $options += [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE)];
    curl_setopt_array($curl, $options); $ok = curl_exec($curl); $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
    if ($ok === false) throw new SpeechProviderException('Chưa kết nối được API Voice. Kiểm tra URL, cURL và kết nối ra ngoài của hosting.');
    $data = json_decode($raw, true);
    if ($status < 200 || $status >= 300 || !is_array($data)) {
        if ($status === 401 || $status === 403) throw new SpeechProviderException('API Voice từ chối xác thực. Kiểm tra API key và quyền truy cập.');
        if ($status === 402 || $status === 429) throw new SpeechProviderException('API Voice hết hạn mức hoặc đang giới hạn yêu cầu. Kiểm tra tài khoản dịch vụ.');
        throw new SpeechProviderException('API Voice trả lỗi HTTP ' . $status . '. Kiểm tra Voice ID, model và engine.');
    }
    return [$status, $data];
}
function custom_audio_result(array $data) {
    $status = $data['status'] ?? '';
    if ($status === 'failed') throw new SpeechProviderException('Tác vụ tạo giọng Custom API đã thất bại. Kiểm tra lịch sử tác vụ trên dịch vụ, Voice ID và model.');
    if ($status !== 'completed') return null;
    $url = $data['result']['audio_url'] ?? $data['audio_url'] ?? '';
    if (!is_string($url) || filter_var($url, FILTER_VALIDATE_URL) === false || parse_url($url, PHP_URL_SCHEME) !== 'https' ||
        parse_url($url, PHP_URL_USER) !== null || parse_url($url, PHP_URL_PASS) !== null) {
        throw new SpeechProviderException('Tác vụ hoàn tất nhưng API không trả audio_url HTTPS hợp lệ.');
    }
    return $url;
}
function custom_audio(PDO $db, string $text, array $options, ?string $overrideKey = null, ?callable $transport = null) {
    $apiKey = $overrideKey ?: custom_api_key($db, $options['custom_api_url']);
    if ($apiKey === '') throw new SpeechProviderException('Nhập API key cho Custom API Voice trong admin. Khi đổi API URL, cần nhập lại key.');
    if (mb_strlen($text) > 4500) throw new SpeechProviderException('Câu đọc quá dài. Rút gọn mẫu câu trước khi tạo giọng.');
    $http = $transport ?? 'custom_api_http'; $cache = custom_cache_key($text, $options, $apiKey);
    $s = $db->prepare("INSERT IGNORE INTO tts_audio_cache(cache_key,state) VALUES(?,'generating')"); $s->execute([$cache]);
    $owner = $s->rowCount() === 1;
    try {
        if ($owner) {
            [$status, $data] = $http($options['custom_api_url'], '/text-to-speech/' . rawurlencode($options['custom_voice_id']), $apiKey, 'POST', custom_voice_request($text, $options));
            $url = custom_audio_result($data);
            if ($url !== null) {
                $db->prepare("UPDATE tts_audio_cache SET state='ready',audio_url=? WHERE cache_key=?")->execute([$url, $cache]); return $url;
            }
            $task = $data['id'] ?? '';
            if ($status !== 202 || !is_string($task) || !preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $task)) throw new SpeechProviderException('API Voice chưa trả task ID hợp lệ. Kiểm tra lịch sử trên dịch vụ trước khi tạo lại.');
            $db->prepare("UPDATE tts_audio_cache SET state='pending',task_id=?,next_poll_at=NOW() WHERE cache_key=?")->execute([$task, $cache]);
            return null;
        }
        $s = $db->prepare('SELECT state,audio_url,task_id,(created_at<NOW()-INTERVAL 5 MINUTE) AS timed_out FROM tts_audio_cache WHERE cache_key=?'); $s->execute([$cache]); $row = $s->fetch(PDO::FETCH_ASSOC);
        if ($row['state'] === 'ready') return $row['audio_url'];
        if ($row['state'] === 'failed') throw new SpeechProviderException('Lần tạo giọng Custom API trước đã lỗi. Kiểm tra lịch sử dịch vụ rồi xóa bộ nhớ giọng để thử lại.');
        if ($row['timed_out']) throw new SpeechProviderException('Tác vụ Custom API chờ quá 5 phút. Kiểm tra lịch sử dịch vụ trước khi thử lại.');
        if ($row['state'] !== 'pending' || !$row['task_id']) return null;
        $s = $db->prepare("UPDATE tts_audio_cache SET next_poll_at=NOW()+INTERVAL 3 SECOND WHERE cache_key=? AND state='pending' AND next_poll_at<=NOW()"); $s->execute([$cache]);
        if ($s->rowCount() === 0) return null;
        // Only GET history here. Repeated polling must never create a second paid task.
        [$status, $data] = $http($options['custom_api_url'], '/history/' . rawurlencode($row['task_id']), $apiKey, 'GET', null);
        $url = custom_audio_result($data);
        if ($url !== null) $db->prepare("UPDATE tts_audio_cache SET state='ready',audio_url=? WHERE cache_key=?")->execute([$url, $cache]);
        elseif (!in_array($data['status'] ?? '', ['pending','processing'], true)) throw new SpeechProviderException('Trạng thái tác vụ Custom API không hợp lệ.');
        return $url;
    } catch (Throwable $e) {
        // Transient GET errors retain the existing task so the next request can resume polling.
        if ($owner || isset($data) && ($data['status'] ?? '') === 'failed' || isset($row) && $row['timed_out']) {
            $db->prepare("UPDATE tts_audio_cache SET state='failed' WHERE cache_key=?")->execute([$cache]);
        }
        throw $e;
    }
}
