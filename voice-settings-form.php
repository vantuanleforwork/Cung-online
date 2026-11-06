<?php
if (empty($loggedIn) || ($view ?? '') !== 'speech') { http_response_code(403); exit; }
$platform = $settings['speech_provider'];
$modelGroups = [
    'elevenlabs' => ['eleven_flash_v2_5'=>'Eleven Flash v2.5', 'eleven_v3'=>'Eleven v3'],
    'minimax' => ['speech-2.8-turbo'=>'MiniMax Speech 2.8 Turbo', 'speech-2.8-hd'=>'MiniMax Speech 2.8 HD'],
    'capcut' => ['capcut'=>'CapCut'],
];
$customModel = $settings['custom_api_model'];
$preset = isset($modelGroups[$settings['custom_api_engine']][$customModel]) ? $customModel : '__custom__';
function voice_platform_attrs(string $name, string $selected) {
    echo 'data-provider-panel="' . h($name) . '"' . ($name === $selected ? '' : ' hidden disabled');
}
function voice_picker_fields(string $provider, string $label) { ?>
<details class="voice-picker" data-provider="<?=h($provider)?>"><summary>Tìm và chọn Voice ID · <?=h($label)?></summary>
<p class="muted">Dùng API key đã lưu hoặc vừa nhập để tìm giọng. Chọn giọng sẽ điền Voice ID phía trên.</p>
<div class="bar"><input class="voice-search" placeholder="Tìm tên giọng" maxlength="80" aria-label="Tìm giọng <?=h($label)?>">
<?php if ($provider==='custom_api'): ?><select class="catalog-kind" aria-label="Thư viện giọng"><option value="shared">Thư viện giọng Việt</option><option value="default">Giọng mặc định ElevenLabs</option></select><?php endif ?>
<button type="button" class="load-voices">Tải / tìm giọng</button><button type="button" class="more-voices" hidden>Trang tiếp</button></div>
<select class="voice-results" aria-label="Danh sách Voice ID <?=h($label)?>" hidden></select><p class="voice-feedback muted" role="status"></p></details>
<?php } ?>
<form method="post" id="speechForm" action="admin.php?view=speech"><?php csrf_field() ?><input type="hidden" name="action" value="save_speech">
<label><input type="checkbox" name="speech_enabled" value="1" <?=$settings['speech_enabled']?'checked':''?>> Đọc thông báo và lời nhắn</label>
<label class="platform-select">Nền tảng giọng đọc<select name="speech_provider" id="speechProvider">
<?php foreach(['browser'=>'Giọng trên máy / trình duyệt','elevenlabs'=>'ElevenLabs trực tiếp','fpt'=>'FPT.AI','custom_api'=>'Custom API Voice · vibi.pro'] as $key=>$label): ?>
<option value="<?=h($key)?>" <?=$platform===$key?'selected':''?>><?=h($label)?></option><?php endforeach ?></select>
<small>Chỉ cấu hình nền tảng đang chọn. Cấu hình của những nền tảng khác vẫn được giữ lại.</small></label>

<fieldset class="api-panel" <?php voice_platform_attrs('browser',$platform) ?>><legend>Giọng trên máy</legend>
<p class="muted">Dùng giọng tiếng Việt có sẵn trên máy/trình duyệt đang mở overlay, không cần API key. Nếu OBS không có giọng Việt, chọn một nền tảng API.</p></fieldset>

<fieldset class="api-panel" <?php voice_platform_attrs('fpt',$platform) ?>><legend>FPT.AI</legend>
<label>Giọng đọc FPT.AI<select name="speech_voice"><?php foreach(fpt_voices() as $key=>$label): ?>
<option value="<?=h($key)?>" <?=$settings['speech_voice']===$key?'selected':''?>><?=h($label)?></option><?php endforeach ?></select>
<small>API key FPT.AI dùng giá trị FPT_TTS_API_KEY đã cấu hình trên hosting.</small></label></fieldset>

<fieldset class="api-panel" <?php voice_platform_attrs('elevenlabs',$platform) ?>><legend>ElevenLabs trực tiếp</legend><div class="speech-grid">
<label>API key ElevenLabs<input type="password" name="eleven_api_key" autocomplete="new-password" maxlength="512" placeholder="<?=$elevenConfigured?'Đã lưu khóa · để trống để giữ nguyên':'Dán API key ElevenLabs'?>"><small>Khóa chỉ lưu khi bấm Lưu cấu hình.</small></label>
<label>Voice ID ElevenLabs<input name="eleven_voice_id" value="<?=h($settings['eleven_voice_id'])?>" maxlength="80" placeholder="Dán Voice ID hoặc chọn trong thư viện"><small>Dùng giọng tài khoản ElevenLabs của bạn được quyền truy cập.</small></label>
<label>Model ElevenLabs<select name="eleven_model"><?php foreach(eleven_models() as $key=>$label): ?>
<option value="<?=h($key)?>" <?=$settings['eleven_model']===$key?'selected':''?>><?=h($label)?></option><?php endforeach ?></select></label></div>
<?php voice_picker_fields('elevenlabs','ElevenLabs') ?></fieldset>

