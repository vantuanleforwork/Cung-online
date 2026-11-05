'use strict';
const form=document.getElementById('speechForm'),button=document.getElementById('testVoice'),feedback=document.getElementById('voiceFeedback');
let previewController=null;
async function voiceAction(body,signal){
  const controller=new AbortController(),cancel=()=>controller.abort(),timer=setTimeout(cancel,25000);
  signal?.addEventListener('abort',cancel,{once:true});
  try{
    if(signal?.aborted)cancel();
    const response=await fetch('admin.php',{method:'POST',body,signal:controller.signal});
    if(!response.headers.get('Content-Type')?.includes('application/json'))throw new Error('Phiên quản trị đã hết hạn hoặc máy chủ lỗi. Tải lại trang và đăng nhập để thử lại.');
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Chưa kết nối được dịch vụ giọng.');return result;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}
if(form&&button){
  const platform=form.elements.namedItem('speech_provider');
  const panels=form.querySelectorAll('[data-provider-panel]');
  const engine=form.elements.namedItem('custom_api_engine'),model=form.elements.namedItem('custom_api_model');
  const preset=form.elements.namedItem('custom_model_preset'),other=form.elements.namedItem('custom_model_other');
  const otherLabel=document.getElementById('customModelOtherLabel');
  const defaultModels={elevenlabs:'eleven_flash_v2_5',minimax:'speech-2.8-turbo',capcut:'capcut'};
  const modelsByEngine=new Map([[engine.value,model.value]]);
  let previousEngine=engine.value;
  function syncModel(){
    if(!preset)return;
    const free=preset.value==='__custom__';
    otherLabel.hidden=!free;other.disabled=!free||platform.value!=='custom_api';other.required=free;
    model.value=free?other.value.trim():preset.value;
    modelsByEngine.set(engine.value,model.value);
  }
  function selectModel(value){
    if(!preset){model.value=value;return}
    const known=Array.from(preset.options).some(option=>option.value===value&&option.dataset.engine===engine.value);
    for(const option of preset.options){
      const wrong=Boolean(option.dataset.engine&&option.dataset.engine!==engine.value);
      option.hidden=wrong;option.disabled=wrong;
    }
    preset.value=known?value:'__custom__';
    if(!known)other.value=value;
    syncModel();
  }
  function syncPlatform(){
    for(const panel of panels){const active=panel.dataset.providerPanel===platform.value;panel.hidden=!active;panel.disabled=!active}
    syncModel();
    const hint=document.getElementById('speechRateHint');
    if(hint)hint.textContent=platform.value==='elevenlabs'||(platform.value==='custom_api'&&engine.value==='elevenlabs')?'1 = bình thường. ElevenLabs hỗ trợ tối đa 1.20.':'1 = bình thường.';
    document.querySelectorAll('.voice-picker').forEach(picker=>{
      const kind=picker.querySelector('.catalog-kind');
      if(kind){kind.hidden=engine.value!=='elevenlabs';kind.disabled=engine.value!=='elevenlabs'}
    });
  }
  selectModel(model.value);syncPlatform();
  platform.addEventListener('change',()=>{
    previewController?.abort();CungSpeech.stop();syncPlatform();feedback.textContent='';
  });
  engine.addEventListener('change',()=>{
    modelsByEngine.set(previousEngine,model.value);previousEngine=engine.value;
    selectModel(modelsByEngine.get(engine.value)||defaultModels[engine.value]);syncPlatform();
  });
  preset?.addEventListener('change',syncModel);other?.addEventListener('input',syncModel);
  button.addEventListener('click',async()=>{
    button.disabled=true;feedback.textContent='Đang chuẩn bị giọng đọc…';
    previewController=new AbortController();const controller=previewController;
    try{
      const body=new FormData(form);body.set('action','preview_voice');
      const deadline=Date.now()+180000;
      let result;
      for(;;){
        result=await voiceAction(body,controller.signal);
        if(!result.demo.speech.enabled||result.demo.speech.volume===0||result.demo.speech.provider==='browser'||result.demo.audio_url)break;
        if(Date.now()>deadline)throw new Error('Giọng vẫn đang được tạo. Kiểm tra lịch sử trên dịch vụ; bấm nghe thử lại sẽ tiếp tục theo dõi tác vụ cũ.');
        feedback.textContent='Dịch vụ đang tạo giọng… Đang kiểm tra tác vụ đã có, không gửi yêu cầu tạo lại.';
        await new Promise((resolve,reject)=>{
          const done=()=>{controller.signal.removeEventListener('abort',cancel);resolve()};
          const timer=setTimeout(done,3000),cancel=()=>{clearTimeout(timer);reject(new DOMException('Stopped','AbortError'))};
          controller.signal.addEventListener('abort',cancel,{once:true});
        });
      }
      feedback.textContent=result.demo.speech_text;
      await CungSpeech.read(result.demo,{signal:controller.signal});
      feedback.textContent=(result.demo.speech.enabled&&result.demo.speech.volume>0?'Đã đọc thử: ':'Giọng đọc đang tắt hoặc âm lượng bằng 0. Mẫu câu: ')+result.demo.speech_text;
    }catch(error){feedback.textContent=error.name==='AbortError'?'Yêu cầu quá lâu. Kiểm tra kết nối và thử lại.':error.message}
    finally{previewController=null;button.disabled=false}
  });
  window.addEventListener('pagehide',()=>{previewController?.abort();CungSpeech.stop()});
  document.querySelectorAll('.voice-picker').forEach(picker=>{
    const provider=picker.dataset.provider,search=picker.querySelector('.voice-search'),load=picker.querySelector('.load-voices'),more=picker.querySelector('.more-voices'),results=picker.querySelector('.voice-results'),note=picker.querySelector('.voice-feedback');
    let page=0,cursor='',generation=0;
    const reset=()=>{page=0;cursor='';generation++;results.hidden=true;more.hidden=true;note.textContent=''};
    const watched=provider==='custom_api'?['custom_api_url','custom_api_key','custom_api_engine']:['eleven_api_key'];
    watched.forEach(name=>form.elements.namedItem(name)?.addEventListener('input',reset));
    platform.addEventListener('change',reset);
    search.addEventListener('input',reset);picker.querySelector('.catalog-kind')?.addEventListener('change',reset);
    async function fetchVoices(next){
      if(!next){page=0;cursor=''}
      const current=++generation;load.disabled=more.disabled=true;note.textContent='Đang tải Voice ID…';
      try{
        const body=new FormData(form);body.set('action','list_voices');body.set('catalog_provider',provider);
        body.set('voice_search',search.value);body.set('voice_page',String(page));body.set('voice_cursor',cursor);
        body.set('catalog_kind',picker.querySelector('.catalog-kind')?.value||'shared');
        const data=await voiceAction(body);
        if(current!==generation)return;
        results.replaceChildren(new Option('Chọn giọng để điền Voice ID…',''));
        for(const voice of data.voices){const option=new Option(voice.name+(voice.language?' · '+voice.language:'')+' · '+voice.voice_id,voice.voice_id);results.append(option)}
        results.hidden=data.voices.length===0;more.hidden=!data.has_more;page++;cursor=data.next_cursor||'';
        note.textContent=data.voices.length?'Đã tải '+data.voices.length+' giọng. Chọn một giọng hoặc tiếp tục nhập ID thủ công.':'Không có giọng phù hợp. Thử từ khóa khác hoặc nhập ID thủ công.';
      }catch(error){if(current===generation)note.textContent=error.message}
      finally{load.disabled=more.disabled=false}
    }
    load.addEventListener('click',()=>fetchVoices(false));more.addEventListener('click',()=>fetchVoices(true));
    search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();load.click()}});
    results.addEventListener('change',()=>{
      if(!results.value)return;
      form.elements.namedItem(provider==='custom_api'?'custom_voice_id':'eleven_voice_id').value=results.value;
      note.textContent='Đã chọn Voice ID: '+results.value+'. Bấm Lưu cấu hình để sử dụng.';
    });
  });
}
