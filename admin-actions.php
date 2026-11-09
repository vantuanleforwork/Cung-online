<?php
require_once __DIR__ . '/speech.php';

function speech_settings_input(array $in) {
    $template = $in['speech_template'] ?? '';
    if (!is_string($template) || mb_strlen(trim($template)) < 3 || mb_strlen($template) > 600) {
        throw new InvalidArgumentException('Mẫu câu đọc cần từ 3 đến 600 ký tự.');
    }
    if (preg_match('/[<>\x00-\x08\x0B\x0C\x0E-\x1F]/u', $template)) throw new InvalidArgumentException('Mẫu câu chỉ hỗ trợ văn bản thuần.');
    preg_match_all('/\{([^{}]*)\}/u', $template, $matches);
    $allowedVars = ['name','user','offering','amount','so_tien','amount_num','amount_words','message','noi_dung','content','message_clause'];
    foreach ($matches[1] as $variable) {
        if (!in_array($variable, $allowedVars, true)) {
            throw new InvalidArgumentException('Biến không được hỗ trợ: {' . $variable . '}');
        }
    }
    $provider = $in['speech_provider'] ?? '';
    $current = db()->query('SELECT * FROM app_settings WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    $voice = $provider === 'fpt' ? ($in['speech_voice'] ?? $current['speech_voice']) : $current['speech_voice'];
    if (!is_string($provider) || !in_array($provider, ['browser','fpt','elevenlabs','custom_api'], true) || !is_string($voice) || !array_key_exists($voice, fpt_voices())) {
        throw new InvalidArgumentException('Nhà cung cấp hoặc giọng đọc không hợp lệ.');
    }
    $rate = filter_var($in['speech_rate'] ?? null, FILTER_VALIDATE_FLOAT);
    $volume = filter_var($in['speech_volume'] ?? null, FILTER_VALIDATE_FLOAT);
    $seconds = filter_var($in['display_seconds'] ?? null, FILTER_VALIDATE_INT);
    if ($rate === false || $rate < .75 || $rate > 1.25 || $volume === false || $volume < 0 || $volume > 1 ||
        $seconds === false || $seconds < 8 || $seconds > 30) throw new InvalidArgumentException('Kiểm tra tốc độ, âm lượng và thời gian hiển thị (tối thiểu 8 giây).');
    if ($provider === 'fpt' && (!function_exists('curl_init') || fpt_api_key() === '')) {
        throw new InvalidArgumentException('Muốn dùng FPT.AI, điền FPT_TTS_API_KEY trong config.php và bật PHP cURL.');
    }
    $elevenVoice = $provider === 'elevenlabs' ? trim((string)($in['eleven_voice_id'] ?? $current['eleven_voice_id'])) : $current['eleven_voice_id'];
    $elevenModel = $provider === 'elevenlabs' ? trim((string)($in['eleven_model'] ?? $current['eleven_model'])) : $current['eleven_model'];
    if (!is_string($elevenVoice) || ($elevenVoice !== '' && !preg_match('/^[A-Za-z0-9_-]{1,80}$/D', $elevenVoice)) ||
        !is_string($elevenModel) || !array_key_exists($elevenModel, eleven_models())) {
        throw new InvalidArgumentException('Voice ID hoặc model ElevenLabs không hợp lệ.');
    }
    $key = $provider === 'elevenlabs' ? posted_eleven_key($in) : '';
    if ($provider === 'elevenlabs') {
        if (!function_exists('curl_init')) throw new InvalidArgumentException('Hosting cần bật PHP cURL để dùng ElevenLabs.');
        if ($key === '' && eleven_api_key(db()) === '') throw new InvalidArgumentException('Nhập API key ElevenLabs trước khi lưu hoặc nghe thử.');
        if ($rate > 1.2) throw new InvalidArgumentException('Tốc độ ElevenLabs tối đa là 1.20.');
    }
    $custom = custom_voice_fields($provider === 'custom_api' ? $in + $current : $current);
    $customKey = $provider === 'custom_api' ? posted_custom_key($in) : '';
    if ($provider === 'custom_api') {
        if (!function_exists('curl_init')) throw new InvalidArgumentException('Hosting cần bật PHP cURL để dùng Custom API Voice.');
        if ($customKey === '' && custom_api_key(db(), $custom['custom_api_url']) === '') throw new InvalidArgumentException('Nhập API key Custom Voice. Khi đổi API URL, cần nhập lại key cho địa chỉ mới.');
        if ($custom['custom_api_engine'] === 'elevenlabs' && $rate > 1.2) throw new InvalidArgumentException('Engine ElevenLabs của Custom API hỗ trợ tốc độ tối đa 1.20.');
    }
    $tier1Voice = trim((string)($in['tier1_voice_id'] ?? $current['tier1_voice_id'] ?? ''));
    $tier2Voice = trim((string)($in['tier2_voice_id'] ?? $current['tier2_voice_id'] ?? ''));
    $tier3Voice = trim((string)($in['tier3_voice_id'] ?? $current['tier3_voice_id'] ?? ''));
    foreach (['tier1_voice_id' => $tier1Voice, 'tier2_voice_id' => $tier2Voice, 'tier3_voice_id' => $tier3Voice] as $varName => $val) {
        if ($val !== '' && !preg_match('/^[A-Za-z0-9_.-]{1,160}$/D', $val)) {
            throw new InvalidArgumentException("Voice ID cho $varName không hợp lệ.");
        }
    }
    return [
        'speech_enabled' => isset($in['speech_enabled']) ? 1 : 0,
        'speech_template' => trim($template),
        'speech_provider' => $provider,
        'speech_voice' => $voice,
        'speech_rate' => $rate,
        'speech_volume' => $volume,
        'display_seconds' => $seconds,
        'eleven_voice_id' => $elevenVoice,
        'eleven_model' => $elevenModel,
        'tier1_voice_id' => $tier1Voice,
        'tier2_voice_id' => $tier2Voice,
        'tier3_voice_id' => $tier3Voice,
    ] + $custom;
}

function admin_action(PDO $db, array $in, string $ip) {
    $action = $in['action'] ?? '';
    if (!is_string($action)) throw new InvalidArgumentException('Thao tác không hợp lệ.');
    $db->beginTransaction();
    try {
        // Same lock order as poll.php; changes take effect between activities.
        $previousSettings = $db->query('SELECT * FROM app_settings WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
        $audit = ['action' => $action];
        if ($action === 'save_overlay') {
            $layout = overlay_layout_input($in);
            $db->prepare('UPDATE app_settings SET overlay_x=?,overlay_y=?,overlay_width=?,overlay_font_size=? WHERE id=1')->execute(array_values($layout));
            $audit['overlay'] = $layout;
        } elseif ($action === 'save_speech') {
            $settings = speech_settings_input($in);
            $db->prepare('UPDATE app_settings SET speech_enabled=?,speech_template=?,speech_provider=?,speech_voice=?,speech_rate=?,speech_volume=?,display_seconds=?,eleven_voice_id=?,eleven_model=?,tier1_voice_id=?,tier2_voice_id=?,tier3_voice_id=?,custom_api_url=?,custom_api_engine=?,custom_api_model=?,custom_voice_id=? WHERE id=1')
               ->execute(array_values($settings));
            $audit['settings'] = $settings;
            $key = $settings['speech_provider'] === 'elevenlabs' ? posted_eleven_key($in) : '';
            if ($key !== '') {
                $db->prepare("INSERT INTO tts_credentials(provider,api_key) VALUES('elevenlabs',?) ON DUPLICATE KEY UPDATE api_key=VALUES(api_key)")->execute([$key]);
                $audit['eleven_key_updated'] = true; // Never write credentials to the audit log.
            }
            $customKey = $settings['speech_provider'] === 'custom_api' ? posted_custom_key($in) : '';
            if ($customKey !== '') {
                $db->prepare("INSERT INTO tts_credentials(provider,api_key) VALUES('custom_api',?) ON DUPLICATE KEY UPDATE api_key=VALUES(api_key)")->execute([$customKey]);
                $audit['custom_key_updated'] = true;
            } elseif ($settings['custom_api_url'] !== $previousSettings['custom_api_url']) {
                $db->exec("DELETE FROM tts_credentials WHERE provider='custom_api'");
                $audit['custom_key_cleared_for_new_url'] = true;
            }
        } elseif ($action === 'add_voice_option') {
            $name = clean($in['name'] ?? '', 80);
            $voiceId = trim((string)($in['voice_id'] ?? ''));
            $tierMin = (int)($in['tier_min'] ?? 2);
            if ($tierMin !== 2 && $tierMin !== 3) $tierMin = 2;
            if ($name === '' || $voiceId === '') throw new InvalidArgumentException('Nhập đầy đủ tên giọng và Voice ID.');
            if (!preg_match('/^[A-Za-z0-9_.-]{1,160}$/D', $voiceId)) throw new InvalidArgumentException('Voice ID không hợp lệ.');
            $db->prepare('INSERT INTO custom_voice_options(name,voice_id,tier_min) VALUES(?,?,?)')->execute([$name, $voiceId, $tierMin]);
            $audit['voice_name'] = $name;
            $audit['voice_id'] = $voiceId;
            $audit['tier_min'] = $tierMin;
        } elseif ($action === 'delete_voice_option') {
            $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id || $id < 1) throw new InvalidArgumentException('ID không hợp lệ.');
            $db->prepare('DELETE FROM custom_voice_options WHERE id=?')->execute([$id]);
            $audit['deleted_id'] = $id;
        } elseif ($action === 'clear_speech_cache') {
            $db->exec('DELETE FROM tts_audio_cache');
        } elseif ($action === 'pause' || $action === 'resume') {
            $db->prepare('UPDATE app_settings SET paused=? WHERE id=1')->execute([$action === 'pause' ? 1 : 0]);
        } elseif (in_array($action, ['match', 'anonymous', 'ignore'], true)) {
            $tx = $in['tx_id'] ?? '';
            if (!is_string($tx) || $tx === '') throw new InvalidArgumentException('Thiếu mã giao dịch.');
            $s = $db->prepare('SELECT * FROM payment_transactions WHERE tx_id=? FOR UPDATE');
            $s->execute([$tx]);
            $payment = $s->fetch(PDO::FETCH_ASSOC);
            if (!$payment || !is_site_transfer($payment['content']) || $payment['donation_id'] !== null || $payment['decision'] !== 'unmatched') {
                throw new InvalidArgumentException('Giao dịch không còn ở trạng thái chờ đối soát.');
            }
            $audit['tx_id'] = $tx;
            if ($action === 'ignore') {
                $db->prepare("UPDATE payment_transactions SET decision='ignored_manual' WHERE tx_id=?")->execute([$tx]);
            } else {
                if ($payment['direction'] !== 'IN' || $payment['account_number'] !== trim(ACCOUNT_NO) ||
                    (int)$payment['paid_amount'] < min((int)donation_settings($db)['message_min'],(int)donation_settings($db)['music_min'])) {
                    throw new InvalidArgumentException('Giao dịch không đáp ứng tài khoản nhận hoặc số tiền tối thiểu.');
                }
                if ($action === 'match') {
                    $code = $in['code'] ?? '';
                    if (!is_string($code) || trim($code) === '') throw new InvalidArgumentException('Nhập mã đơn cần ghép.');
                    $s = $db->prepare('SELECT * FROM donations WHERE code=? FOR UPDATE');
                    $s->execute([strtoupper(trim($code))]);
                    $donation = $s->fetch(PDO::FETCH_ASSOC);
                    if (!$donation || $donation['status'] !== 'pending') {
                        throw new InvalidArgumentException('Không tìm thấy đơn đang chờ thanh toán.');
                    }
                    attach_payment($db, $payment, $donation);
                    if (empty($donation['is_test'])) record_kpi_payment($db, (int)$payment['paid_amount']);
                    $audit['donation_id'] = $donation['id'];
                } else {
                    $db->prepare("INSERT INTO donations(name,status,paid_amount,tx_id,queue_state) VALUES('Ẩn danh','paid',?,?,?)")
                       ->execute([$payment['paid_amount'], $tx, review_state()]);
                    $id = $db->lastInsertId();
                    $db->prepare("UPDATE payment_transactions SET donation_id=?,decision='anonymous' WHERE tx_id=?")->execute([$id, $tx]);
                    record_kpi_payment($db, (int)$payment['paid_amount']);
                    $audit['donation_id'] = $id;
                }
            }
        } elseif ($action === 'block_user') {
            $userId=filter_var($in['user_id'] ?? null,FILTER_VALIDATE_INT);
            $type=$in['block_type'] ?? ''; $ref=filter_var($in['reference_id'] ?? null,FILTER_VALIDATE_INT);
            if (!$userId || !in_array($type,['email','ip','device'],true)) throw new InvalidArgumentException('Đối tượng chặn không hợp lệ.');
            $s=$db->prepare('SELECT * FROM donor_users WHERE id=? FOR UPDATE');$s->execute([$userId]);$user=$s->fetch(PDO::FETCH_ASSOC);
            if (!$user) throw new InvalidArgumentException('Không tìm thấy tài khoản.');
            if ($type==='email') { $hash=donor_hash(mb_strtolower(trim($user['email']))); $hint=preg_replace('/(^.).*(@.*$)/','$1***$2',$user['email']); }
            else {
                if (!$ref) throw new InvalidArgumentException('Chọn một lượt donate để lấy địa chỉ đã ghi nhận.');
                $s=$db->prepare('SELECT ip,device_hash FROM donations WHERE id=? AND user_id=? FOR UPDATE');$s->execute([$ref,$userId]);$source=$s->fetch(PDO::FETCH_ASSOC);
                if (!$source) throw new InvalidArgumentException('Không tìm thấy địa chỉ ở lượt đã chọn.');
                if ($type==='ip') { if (!$source['ip']) throw new InvalidArgumentException('Lượt này không có địa chỉ IP.'); $hash=donor_hash(normalized_ip_value($source['ip'])); $hint=mask_ip_value($source['ip']); }
                else { if (!$source['device_hash']) throw new InvalidArgumentException('Lượt này không có mã trình duyệt.'); $hash=$source['device_hash']; $hint='Trình duyệt · '.substr($hash,0,10); }
            }
            $reason=clean($in['reason'] ?? '',255);
            $s=$db->prepare('SELECT 1 FROM blocked_donors WHERE block_type=? AND identifier_hash=?');$s->execute([$type,$hash]);
            if ($s->fetchColumn()) throw new InvalidArgumentException('Địa chỉ này đã bị chặn.');
            $db->prepare('INSERT INTO blocked_donors(block_type,identifier_hash,identifier_hint,reason,created_by) VALUES(?,?,?,?,?)')
               ->execute([$type,$hash,$hint,$reason,$ip]);
            $audit['block_type']=$type;$audit['user_id']=$userId;$audit['hint']=$hint;
        } elseif ($action === 'unblock_identifier') {
            $id=filter_var($in['block_id'] ?? null,FILTER_VALIDATE_INT);
            if (!$id || $id<1) throw new InvalidArgumentException('Mã chặn không hợp lệ.');
            $s=$db->prepare('SELECT block_type,identifier_hint FROM blocked_donors WHERE id=? FOR UPDATE');$s->execute([$id]);$block=$s->fetch(PDO::FETCH_ASSOC);
            if (!$block) throw new InvalidArgumentException('Lệnh chặn đã được gỡ hoặc không tồn tại.');
            $db->prepare('DELETE FROM blocked_donors WHERE id=?')->execute([$id]);$audit['block_id']=$id;$audit['block_type']=$block['block_type'];$audit['hint']=$block['identifier_hint'];
        } elseif (in_array($action, ['edit', 'approve', 'hold', 'skip', 'replay'], true)) {
            $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id || $id < 1) throw new InvalidArgumentException('Mã lượt không hợp lệ.');
            $s = $db->prepare('SELECT *, (claimed_until>NOW() AND shown=0) AS playing FROM donations WHERE id=? FOR UPDATE');
            $s->execute([$id]);
            $row = $s->fetch(PDO::FETCH_ASSOC);
            if (!$row || $row['status'] !== 'paid') throw new InvalidArgumentException('Chỉ thao tác với lượt đã nhận tiền.');
            if ($row['playing']) throw new InvalidArgumentException('Lượt đang phát. Hãy chờ phát xong hoặc hết thời hạn giữ lượt.');
            if (in_array($action, ['approve', 'replay'], true) && (int)$row['paid_amount'] < MIN_AMOUNT) {
                throw new InvalidArgumentException('Lượt dưới số tiền tối thiểu không thể phát.');
            }
            $audit['donation_id'] = $id;
            $audit['before'] = ['name' => $row['name'], 'message' => $row['message'],
                'queue_state' => $row['queue_state'], 'shown' => $row['shown']];
            if ($action === 'replay') {
                if (!$row['shown'] && $row['queue_state'] !== 'skipped') throw new InvalidArgumentException('Lượt chưa phát; không cần phát lại.');
                $db->prepare("UPDATE donations SET shown=0,queue_state='queued',claim_token=NULL,claimed_until=NULL WHERE id=?")->execute([$id]);
            } else {
                if ($row['shown'] || $row['queue_state'] === 'skipped') throw new InvalidArgumentException('Lượt đã hoàn tất. Dùng phát lại nếu cần.');
                if ($action === 'edit') {
                    if (!is_string($in['name'] ?? null) || !is_string($in['message'] ?? null)) throw new InvalidArgumentException('Tên/lời nhắn không hợp lệ.');
                    $name = clean($in['name'], 40) ?: 'Ẩn danh';
                    $message = clean($in['message'], donation_message_limit((int)$row['paid_amount']));
                    $db->prepare('UPDATE donations SET name=?,message=?,claim_token=NULL,claimed_until=NULL WHERE id=?')->execute([$name, $message, $id]);
                    $audit['after'] = ['name' => $name, 'message' => $message];
                } else {
                    $state = ['approve' => 'queued', 'hold' => 'held', 'skip' => 'skipped'][$action];
                    $db->prepare('UPDATE donations SET queue_state=?,claim_token=NULL,claimed_until=NULL WHERE id=?')->execute([$state, $id]);
                }
            }
        } else {
            throw new InvalidArgumentException('Thao tác không hợp lệ.');
        }
        $db->prepare('INSERT INTO admin_audit(action,detail,ip) VALUES(?,?,?)')
           ->execute([$action, json_encode($audit, JSON_UNESCAPED_UNICODE), $ip]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

function push_test_webhook(PDO $db, int $amount, string $name = '', string $message = '', string $ip = '', string $selectedVoiceId = ''): array {
    try {
        if (function_exists('ensure_speech_schema')) {
            ensure_speech_schema($db);
        }
    } catch (Throwable $ignore) {}
    if ($amount < 1000 || $amount > 50000000) {
        throw new InvalidArgumentException('Số tiền tối thiểu là ' . number_format(MIN_AMOUNT, 0, ',', '.') . 'đ.');
    }
    $tier = donation_tier($amount);
    $name = clean($name, 40);
    if ($name === '') $name = 'Khách thử nghiệm';
    $message = clean($message, donation_message_limit($amount));
    if ($message === '') {
        $defaultMessages = [
            1 => 'Thử nghiệm donate 10.000đ - Chúc kênh livestream phát triển thuận lợi!',
            2 => 'Thử nghiệm donate 50.000đ - Hiệu ứng Hỏa Long giáng lâm!',
            3 => 'Thử nghiệm donate 200.000đ - Hiệu ứng Thiên Nữ đại chiêu tối thượng!'
        ];
        $message = $defaultMessages[$tier] ?? ('Thử nghiệm donate ' . number_format($amount, 0, ',', '.') . 'đ');
    }
    $voiceName = null;
    $selectedVoiceId = trim($selectedVoiceId);
    if ($selectedVoiceId !== '' && preg_match('/^[A-Za-z0-9_.-]{1,160}$/D', $selectedVoiceId)) {
        try {
            $s = $db->prepare('SELECT name, voice_id FROM custom_voice_options WHERE voice_id=? LIMIT 1');
            $s->execute([$selectedVoiceId]);
            $opt = $s->fetch(PDO::FETCH_ASSOC);
            if ($opt) {
                $voiceName = $opt['name'];
            } else {
                $settings = $db->query('SELECT tier1_voice_id, tier2_voice_id, tier3_voice_id, eleven_voice_id, custom_voice_id FROM app_settings WHERE id=1')->fetch(PDO::FETCH_ASSOC);
                if ($selectedVoiceId === ($settings['tier1_voice_id'] ?? '')) $voiceName = 'Mặc định Mốc 1';
                elseif ($selectedVoiceId === ($settings['tier2_voice_id'] ?? '')) $voiceName = 'Mặc định Mốc 2';
                elseif ($selectedVoiceId === ($settings['tier3_voice_id'] ?? '')) $voiceName = 'Mặc định Mốc 3';
                elseif ($selectedVoiceId === ($settings['custom_voice_id'] ?? '')) $voiceName = 'Custom Voice chung';
                elseif ($selectedVoiceId === ($settings['eleven_voice_id'] ?? '')) $voiceName = 'ElevenLabs chung';
                else $voiceName = 'Giọng test (' . (strlen($selectedVoiceId) > 10 ? substr($selectedVoiceId, 0, 8) . '…' : $selectedVoiceId) . ')';
            }
        } catch (Throwable $ignore) {
            $voiceName = 'Giọng test';
        }
    } else {
        $selectedVoiceId = null;
    }
    
    $tx = 'TEST_' . date('YmdHis') . '_' . strtoupper(bin2hex(random_bytes(3)));
    $code = PREFIX . 'T' . strtoupper(bin2hex(random_bytes(2)));
    
    $db->beginTransaction();
    try {
        $cols = array_column($db->query('SHOW COLUMNS FROM donations')->fetchAll(PDO::FETCH_ASSOC), 'Field');
        if (in_array('selected_voice_id', $cols, true) && in_array('voice_name', $cols, true)) {
            $db->prepare("INSERT INTO donations(code,name,message,expected_amount,paid_amount,status,tx_id,shown,queue_state,ip,selected_voice_id,voice_name,is_test)
                VALUES(?,?,?,?,?,'paid',?,0,'queued',?,?,?,1)")
               ->execute([$code, $name, $message, $amount, $amount, $tx, $ip, $selectedVoiceId, $voiceName]);
        } else {
            $db->prepare("INSERT INTO donations(code,name,message,expected_amount,paid_amount,status,tx_id,shown,queue_state,ip,is_test)
                VALUES(?,?,?,?,?,'paid',?,0,'queued',?,1)")
               ->execute([$code, $name, $message, $amount, $amount, $tx, $ip]);
        }
        $donationId = (int)$db->lastInsertId();
        
        $db->commit();
        
        // Kích hoạt tạo trước giọng đọc ngay khi bấm test để OBS nhận được là phát ngay lập tức
        try {
            $settings = $db->query('SELECT * FROM app_settings WHERE id=1')->fetch(PDO::FETCH_ASSOC);
            if ($settings && $settings['speech_enabled']) {
                $testRow = [
                    'paid_amount' => $amount,
                    'name' => $name,
                    'message' => $message,
                    'selected_voice_id' => $selectedVoiceId
                ];
                $opts = speech_options_for_donation($settings, $testRow);
                if (in_array($opts['provider'], ['fpt','elevenlabs','custom_api'], true)) {
                    provider_audio($db, speech_text($testRow, $settings), $opts);
                }
            }
        } catch (Throwable $ignore) {}

        return [
            'success' => true,
            'donation_id' => $donationId,
            'amount' => $amount,
            'tier' => $tier,
            'name' => $name,
            'message' => $message,
            'code' => $code,
            'text' => 'Đã đẩy thành công lượt test ' . number_format($amount, 0, ',', '.') . 'đ (Đơn #' . $donationId . ') để phát thử trên OBS!'
        ];
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