<fieldset class="api-panel" <?php voice_platform_attrs('custom_api',$platform) ?>><legend>Custom API Voice · vibi.pro</legend><div class="speech-grid">
<label>API URL<input type="url" name="custom_api_url" value="<?=h($settings['custom_api_url'])?>" maxlength="255" required><small>Mặc định https://api.vibi.pro/v1. Đổi URL cần nhập lại key.</small></label>
<label>API key Custom Voice<input type="password" name="custom_api_key" autocomplete="new-password" maxlength="512" placeholder="<?=$customConfigured?'Đã lưu khóa · để trống để giữ nguyên':'Dán API key vibi.pro'?>"><small>Dùng khóa riêng của dịch vụ Custom API.</small></label>
<label>Nền tảng trong Custom API<select name="custom_api_engine"><?php foreach(['elevenlabs'=>'ElevenLabs qua vibi.pro','minimax'=>'MiniMax','capcut'=>'CapCut'] as $key=>$label): ?>
<option value="<?=h($key)?>" <?=$settings['custom_api_engine']===$key?'selected':''?>><?=h($label)?></option><?php endforeach ?></select></label>
<label>Model<select name="custom_model_preset" id="customModelPreset">
<?php foreach($modelGroups as $engine=>$models): foreach($models as $key=>$label): ?>
<option value="<?=h($key)?>" data-engine="<?=h($engine)?>" <?=$preset===$key?'selected':''?> <?=$engine!==$settings['custom_api_engine']?'hidden disabled':''?>><?=h($label)?></option>
<?php endforeach; endforeach ?><option value="__custom__" <?=$preset==='__custom__'?'selected':''?>>Nhập Model ID khác…</option></select></label>
<input type="hidden" name="custom_api_model" value="<?=h($customModel)?>">
<label id="customModelOtherLabel" <?=$preset==='__custom__'?'':'hidden'?>>Model ID khác<input name="custom_model_other" value="<?=h($preset==='__custom__'?$customModel:'')?>" maxlength="100" <?=$preset==='__custom__'?'required':'disabled'?>></label>
<label>Voice ID Custom API<input name="custom_voice_id" value="<?=h($settings['custom_voice_id'])?>" maxlength="160" placeholder="Dán Voice ID hoặc chọn trong thư viện"><small>Voice ID theo nền tảng đang chọn.</small></label></div>
<?php voice_picker_fields('custom_api','Custom API Voice') ?></fieldset>

<label>Mẫu câu đọc<textarea name="speech_template" required maxlength="600"><?=h($settings['speech_template'])?></textarea></label>
<details class="template-help"><summary>Các biến dùng trong câu đọc</summary><p class="muted"><code>{name}</code> tên · <code>{offering}</code> lễ dâng · <code>{amount_words}</code> tiền bằng chữ · <code>{amount}</code> tiền dạng số · <code>{message}</code> lời nhắn · <code>{message_clause}</code> tự thêm “Với lời nhắn…” khi có nội dung.</p></details>
<div class="sample">Nguyễn Văn An đã thắp hương mười nghìn đồng. Với lời nhắn: Cầu mong gia đình bình an…</div>
<div class="speech-grid common-voice-settings">
<label>Tốc độ đọc<input type="number" name="speech_rate" min="0.75" max="1.25" step="0.05" value="<?=h($settings['speech_rate'])?>"><small id="speechRateHint"><?=($platform==='elevenlabs'||($platform==='custom_api'&&$settings['custom_api_engine']==='elevenlabs'))?'1 = bình thường. ElevenLabs hỗ trợ tối đa 1.20.':'1 = bình thường.'?></small></label>
<label>Âm lượng<input type="number" name="speech_volume" min="0" max="1" step="0.05" value="<?=h($settings['speech_volume'])?>"><small>0 = im lặng, 1 = lớn nhất.</small></label>
<label>Hiển thị tối thiểu (giây)<input type="number" name="display_seconds" min="8" max="30" value="<?=h(max(8, (int)$settings['display_seconds']))?>"><small>Khung lời nhắn chờ đọc xong rồi mới đóng (tối thiểu 8 giây).</small></label></div>
<div class="bar"><button type="submit">Lưu cấu hình</button><button type="button" id="testVoice">Nghe thử câu này</button></div>
<p id="voiceFeedback" class="muted" role="status" aria-live="polite"></p></form>
<p><a href="overlay.html?preview=1&amp;k=<?=h(rawurlencode(OVERLAY_KEY))?>" target="_blank" rel="noopener noreferrer">Xem thử giao diện và nghe mẫu đã lưu ↗</a></p>
<details><summary>Xử lý khi dịch vụ chưa tạo được giọng</summary><p>Kiểm tra cấu hình và hạn mức của nền tảng đang chọn. Kiểm tra lịch sử tạo giọng trước khi xóa bộ nhớ để tạo lại; việc tạo lại có thể dùng thêm hạn mức.</p><?php action_form('clear_speech_cache', [], 'Xóa bộ nhớ giọng đọc'); ?></details>
