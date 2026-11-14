const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const speechSource=fs.readFileSync(path.join(root,'speech-runtime.js'),'utf8');
const overlaySource=fs.readFileSync(path.join(root,'overlay.js'),'utf8');
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};

function engine({voices=[{lang:'vi-VN',name:'Vietnamese'}],automatic=true,blockedAudio=false,clock,failedAudio=false,staleAudio=false}={}){
  const spoken=[];let cancelled=0;
  class Utterance{constructor(text){this.text=text}}
  class Audio{
    constructor(url){this.url=url}
    play(){if(blockedAudio)return Promise.reject(new DOMException('blocked','NotAllowedError'));
      queueMicrotask(()=>{if(failedAudio||staleAudio&&this.url.includes('stale'))this.onerror?.();else{this.onplaying?.();this.onended?.()}});return Promise.resolve()}
    pause(){}removeAttribute(){}load(){}
  }
  const context=vm.createContext({AbortController,DOMException,URL,Audio,SpeechSynthesisUtterance:Utterance,
    Date:clock?{now:()=>clock.now}:Date,
    setTimeout:clock?clock.setTimeout.bind(clock):(fn,ms)=>setTimeout(fn,ms===150?0:ms),clearTimeout:clock?clock.clearTimeout.bind(clock):clearTimeout,
    speechSynthesis:{getVoices:()=>voices,cancel:()=>cancelled++,speak:utterance=>{
      spoken.push(utterance);if(automatic)queueMicrotask(()=>utterance.onend?.());
    }}});
  vm.runInContext(speechSource,context);
  return {api:context.CungSpeech,spoken,get cancelled(){return cancelled}};
}
class Clock{
  constructor(){this.now=0;this.tasks=new Map();this.next=0}
  setTimeout(fn,ms){const id=++this.next;this.tasks.set(id,{fn,at:this.now+ms});return id}
  clearTimeout(id){this.tasks.delete(id)}
  async advance(ms){
    const end=this.now+ms;
    for(;;){
      const entry=[...this.tasks].filter(([,task])=>task.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!entry)break;this.now=entry[1].at;this.tasks.delete(entry[0]);entry[1].fn();await flush();
    }
    this.now=end;await flush();
  }
}
function overlay(search,{ttsPending=false}={}){
  const clock=new Clock(),elements=new Map(),calls=[];
  const get=id=>{
    if(!elements.has(id)){
      const classes=new Set();elements.set(id,{textContent:'',hidden:true,disabled:false,offsetWidth:720,
        style:{setProperty(){}},dataset:{},children:[],classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
        replaceChildren(){this.children=[]},append(child){this.children.push(child)},setAttribute(){},removeAttribute(){},addEventListener(){}});
    }return elements.get(id);
  };
  let finishReading,renewStatus=200,ackFailures=0,stopped=0,ttsCalls=0;
  const stored=new Map();
  const context=vm.createContext({URLSearchParams,AbortController,DOMException,location:{search},Date:{now:()=>clock.now},
    document:{getElementById:get,body:get('body'),querySelectorAll:()=>[]},window:{addEventListener(){}},
    setTimeout:clock.setTimeout.bind(clock),clearTimeout:clock.clearTimeout.bind(clock),
    sessionStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)},
    CungSpeech:{stop:()=>stopped++,read:(data,{signal}={})=>new Promise((resolve,reject)=>{
      finishReading=resolve;signal?.addEventListener('abort',()=>reject(new DOMException('lost','AbortError')),{once:true});
    })},
    fetch:async(url)=>{
      calls.push(url);
      let status=200,data={success:true};
      if(url.startsWith('renew.php')){status=renewStatus;data={success:status===200}}
      if(url.startsWith('ack.php')&&ackFailures-->0){status=503;data={success:false}}
      if(url.startsWith('tts.php')){ttsCalls++;data=ttsPending||ttsCalls===1?{audio_url:null}:{audio_url:'https://example.org/voice.mp3'}}
      return {ok:status===200,status,headers:new Headers({'Content-Type':'application/json'}),json:async()=>data};
    }});
  vm.runInContext(overlaySource,context);
  return {context,get,clock,calls,stored,setAckFailures:count=>{ackFailures=count},setRenew:status=>{renewStatus=status},finish:()=>finishReading(),get stopped(){return stopped}};
}

