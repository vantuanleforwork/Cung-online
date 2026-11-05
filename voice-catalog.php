<?php
require_once __DIR__ . '/speech.php';

function normalize_voice_list(array $data) {
    $voices = $data['voices'] ?? $data['voice_list'] ?? [];
    $result = [];
    if (!is_array($voices)) throw new SpeechProviderException('API không trả danh sách Voice ID hợp lệ.');
    foreach (array_slice($voices, 0, 100) as $voice) {
        if (!is_array($voice)) continue;
        $id = $voice['voice_id'] ?? $voice['uniq_id'] ?? '';
        $name = $voice['name'] ?? $voice['voice_name'] ?? $id;
        if ((!is_string($id) && !is_int($id)) || !preg_match('/^[A-Za-z0-9_.-]{1,160}$/D', (string)$id) || !is_string($name)) continue;
        $language = $voice['language'] ?? $voice['labels']['language'] ?? '';
        $result[] = ['voice_id' => (string)$id, 'name' => mb_substr($name, 0, 120), 'language' => is_string($language) ? mb_substr($language, 0, 40) : ''];
    }
    return ['voices' => $result, 'has_more' => (bool)($data['has_more'] ?? false),
        'next_cursor' => is_string($data['next_page_token'] ?? null) ? mb_substr($data['next_page_token'], 0, 1024) : ''];
}
function voice_catalog(PDO $db, array $in, ?callable $transport = null) {
    $provider = $in['catalog_provider'] ?? '';
    $search = $in['voice_search'] ?? ''; $cursor = $in['voice_cursor'] ?? '';
    $page = filter_var($in['voice_page'] ?? 0, FILTER_VALIDATE_INT);
    if (!is_string($search) || mb_strlen($search) > 80 || !is_string($cursor) || strlen($cursor) > 1024 ||
        $page === false || $page < 0 || $page > 1000) throw new InvalidArgumentException('Từ khóa hoặc trang danh sách giọng không hợp lệ.');
    $http = $transport ?? 'custom_api_http';
    if ($provider === 'elevenlabs') {
        $key = posted_eleven_key($in) ?: eleven_api_key($db);
        if ($key === '') throw new InvalidArgumentException('Nhập API key ElevenLabs để tải Voice ID, hoặc nhập Voice ID thủ công.');
        $base = 'https://api.elevenlabs.io/v2';
        $query = ['page_size' => 30, 'search' => trim($search), 'include_total_count' => 'false'];
        if ($cursor !== '') $query['next_page_token'] = $cursor;
        $path = '/voices?' . http_build_query($query);
    } elseif ($provider === 'custom_api') {
        $fields = custom_voice_fields($in); $base = $fields['custom_api_url'];
        $key = posted_custom_key($in) ?: custom_api_key($db, $base);
        if ($key === '') throw new InvalidArgumentException('Nhập API key Custom Voice cho URL này để tải Voice ID.');
        $engine = $fields['custom_api_engine'];
        $query = ['page_size' => 30, 'search' => trim($search)];
        if ($engine === 'elevenlabs') {
            $kind = $in['catalog_kind'] ?? 'shared';
            if (!in_array($kind, ['shared','default'], true)) throw new InvalidArgumentException('Loại thư viện giọng không hợp lệ.');
            $path = $kind === 'default' ? '/default-voices' : '/shared-voices';
            $query['page'] = $page;
            if ($kind === 'shared') $query['required_languages'] = 'vi';
        } else {
            $path = '/' . $engine . '/system-voices';
            $query += ['page' => $page + 1, 'language' => $engine === 'minimax' ? 'Vietnamese' : 'vi'];
        }
        $path .= '?' . http_build_query($query);
    } else throw new InvalidArgumentException('Chọn nguồn thư viện ElevenLabs hoặc Custom API Voice.');
    [$status, $data] = $http($base, $path, $key, 'GET', null);
    $result = normalize_voice_list($data);
    if ($provider === 'elevenlabs' && $result['next_cursor'] === '') $result['has_more'] = false;
    return $result;
}
