<?php
// Runs only against the disposable database created by integration.py; all HTTP calls are mocked.
require $argv[1] . '/voice-catalog.php';
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$db = db();
$options = ['custom_api_url'=>'https://api.vibi.pro/v1','custom_api_engine'=>'elevenlabs',
    'custom_api_model'=>'eleven_flash_v2_5','custom_voice_id'=>'FixtureVoice','rate'=>1];
$body = custom_voice_request('Xin chào', $options);
check($body['provider']==='elevenlabs' && $body['language_code']==='vi' && $body['export_transcript']===false,'ElevenLabs request');
check(custom_voice_request('Xin chào',array_replace($options,['custom_api_model'=>'eleven_v3']))['model_id']==='eleven_v3','Custom v3 request');
check(eleven_request('Xin chào',['eleven_model'=>'eleven_v3','rate'=>1])['model_id']==='eleven_v3','Direct v3 request');
$mm = custom_voice_request('Xin chào', array_replace($options,['custom_api_engine'=>'minimax','custom_api_model'=>'speech-2.8-turbo']));
check($mm['language_code']==='Vietnamese' && $mm['voice_settings']['vol']===1.0 && !isset($mm['voice_settings']['stability']),'MiniMax request');
$cc = custom_voice_request('Xin chào', array_replace($options,['custom_api_engine'=>'capcut','custom_api_model'=>'capcut']));
check($cc['language_code']==='vi' && $cc['voice_settings']['pitch']===0,'CapCut request');
check(custom_api_url('https://api.vibi.pro')==='https://api.vibi.pro/v1','Normalize base URL');
foreach(['http://api.vibi.pro','https://127.0.0.1','https://name:secret@api.vibi.pro','https://api.vibi.pro?key=secret','https://api.vibi.pro:8080'] as $bad) {
    try { custom_api_url($bad); throw new RuntimeException('Unsafe URL accepted'); } catch (InvalidArgumentException $expected) {}
}
$calls=[]; $poll=0;
$transport=function($base,$path,$key,$method,$payload) use (&$calls,&$poll) {
    $calls[]=[$base,$path,$method,$payload];
    if($method==='POST')return [202,['id'=>'task-123','status'=>'pending']];
    $poll++;
    return $poll===1 ? [200,['status'=>'processing','progress'=>60]] : [200,['status'=>'completed','result'=>['audio_url'=>'https://api.vibi.pro/audio/task-123.mp3']]];
};
$text='Async fixture'; $key=custom_cache_key($text,$options,'mock-custom-key');
check(custom_audio($db,$text,$options,'mock-custom-key',$transport)===null,'Task queued');
check(custom_audio($db,$text,$options,'mock-custom-key',$transport)===null,'Task processing');
for($i=0;$i<5;$i++)check(custom_audio($db,$text,$options,'mock-custom-key',$transport)===null,'Poll throttled');
check(count($calls)===2,'Repeated poll must not submit again');
$db->prepare('UPDATE tts_audio_cache SET next_poll_at=NOW()-INTERVAL 1 SECOND WHERE cache_key=?')->execute([$key]);
check(custom_audio($db,$text,$options,'mock-custom-key',$transport)==='https://api.vibi.pro/audio/task-123.mp3','Nested result URL');
custom_audio($db,$text,$options,'mock-custom-key',$transport);
check(count($calls)===3 && count(array_filter($calls,function($call){return $call[2]==='POST';}))===1,'Completed task cache');
check($calls[0][1]==='/text-to-speech/FixtureVoice' && $calls[1][1]==='/history/task-123','Documented routes');
check(custom_audio_result(['status'=>'completed','audio_url'=>'https://api.vibi.pro/audio/root.mp3'])!==null,'Top-level URL compatibility');
foreach([['status'=>'failed'],['status'=>'completed','result'=>['audio_url'=>'javascript:bad']]] as $bad) {
    try {custom_audio_result($bad);throw new RuntimeException('Invalid task response accepted');}catch(SpeechProviderException $expected){}
}
$failTransport=function($base,$path,$key,$method,$payload){if($method==='POST')return [202,['id'=>'failed-task','status'=>'pending']];return [200,['status'=>'failed','error'=>'private provider details']];};
custom_audio($db,'Fail fixture',$options,'mock-custom-key',$failTransport);
try{custom_audio($db,'Fail fixture',$options,'mock-custom-key',$failTransport);throw new RuntimeException('Failure ignored');}catch(SpeechProviderException $expected){}
$failKey=custom_cache_key('Fail fixture',$options,'mock-custom-key');
$s=$db->prepare('SELECT state FROM tts_audio_cache WHERE cache_key=?');$s->execute([$failKey]);check($s->fetchColumn()==='failed','Failed task persisted');

$catalogCalls=[];
$catalogHttp=function($base,$path,$key,$method,$body)use(&$catalogCalls){$catalogCalls[]=[$base,$path,$key,$method];return [200,['voice_list'=>[['voice_id'=>'7036989371643923969','name'=>'Giọng mẫu','language'=>'vi']], 'has_more'=>true,'next_page_token'=>'cursor-next']];};
$in=['catalog_provider'=>'custom_api','custom_api_key'=>'mock-custom-key','custom_voice_id'=>'','custom_api_url'=>'https://api.vibi.pro/v1',
    'custom_api_engine'=>'elevenlabs','custom_api_model'=>'eleven_flash_v2_5','voice_search'=>'An','voice_page'=>0];
$list=voice_catalog($db,$in,$catalogHttp);check($list['voices'][0]['voice_id']==='7036989371643923969','Do not convert large voice IDs to float');
check(strpos($catalogCalls[0][1],'/shared-voices?')===0 && strpos($catalogCalls[0][1],'required_languages=vi')!==false,'Shared Vietnamese voices');
voice_catalog($db,array_replace($in,['catalog_kind'=>'default']),$catalogHttp);
voice_catalog($db,array_replace($in,['custom_api_engine'=>'minimax']),$catalogHttp);
voice_catalog($db,array_replace($in,['custom_api_engine'=>'capcut']),$catalogHttp);
voice_catalog($db,['catalog_provider'=>'elevenlabs','eleven_api_key'=>'mock-eleven-key','voice_cursor'=>'next-value'],$catalogHttp);
check(strpos($catalogCalls[1][1],'/default-voices?')===0,'Default voices');
check(strpos($catalogCalls[2][1],'/minimax/system-voices?')===0 && strpos($catalogCalls[2][1],'language=Vietnamese')!==false,'MiniMax voices');
check(strpos($catalogCalls[3][1],'/capcut/system-voices?')===0 && strpos($catalogCalls[3][1],'page=1')!==false,'CapCut page numbering');
check($catalogCalls[4][0]==='https://api.elevenlabs.io/v2' && strpos($catalogCalls[4][1],'next_page_token=next-value')!==false,'Official ElevenLabs cursor');
check(strpos(json_encode($list),'mock-custom-key')===false,'No key in catalog result');
$db->exec("DELETE FROM tts_audio_cache WHERE cache_key IN ('".$key."','".$failKey."')");
echo "PASS: vibi async POST-once/history/cache/failure, provider payloads, HTTPS validation, both Voice ID catalogs\n";
