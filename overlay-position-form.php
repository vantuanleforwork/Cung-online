<?php
if (empty($loggedIn) || ($view ?? '') !== 'speech') { http_response_code(403); exit; }
$layout = overlay_layout_options($settings);
?>
<section class="overlay-preview-card" aria-labelledby="overlayPositionTitle">
  <h3 id="overlayPositionTitle">Vị trí thông điệp trên OBS</h3>
  <p class="muted">Khung ngang 1920 × 1080. Kéo thông điệp trong preview hoặc nhập tọa độ. Mặc định: giữa, phía trên.</p>
  <form method="post" action="admin.php?view=speech" id="overlayPositionForm">
    <?php csrf_field() ?><input type="hidden" name="action" value="save_overlay">
    <div class="speech-grid">
      <label>Tâm ngang X (px)<input type="number" name="overlay_x" min="0" max="1920" step="1" required value="<?=h($layout['x'])?>"></label>
      <label>Cách mép trên Y (px)<input type="number" name="overlay_y" min="0" max="1000" step="1" required value="<?=h($layout['y'])?>"></label>
      <label>Chiều rộng (px)<input type="number" name="overlay_width" min="360" max="1400" step="1" required value="<?=h($layout['width'])?>"></label>
      <label>Cỡ chữ lời nhắn (px)<input type="number" name="overlay_font_size" min="16" max="48" step="1" required value="<?=h($layout['font_size'])?>"></label>
    </div>
    <div class="preview-iframe-wrapper" style="touch-action:none">
      <iframe id="overlayPositionPreview" src="overlay.html?preview=1&amp;editor=1&amp;k=<?=h(rawurlencode(OVERLAY_KEY))?>" title="Kéo để chỉnh vị trí thông điệp trên khung OBS 1920 × 1080"></iframe>
    </div>
    <p id="overlayPositionStatus" class="muted" role="status" aria-live="polite">Preview hiển thị thay đổi ngay; bấm lưu để áp dụng cho OBS.</p>
    <div class="bar"><button type="submit">Lưu vị trí thông điệp</button><button type="button" id="overlayPositionReset">Đặt lại giữa phía trên</button></div>
  </form>
</section>
