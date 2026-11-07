<?php
// Public layout uses pixels in the OBS 1920 x 1080 design frame.
function overlay_layout_options(array $settings): array {
    $width = max(360, min(1400, (int)($settings['overlay_width'] ?? 760)));
    return ['x' => max((int)ceil($width / 2), min(1920 - (int)ceil($width / 2), (int)($settings['overlay_x'] ?? 960))),
        'y' => max(0, min(1000, (int)($settings['overlay_y'] ?? 64))), 'width' => $width, 'font_size' => max(16, min(48, (int)($settings['overlay_font_size'] ?? 22)))];
}
function overlay_layout_input(array $input): array {
    $values = [];
    foreach (['overlay_x' => [0,1920], 'overlay_y' => [0,1000], 'overlay_width' => [360,1400]] as $key => [$min,$max]) {
        $value = filter_var($input[$key] ?? null, FILTER_VALIDATE_INT);
        if ($value === false || $value < $min || $value > $max) throw new InvalidArgumentException('Vị trí hoặc chiều rộng thông điệp nằm ngoài khung 1920 × 1080.');
        $values[$key] = $value;
    }
    $fontSize = filter_var($input['overlay_font_size'] ?? 22, FILTER_VALIDATE_INT);
    if ($fontSize === false || $fontSize < 16 || $fontSize > 48) throw new InvalidArgumentException('Cỡ chữ lời nhắn phải từ 16 đến 48 px.');
    $values['overlay_font_size'] = $fontSize;
    $layout = overlay_layout_options($values);
    return ['overlay_x' => $layout['x'], 'overlay_y' => $layout['y'], 'overlay_width' => $layout['width'], 'overlay_font_size' => $layout['font_size']];
}
