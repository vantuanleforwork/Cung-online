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

<label>Mẫu câu đọc<textarea id="speechTemplate" name="speech_template" required maxlength="600" aria-describedby="speechTemplateHelp speechFullPreview"><?=h($settings['speech_template'])?></textarea></label>
<details id="speechTemplateHelp" class="template-help"><summary>Các biến dùng trong câu đọc</summary><p class="muted"><code>{name}</code> tên · <code>{offering}</code> lễ dâng · <code>{amount_words}</code> tiền bằng chữ · <code>{amount}</code> tiền dạng số · <code>{message}</code> lời nhắn · <code>{message_clause}</code> tự thêm “Với lời nhắn…” khi có nội dung.</p></details>
<div class="sample"><strong>Toàn bộ câu sẽ đọc (ví dụ):</strong><output id="speechFullPreview" aria-live="polite"></output></div>
<div class="speech-grid common-voice-settings">
<label>Tốc độ đọc<input type="number" name="speech_rate" min="0.75" max="1.25" step="0.05" value="<?=h($settings['speech_rate'])?>"><small id="speechRateHint"><?=($platform==='elevenlabs'||($platform==='custom_api'&&$settings['custom_api_engine']==='elevenlabs'))?'1 = bình thường. ElevenLabs hỗ trợ tối đa 1.20.':'1 = bình thường.'?></small></label>
<label>Âm lượng<input type="number" name="speech_volume" min="0" max="1" step="0.05" value="<?=h($settings['speech_volume'])?>"><small>0 = im lặng, 1 = lớn nhất.</small></label>
<label>Hiển thị tối thiểu (giây)<input type="number" name="display_seconds" min="8" max="30" value="<?=h(max(8, (int)$settings['display_seconds']))?>"><small>Khung lời nhắn chờ đọc xong rồi mới đóng (tối thiểu 8 giây).</small></label></div>
<div class="bar"><button type="submit">Lưu cấu hình</button><button type="button" id="testVoice">Nghe thử câu này</button></div>
<p id="voiceFeedback" class="muted" role="status" aria-live="polite"></p></form>
<div class="overlay-preview-card" id="overlayPreviewContainer" data-overlay-key="<?=h(rawurlencode(OVERLAY_KEY))?>">
  <h3>Xem thử hiệu ứng trực tiếp trên web</h3>
  <span class="muted">Khung bên dưới mô phỏng chính xác những gì sẽ xuất hiện trên màn hình OBS (bao gồm hoạt cảnh Hỏa Long / Thiên Nữ, card hiển thị và giọng đọc).</span>
  <div class="bar" style="margin-top:12px">
    <button type="button" class="preview-tier-btn active" data-preview-tier-btn="1">Thử 10.000đ</button>
    <button type="button" class="preview-tier-btn" data-preview-tier-btn="2">🐉 Thử rồng 50.000đ</button>
    <button type="button" class="preview-tier-btn" data-preview-tier-btn="3">✦ Thử đại chiêu 200.000đ</button>
    <button type="button" class="preview-tier-btn" id="previewReloadBtn" title="Phát lại hoạt cảnh đang chọn">⟳ Phát lại</button>
    <a id="previewOpenTab" href="overlay.html?preview=1&amp;k=<?=h(rawurlencode(OVERLAY_KEY))?>&amp;tier=1&amp;autoplay=1&amp;motion=1" target="_blank" rel="noopener noreferrer" class="preview-tier-btn" style="margin-left:auto;">Mở tab riêng ↗</a>
  </div>
  <div class="preview-iframe-wrapper">
    <iframe id="overlayPreviewIframe" src="overlay.html?preview=1&amp;k=<?=h(rawurlencode(OVERLAY_KEY))?>&amp;tier=1&amp;autoplay=0&amp;motion=1" allow="autoplay" title="Khung xem thử hiệu ứng OBS"></iframe>
  </div>
</div>

<div class="obs-test-card">
  <h3>Đẩy webhook test vào OBS (Livestream)</h3>
  <span class="muted">Tạo một lượt donate thử nghiệm đưa trực tiếp vào hàng đợi OBS. Nếu OBS đang mở Browser Source, hiệu ứng và giọng đọc sẽ kích hoạt ngay lập tức!</span>
  <div class="bar" style="margin-top:12px">
    <button type="button" class="btn-push-obs" data-test-webhook-amount="10000">📡 Bắn test 10.000đ vào OBS</button>
    <button type="button" class="btn-push-obs" data-test-webhook-amount="50000">🐉 Bắn test 50.000đ vào OBS</button>
    <button type="button" class="btn-push-obs" data-test-webhook-amount="200000">✦ Bắn test 200.000đ vào OBS</button>
  </div>
  <details style="margin-top:14px">
    <summary style="cursor:pointer;font-weight:600;color:#533924">Tùy chỉnh số tiền &amp; lời nhắn test</summary>
    <form id="customWebhookForm" method="post" style="margin-top:10px">
      <div class="custom-test-grid">
        <label style="margin:0">Số tiền (đ)<input type="number" name="custom_amount" min="10000" step="1000" value="50000" required></label>
        <label style="margin:0">Tên người gửi<input type="text" name="custom_name" value="Khách thử nghiệm" maxlength="40"></label>
        <label style="margin:0">Lời nhắn<input type="text" name="custom_message" value="Chúc kênh livestream ngày càng phát triển thuận lợi!" maxlength="255"></label>
        <button type="submit" class="btn-push-obs" style="height:38px;white-space:nowrap">Bắn test vào OBS</button>
      </div>
    </form>
  </details>
  <div id="obsWebhookFeedback" class="test-feedback" role="status" aria-live="polite"></div>
</div>
<details><summary>Xử lý khi dịch vụ chưa tạo được giọng</summary><p>Kiểm tra cấu hình và hạn mức của nền tảng đang chọn. Kiểm tra lịch sử tạo giọng trước khi xóa bộ nhớ để tạo lại; việc tạo lại có thể dùng thêm hạn mức.</p><?php action_form('clear_speech_cache', [], 'Xóa bộ nhớ giọng đọc'); ?></details>
