<?php
require_once __DIR__ . '/common.php';

// Verify the deployed speech schema before using speech features.
function ensure_speech_schema(PDO $db): void {
    require_schema($db, ['donations'=>['selected_voice_id','voice_name','is_test'], 'app_settings'=>['speech_enabled','speech_template','speech_provider','speech_voice','speech_rate','speech_volume','display_seconds','overlay_x','overlay_y','overlay_width','overlay_font_size','eleven_voice_id','eleven_model','custom_api_url','custom_api_engine','custom_api_model','custom_voice_id','tier1_voice_id','tier2_voice_id','tier3_voice_id','speech_schema_version'], 'custom_voice_options'=>['id','name','voice_id','tier_min'], 'tts_audio_cache'=>['cache_key','state','audio_url','audio_content','task_id','next_poll_at'], 'tts_credentials'=>['provider','api_key']]);
    ensure_music_schema($db);
}
