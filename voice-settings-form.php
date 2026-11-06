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

<label>Mẫu câu đọc thông báo donate<textarea id="speechTemplate" name="speech_template" required maxlength="600" aria-describedby="speechTemplateHelp speechFullPreview"><?=h($settings['speech_template'])?></textarea></label>
<div class="variable-buttons" style="margin:8px 0 12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
  <span class="muted" style="font-weight:600;font-size:13px">Chèn nhanh biến:</span>
  <button type="button" class="btn-var-insert" data-var="{user}">+ {user} (tên)</button>
  <button type="button" class="btn-var-insert" data-var="{amount_words}">+ {amount_words} (tiền bằng chữ)</button>
  <button type="button" class="btn-var-insert" data-var="{amount}">+ {amount} (tiền dạng số)</button>
  <button type="button" class="btn-var-insert" data-var="{message_clause}">+ {message_clause} (tự thêm lời nhắn)</button>
  <button type="button" class="btn-var-insert" data-var="{noi_dung}">+ {noi_dung} (lời nhắn)</button>
</div>
<details id="speechTemplateHelp" class="template-help" open style="background:#fcf8f0;border:1px solid #d8cbb5;border-radius:10px;padding:14px;margin:12px 0 16px;">
  <summary style="cursor:pointer;font-weight:700;color:#5a1d12">Danh sách biến &amp; hướng dẫn mẫu câu đọc donate</summary>
  <div style="margin-top:10px;font-size:13px;line-height:1.7;">
    <table style="width:100%;border-collapse:collapse;background:transparent;">
      <tr><th style="width:180px;padding:6px 8px;border-bottom:1px solid #e2d7c5;text-align:left">Biến</th><th style="padding:6px 8px;border-bottom:1px solid #e2d7c5;text-align:left">Ý nghĩa</th><th style="padding:6px 8px;border-bottom:1px solid #e2d7c5;text-align:left">Ví dụ thực tế khi đọc</th></tr>
      <tr><td style="padding:6px 8px"><code>{user}</code> hoặc <code>{name}</code></td><td style="padding:6px 8px">Tên người gửi donate</td><td style="padding:6px 8px"><em>Nguyễn Văn An</em></td></tr>
      <tr><td style="padding:6px 8px"><code>{amount_words}</code></td><td style="padding:6px 8px">Số tiền đọc thành chữ (<strong>khuyên dùng</strong> để giọng đọc AI mượt nhất)</td><td style="padding:6px 8px"><em>năm mươi nghìn đồng</em></td></tr>
      <tr><td style="padding:6px 8px"><code>{amount}</code> hoặc <code>{so_tien}</code></td><td style="padding:6px 8px">Số tiền dạng số có chữ đồng</td><td style="padding:6px 8px"><em>50.000 đồng</em></td></tr>
      <tr><td style="padding:6px 8px"><code>{message_clause}</code></td><td style="padding:6px 8px">Tự động thêm “Với lời nhắn…” khi có nhắn (nếu không nhắn thì tự bỏ qua)</td><td style="padding:6px 8px"><em>Với lời nhắn: Chúc kênh ngày càng phát triển</em></td></tr>
      <tr><td style="padding:6px 8px"><code>{noi_dung}</code> hoặc <code>{message}</code></td><td style="padding:6px 8px">Lời nhắn thuần của người gửi</td><td style="padding:6px 8px"><em>Chúc kênh ngày càng phát triển</em></td></tr>
    </table>
    <div style="margin-top:12px;padding-top:10px;border-top:1px dashed #d8cbb5;">
      <strong>Mẫu câu gợi ý (bấm vào để dùng ngay):</strong>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
        <button type="button" class="btn-sample-apply" data-template="{user} đã donate {amount_words}. {message_clause}">Mẫu 1: {user} đã donate {amount_words}. {message_clause}</button>
        <button type="button" class="btn-sample-apply" data-template="{user} đã ủng hộ {amount_words}! {message_clause}">Mẫu 2: {user} đã ủng hộ {amount_words}! {message_clause}</button>
        <button type="button" class="btn-sample-apply" data-template="Cảm ơn {user} đã donate {amount}. {noi_dung}">Mẫu 3: Cảm ơn {user} đã donate {amount}. {noi_dung}</button>
      </div>
    </div>
  </div>
</details>
<div class="sample"><strong>Toàn bộ câu sẽ đọc (ví dụ):</strong><output id="speechFullPreview" aria-live="polite"></output></div>

<fieldset class="api-panel" style="margin-top:20px"><legend>Giọng đọc mặc định cho 3 mốc donate</legend>
  <p class="muted">Voice ID mặc định cho từng mốc (khi người donate không chọn giọng cụ thể, hoặc mốc dưới 50k không được chọn).</p>
  <div class="speech-grid">
    <label>Mốc 1: Dưới 50.000đ (10.000đ - 49.000đ)
      <input name="tier1_voice_id" value="<?=h($settings['tier1_voice_id'] ?? '')?>" placeholder="Voice ID mặc định mốc 1 (để trống dùng Voice ID chung)" maxlength="160">
      <small>Mốc này người donate không được chọn, luôn đọc bằng giọng này.</small>
    </label>
    <label>Mốc 2: Từ 50.000đ đến 199.000đ
      <input name="tier2_voice_id" value="<?=h($settings['tier2_voice_id'] ?? '')?>" placeholder="Voice ID mặc định mốc 2 (để trống dùng mốc 1)" maxlength="160">
      <small>Áp dụng khi người donate mốc 50k chọn "Mặc định".</small>
    </label>
  </div>
  <div style="margin-top:12px">
    <label>Mốc 3: Từ 200.000đ trở lên (VIP / Đại chiêu)
      <input name="tier3_voice_id" value="<?=h($settings['tier3_voice_id'] ?? '')?>" placeholder="Voice ID mặc định mốc 3 (để trống dùng mốc 2)" maxlength="160">
      <small>Áp dụng khi người donate mốc 200k chọn "Mặc định".</small>
    </label>
  </div>
