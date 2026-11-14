(function(global){
  'use strict';
  let active=null;
  const aborted=()=>new DOMException('Đã dừng giọng đọc.','AbortError');
  function wait(ms,signal){
    return new Promise((resolve,reject)=>{
      if(signal?.aborted)return reject(aborted());
      const finish=()=>{signal?.removeEventListener('abort',cancel);resolve()};
      const timer=setTimeout(finish,ms);
      const cancel=()=>{clearTimeout(timer);reject(aborted())};
      signal?.addEventListener('abort',cancel,{once:true});
    });
  }
  function stop(){active?.abort()}
  async function vietnameseVoice(signal){
    if(!global.speechSynthesis||!global.SpeechSynthesisUtterance)throw new Error('Trình duyệt này không hỗ trợ đọc lời nhắn. Chọn ElevenLabs hoặc FPT.AI trong admin để phát MP3 trong OBS.');
    for(let i=0;i<12;i++){
      const voices=global.speechSynthesis.getVoices();
      const voice=voices.find(v=>/^vi(?:-|_|$)/i.test(v.lang));
      if(voice)return voice;
      await wait(150,signal);
    }
    throw new Error('Máy/trình duyệt chưa có giọng tiếng Việt. Chọn ElevenLabs hoặc FPT.AI trong admin.');
  }
  function chunks(text){
    const words=text.split(/\s+/),result=[];let current='';
    for(const word of words){
      if(current&&(current+' '+word).length>160){result.push(current);current=''}
      current+=(current?' ':'')+word;
    }
    if(current)result.push(current);return result;
  }
  async function browserRead(data,signal){
    const voice=await vietnameseVoice(signal);
    for(const text of chunks(data.speech_text)){
      if(signal.aborted)throw aborted();
      await new Promise((resolve,reject)=>{
        const utterance=new global.SpeechSynthesisUtterance(text);
        utterance.voice=voice;utterance.lang='vi-VN';utterance.rate=data.speech.rate;utterance.volume=data.speech.volume;
        let settled=false,timer;
        const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);utterance.onend=utterance.onerror=null};
        const done=error=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve()};
        const cancel=()=>{done(aborted());global.speechSynthesis.cancel()};
        utterance.onend=()=>done();
        utterance.onerror=event=>done(new Error(event.error==='not-allowed'?'Âm thanh đang bị chặn. Bấm Bật tiếng / nghe thử trong trang overlay.':'Không đọc được giọng trên máy này. Có thể chuyển sang FPT.AI trong admin.'));
        timer=setTimeout(()=>{done(new Error('Giọng đọc không phản hồi. Kiểm tra âm thanh hoặc chuyển sang FPT.AI.'));global.speechSynthesis.cancel()},60000);
        signal.addEventListener('abort',cancel,{once:true});
        try{global.speechSynthesis.speak(utterance)}catch(error){done(error)}
      });
    }
  }
  async function audioRead(data,signal,loadTimeoutMs,refreshAudio){
    if(!data.audio_url)throw new Error('File giọng đọc chưa sẵn sàng. Hãy thử lại sau vài giây.');
    const base=new URL(global.location?.href||'https://localhost/');
    function audioUrl(){
      const url=new URL(data.audio_url,base);
      if(url.protocol!=='https:'&&!(url.protocol==='http:'&&url.origin===base.origin))throw new Error('Đường dẫn âm thanh không hợp lệ.');
      return url.href;
    }
    audioUrl();
    const deadline=Date.now()+loadTimeoutMs;
    let refreshed=false;
    while(Date.now()<deadline){
      if(signal.aborted)throw aborted();
      try{
        await new Promise((resolve,reject)=>{
          const audio=new Audio(audioUrl());audio.volume=data.speech.volume;
          let playing=false,settled=false;
          const done=error=>{
            if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);
            audio.onended=audio.onerror=audio.onplaying=null;audio.pause();audio.removeAttribute('src');audio.load();
            if(error){error.playing=playing;reject(error)}else resolve();
          };
          const cancel=()=>done(aborted());
          let timer=setTimeout(()=>done(new Error('Âm thanh chưa tải xong.')),Math.min(8000,Math.max(1,deadline-Date.now())));
          audio.onplaying=()=>{playing=true;clearTimeout(timer);timer=setTimeout(()=>done(new Error('File giọng đọc quá dài hoặc bị gián đoạn.')),180000)};
          audio.onended=()=>done();audio.onerror=()=>done(new Error('File giọng đọc đang được tạo hoặc không tải được.'));
          signal.addEventListener('abort',cancel,{once:true});
          audio.play().catch(done);
        });
        return;
      }catch(error){
        if(error.name==='AbortError'||error.playing)throw error;
        if(error.name==='NotAllowedError')throw new Error('Âm thanh đang bị chặn. Bấm Bật tiếng / nghe thử trong trang overlay.');
        if(Date.now()+2000>=deadline)throw new Error('Chưa tải được file giọng đọc. Kiểm tra kết nối và dịch vụ TTS trong admin.');
        if(!refreshed&&refreshAudio){
          refreshed=true;
          try{await refreshAudio(deadline-Date.now())}catch(refreshError){if(signal.aborted)throw aborted()}
        }
        if(Date.now()+2000>=deadline)throw new Error('Chưa tải được file giọng đọc. Kiểm tra kết nối và dịch vụ TTS trong admin.');
        await wait(2000,signal);
      }
    }
  }
  async function read(data,{signal,loadTimeoutMs=12000,refreshAudio}={}){
    stop();
    if(!data.speech?.enabled||data.speech.volume===0)return;
    const controller=new AbortController();active=controller;
    const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
    try{
      if(signal?.aborted)throw aborted();
      if(['fpt','elevenlabs','custom_api'].includes(data.speech.provider))await audioRead(data,controller.signal,Math.max(1000,Math.min(30000,Number(loadTimeoutMs)||12000)),refreshAudio);
      else await browserRead(data,controller.signal);
    }finally{signal?.removeEventListener('abort',cancel);if(active===controller)active=null}
  }
  global.CungSpeech={read,stop};
})(globalThis);