const watchdog=setTimeout(()=>{throw new Error('Speech test did not complete; unresolved playback or ACK promise')},15000);
(async()=>{
  const data={speech_text:'Nguyễn Văn An đã thắp hương mười nghìn đồng. Với lời nhắn: Bình an.',
    speech:{enabled:true,provider:'browser',rate:.9,volume:.7}};
  const normal=engine();await normal.api.read(data);
  assert.equal(normal.spoken[0].lang,'vi-VN');assert.equal(normal.spoken[0].rate,.9);assert.equal(normal.spoken[0].volume,.7);
  const longer=engine();await longer.api.read({...data,speech_text:data.speech_text.repeat(6)});
  assert(longer.spoken.length>1);assert(longer.spoken.every(item=>item.text.length<=160));
  await assert.rejects(engine({voices:[]}).api.read(data),/chưa có giọng tiếng Việt/);
  const muted=engine();await muted.api.read({...data,speech:{...data.speech,enabled:false}});assert.equal(muted.spoken.length,0);
  const interrupted=engine({automatic:false}),controller=new AbortController();
  const reading=interrupted.api.read(data,{signal:controller.signal});await flush();controller.abort();
  await assert.rejects(reading,{name:'AbortError'});assert(interrupted.cancelled>0);
  const audioData={...data,speech:{...data.speech,provider:'fpt'},audio_url:'https://example.org/test.mp3'};
  await engine().api.read(audioData);
  await engine().api.read({...audioData,speech:{...audioData.speech,provider:'elevenlabs'},audio_url:'audio.php?file=fixture&sig=test'});
  await engine().api.read({...audioData,speech:{...audioData.speech,provider:'custom_api'}});
  await assert.rejects(engine({blockedAudio:true}).api.read(audioData),/âm thanh đang bị chặn/i);
  await assert.rejects(engine().api.read({...audioData,audio_url:'http://unsafe.example/test.mp3'}),/không hợp lệ/);
  const failedClock=new Clock(),failed=engine({clock:failedClock,failedAudio:true});
  let failedError;
  const failedRead=failed.api.read(audioData).catch(error=>{failedError=error});
  await flush();await failedClock.advance(12000);await failedRead;
  assert.match(failedError.message,/Chưa tải được file giọng đọc/);
  assert(failedClock.now<=12000);assert.equal(failedClock.tasks.size,0);
  const refreshClock=new Clock(),stale=engine({clock:refreshClock,staleAudio:true});
  const freshData={...audioData,audio_url:'https://example.org/stale.mp3'};let refreshed=0;
  const recovered=stale.api.read(freshData,{refreshAudio:async()=>{refreshed++;freshData.audio_url='https://example.org/fresh.mp3'}});
  await flush();await refreshClock.advance(2000);await recovered;assert.equal(refreshed,1);

  const preview=overlay('?preview=1');await flush();
  assert.equal(preview.calls.length,0); // Preview does not touch queue APIs.
  assert.equal(preview.get('donorName').textContent,'Nguyễn Văn An');
  const donation={id:1,claim_token:'a'.repeat(64),lease_seconds:60,name:'<script>bad()</script>',
    message:'Lời nhắn dài',paid_amount:10000,tier:1,speech_text:'Read this',speech:{enabled:true,provider:'browser',volume:1,display_seconds:8}};
  preview.context.testDonation=donation;
  let complete=false;
  const shown=vm.runInContext('play(testDonation)',preview.context).then(result=>{complete=true;return result});
  await flush();
  await preview.clock.advance(700);await preview.clock.advance(8000);
  assert.equal(complete,false); // Minimum display has elapsed, still waiting for speech.
  assert.equal(preview.get('donorName').textContent,donation.name); // Untrusted content is text.
  preview.finish();await flush();assert.equal(await shown,true);

  const live=overlay('');live.context.testDonation=donation;
  const lost=vm.runInContext('play(testDonation)',live.context);
  await live.clock.advance(700);live.setRenew(409);await live.clock.advance(14300);
  assert.equal(await lost,false);assert(live.stopped>0);
  assert(live.calls.some(url=>url.startsWith('renew.php')));
  assert(!live.calls.some(url=>/ack|poll/.test(url)));
  const delayed=overlay('');delayed.context.testDonation={...donation,lease_remaining_ms:2000};
  const expired=vm.runInContext('play(testDonation)',delayed.context);
  await flush();assert.equal(await expired,false);assert.equal(delayed.calls.length,0);
  const retry=overlay('');retry.setAckFailures(10);retry.context.testDonation=donation;
  const confirmed=vm.runInContext('play(testDonation)',retry.context);
  await flush();await retry.clock.advance(700);retry.finish();await flush();await retry.clock.advance(8700);
  assert.equal(retry.stored.size,1); // Completed alert survives an OBS reload before ACK.
  await retry.clock.advance(22000);
  assert.equal(await confirmed,true);
  assert(retry.calls.some(url=>url.startsWith('renew.php'))); // Lease stays alive while ACK fails.
  assert.equal(retry.stored.size,0);
  const restored=overlay('');restored.stored.set('cung-overlay-completed:',JSON.stringify({id:1,claim_token:donation.claim_token}));
  const pending=vm.runInContext('pendingCompletion()',restored.context);
  await restored.context.acknowledge(pending);
  assert.equal(restored.stored.size,0);assert.equal(restored.calls.length,1);assert(restored.calls[0].startsWith('ack.php'));
  const slow=overlay('',{ttsPending:true});slow.context.testDonation={...donation,speech:{...donation.speech,provider:'custom_api'}};
  const skipped=vm.runInContext('play(testDonation)',slow.context);
  await flush();await slow.clock.advance(22000);
  assert.equal(await skipped,true);assert(slow.calls.some(url=>url.startsWith('ack.php')));
  assert.equal(slow.get('speechLabel').textContent,'LỜI NHẮN');
  assert(slow.calls.filter(url=>url.startsWith('tts.php')).length<=21);
  assert.equal(slow.clock.tasks.size,0);
  const preload=overlay('?preview=1');preload.context.testDonation={...donation,speech:{...donation.speech,provider:'custom_api'}};
  const prepared=vm.runInContext('play(testDonation)',preload.context);
  await flush();assert.equal(preload.calls.filter(url=>url.startsWith('tts.php')).length,1);
  await preload.clock.advance(1000);preload.finish();await flush();await preload.clock.advance(8000);
  assert.equal(await prepared,true);assert.equal(preload.calls.filter(url=>url.startsWith('tts.php')).length,2);
  console.log('PASS: Vietnamese voice, MP3 retry deadline and stale URL recovery, shared TTS preload, slow TTS skips speech, preview isolation, lease loss, ACK retries with heartbeat and reload recovery');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>clearTimeout(watchdog));
