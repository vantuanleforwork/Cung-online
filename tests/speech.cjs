const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const speechSource=fs.readFileSync(path.join(root,'speech-runtime.js'),'utf8');
const overlaySource=fs.readFileSync(path.join(root,'overlay.js'),'utf8');
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};

function engine({voices=[{lang:'vi-VN',name:'Vietnamese'}],automatic=true,blockedAudio=false}={}){
  const spoken=[];let cancelled=0;
  class Utterance{constructor(text){this.text=text}}
  class Audio{
    constructor(url){this.url=url}
    play(){if(blockedAudio)return Promise.reject(new DOMException('blocked','NotAllowedError'));
      queueMicrotask(()=>{this.onplaying?.();this.onended?.()});return Promise.resolve()}
    pause(){}removeAttribute(){}load(){}
  }
  const context=vm.createContext({AbortController,DOMException,URL,Audio,SpeechSynthesisUtterance:Utterance,
    setTimeout:(fn,ms)=>setTimeout(fn,ms===150?0:ms),clearTimeout,
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
function overlay(search){
  const clock=new Clock(),elements=new Map(),calls=[];
  const get=id=>{
    if(!elements.has(id)){
      const classes=new Set();elements.set(id,{textContent:'',hidden:true,disabled:false,offsetWidth:720,
        style:{setProperty(){}},dataset:{},children:[],classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
        replaceChildren(){this.children=[]},append(child){this.children.push(child)},setAttribute(){},addEventListener(){}});
    }return elements.get(id);
  };
  let finishReading,renewStatus=200,stopped=0;
  const context=vm.createContext({URLSearchParams,AbortController,DOMException,location:{search},Date:{now:()=>clock.now},
    document:{getElementById:get,body:get('body'),querySelectorAll:()=>[]},window:{addEventListener(){}},
    setTimeout:clock.setTimeout.bind(clock),clearTimeout:clock.clearTimeout.bind(clock),
    CungSpeech:{stop:()=>stopped++,read:(data,{signal}={})=>new Promise((resolve,reject)=>{
      finishReading=resolve;signal?.addEventListener('abort',()=>reject(new DOMException('lost','AbortError')),{once:true});
    })},
    fetch:async(url)=>{calls.push(url);return {ok:renewStatus===200,status:renewStatus,json:async()=>({success:renewStatus===200})}}});
  vm.runInContext(overlaySource,context);
  return {context,get,clock,calls,setRenew:status=>{renewStatus=status},finish:()=>finishReading(),get stopped(){return stopped}};
}

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

  const preview=overlay('?preview=1');await flush();
  assert.equal(preview.calls.length,0); // Preview does not touch queue APIs.
  assert.equal(preview.get('donorName').textContent,'Nguyễn Văn An');
  const donation={id:1,claim_token:'a'.repeat(64),lease_seconds:60,name:'<script>bad()</script>',
    message:'Lời nhắn dài',paid_amount:10000,tier:1,speech_text:'Read this',speech:{enabled:true,provider:'browser',volume:1,display_seconds:8}};
  preview.context.testDonation=donation;
  let complete=false;
  const shown=vm.runInContext('play(testDonation)',preview.context).then(result=>{complete=true;return result});
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
  console.log('PASS: Vietnamese voice/chunks, mute, cancellation, MP3/autoplay errors, preview isolation, wait for speech, heartbeat loss stops playback');
})().catch(error=>{console.error(error);process.exitCode=1});