</fieldset>

<div class="speech-grid common-voice-settings">
<label>Tốc độ đọc<input type="number" name="speech_rate" min="0.75" max="1.25" step="0.05" value="<?=h($settings['speech_rate'])?>"><small id="speechRateHint"><?=($platform==='elevenlabs'||($platform==='custom_api'&&$settings['custom_api_engine']==='elevenlabs'))?'1 = bình thường. ElevenLabs hỗ trợ tối đa 1.20.':'1 = bình thường.'?></small></label>
<label>Âm lượng<input type="number" name="speech_volume" min="0" max="1" step="0.05" value="<?=h($settings['speech_volume'])?>"><small>0 = im lặng, 1 = lớn nhất.</small></label>
<label>Hiển thị tối thiểu (giây)<input type="number" name="display_seconds" min="8" max="30" value="<?=h(max(8, (int)$settings['display_seconds']))?>"><small>Khung lời nhắn chờ đọc xong rồi mới đóng (tối thiểu 8 giây).</small></label></div>
<div class="bar"><button type="submit">Lưu cấu hình</button><button type="button" id="testVoice">Nghe thử câu này</button></div>
<p id="voiceFeedback" class="muted" role="status" aria-live="polite"></p></form>

<div class="api-panel" style="margin-top:24px;background:#fbf7ef">
  <h3 style="margin-top:0;color:#5a1d12">Danh sách giọng đọc cho người donate tự chọn (Frontend)</h3>
  <p class="muted">Người donate từ 50.000đ hoặc từ 200.000đ sẽ được chọn 1 trong các giọng này tại trang gửi donate. Mốc dưới 50k không được chọn (sử dụng giọng mặc định Mốc 1).</p>
  <form method="post" style="display:grid;grid-template-columns:1fr 1fr 190px auto;gap:10px;align-items:end;margin:16px 0">
    <?php csrf_field() ?>
    <input type="hidden" name="action" value="add_voice_option">
    <label style="margin:0">Tên giọng hiển thị<input name="name" required maxlength="80" placeholder="Ví dụ: Chị Google, Nam MC..."></label>
    <label style="margin:0">Voice ID<input name="voice_id" required maxlength="160" placeholder="Dán Voice ID của nền tảng"></label>
    <label style="margin:0">Mở khóa từ mốc
      <select name="tier_min">
        <option value="2">Mở từ 50.000đ (Bậc 2 &amp; 3)</option>
        <option value="3">Mở từ 200.000đ (Chỉ Bậc 3 VIP)</option>
      </select>
    </label>
    <button type="submit" style="height:38px;white-space:nowrap">+ Thêm giọng</button>
  </form>

  <div class="scroll" style="margin-top:14px">
    <table style="width:100%">
      <tr><th>Tên giọng</th><th>Voice ID</th><th>Mốc mở khóa</th><th>Thao tác</th></tr>
      <?php if (empty($customVoiceOptions)): ?>
        <tr><td colspan="4" class="muted" style="text-align:center;padding:16px">Chưa có giọng tùy chọn nào trong danh sách. Hãy thêm các giọng đọc phía trên để người donate có thể chọn từ mốc 50k trở lên.</td></tr>
      <?php else: foreach ($customVoiceOptions as $opt): ?>
        <tr>
          <td><strong><?=h($opt['name'])?></strong></td>
          <td><code><?=h($opt['voice_id'])?></code></td>
          <td><?=((int)$opt['tier_min'] === 3) ? '<span style="color:#784db5;font-weight:700">⭐ Từ 200.000đ (VIP)</span>' : '<span style="color:#b03a1c;font-weight:600">✦ Từ 50.000đ</span>'?></td>
          <td>
            <form method="post" class="inline" onsubmit="return confirm('Bạn có chắc muốn xóa giọng <?=h(addslashes($opt['name']))?> khỏi danh sách chọn?');">
              <?php csrf_field() ?>
              <input type="hidden" name="action" value="delete_voice_option">
              <input type="hidden" name="id" value="<?=h($opt['id'])?>">
              <button type="submit" style="background:#8f2512;padding:5px 10px;font-size:12px">Xóa</button>
            </form>
          </td>
        </tr>
      <?php endforeach; endif ?>
    </table>
  </div>
</div>
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
        <label style="margin:0">Giọng đọc test
          <select name="custom_voice_id">
            <option value="">Giọng mặc định</option>
            <?php foreach ($customVoiceOptions ?? [] as $opt): ?>
              <option value="<?=h($opt['voice_id'])?>"><?=h($opt['name'])?> (<?=((int)$opt['tier_min']===3)?'VIP 200k':'50k'?>)</option>
            <?php endforeach ?>
          </select>
        </label>
        <button type="submit" class="btn-push-obs" style="height:38px;white-space:nowrap">Bắn test vào OBS</button>
      </div>
    </form>
  </details>
  <div id="obsWebhookFeedback" class="test-feedback" role="status" aria-live="polite"></div>
</div>
<details><summary>Xử lý khi dịch vụ chưa tạo được giọng</summary><p>Kiểm tra cấu hình và hạn mức của nền tảng đang chọn. Kiểm tra lịch sử tạo giọng trước khi xóa bộ nhớ để tạo lại; việc tạo lại có thể dùng thêm hạn mức.</p><?php action_form('clear_speech_cache', [], 'Xóa bộ nhớ giọng đọc'); ?></details>
