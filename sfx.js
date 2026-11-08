/* Âm thanh hiệu ứng tổng hợp bằng WebAudio (không cần file mp3).
   Tải SAU overlay.js và intro-fx.js. Tùy chọn trên URL overlay: &sfx=0 (tắt), &sfxvol=0.5 (âm lượng 0-1). */
(function(global){
'use strict';
const rnd=(a,b)=>a+Math.random()*(b-a);
const params=new URLSearchParams((global.location&&global.location.search)||'');
const enabled=params.get('sfx')!=='0';
const VOL=Math.max(0,Math.min(1,Number(params.get('sfxvol')||.7)));
let ctx=null,master,dry,conv,noiseBuf,warned=false;
const sources=new Set();
let dragonAbort=null;
function track(node){sources.add(node);node.addEventListener('ended',()=>sources.delete(node),{once:true});return node}

function impulse(c,sec){
  const n=Math.floor(c.sampleRate*sec),b=c.createBuffer(2,n,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6)}
  return b;
}
function ac(){
  if(ctx)return ctx;
  const AC=global.AudioContext||global.webkitAudioContext;if(!AC)return null;
  ctx=new AC();
  master=ctx.createGain();master.gain.value=VOL;
  const comp=ctx.createDynamicsCompressor();master.connect(comp);comp.connect(ctx.destination);
  dry=ctx.createGain();dry.connect(master);
  conv=ctx.createConvolver();conv.buffer=impulse(ctx,2.6);
  const wet=ctx.createGain();wet.gain.value=.4;conv.connect(wet);wet.connect(master);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return ctx;
}
function resume(){
  const c=ac();if(!c)return;
  master.gain.cancelScheduledValues(c.currentTime);master.gain.setValueAtTime(VOL,c.currentTime);
  if(c.state==='suspended'&&c.resume)c.resume().catch(()=>{});
}
function checkBlocked(){
  setTimeout(()=>{
    if(ctx&&ctx.state!=='running'&&!warned&&typeof global.notice==='function'){
      warned=true;global.notice('Âm thanh hiệu ứng đang bị chặn. Bấm Bật tiếng / nghe thử hoặc bấm vào trang.');
    }
  },400);
}
function route(node,wet,out){
  const target=out||dry;node.connect(target);
  if(wet>0){const g=ctx.createGain();g.gain.value=wet;node.connect(g);g.connect(conv)}
}
function env(g,t0,pts){ // pts: [[giây, mức], ...] dạng mũ
  g.gain.setValueAtTime(.0001,t0);
  for(const [t,v] of pts)g.gain.exponentialRampToValueAtTime(Math.max(.0001,v),t0+t);
}
function tone(type,freq,t0,dur,vol,{attack=.004,wet=.3,out=null,detune=0}={}){
  const o=track(ctx.createOscillator()),g=ctx.createGain();
  o.type=type;o.frequency.value=freq;o.detune.value=detune;
  env(g,t0,[[attack,vol],[dur,.0001]]);
  o.connect(g);route(g,wet,out);o.start(t0);o.stop(t0+dur+.1);return o;
}
function noise(t0,dur,{type='bandpass',f0=1000,f1=null,q=1,pts,wet=0,out=null,hp=0}){
  const s=track(ctx.createBufferSource());s.buffer=noiseBuf;s.loop=true;
  const f=ctx.createBiquadFilter();f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t0);
  if(f1!==null)f.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  const g=ctx.createGain();env(g,t0,pts);
  s.connect(f);let last=f;
  if(hp){const h=ctx.createBiquadFilter();h.type='highpass';h.frequency.value=hp;f.connect(h);last=h}
  last.connect(g);route(g,wet,out);s.start(t0,Math.random());s.stop(t0+dur+.1);
}
/* chuông: các hài âm không nguyên (kiểu đồng), bright = tiếng ting trong */
function bell(freq,t0,dur,vol,{bright=false,wet=.35,out=null}={}){
  const ratios=bright?[1,2.76,5.4,8.9]:[.5,1,2,2.76,4.07,5.4];
  const gains=bright?[1,.4,.18,.08]:[.45,1,.5,.32,.16,.1];
  const decays=bright?[1,.6,.35,.2]:[1,1,.8,.6,.42,.3];
  ratios.forEach((r,i)=>{
    tone('sine',freq*r,t0,dur*decays[i],vol*gains[i],{wet,out});
    if(i===(bright?0:1))tone('sine',freq*r*1.004,t0,dur*decays[i],vol*gains[i]*.6,{wet,out}); // tạo nhịp "vang"
  });
  noise(t0,.05,{f0:bright?5000:2500,q:.8,pts:[[.002,vol*.5],[.05,.0001]],out});
}
function ting(){
  if(!enabled||!ac())return;resume();checkBlocked();
  bell(1976,ctx.currentTime+.03,1.3,.5,{bright:true,wet:.3});
}
function templeBell(){
  if(!enabled||!ac())return;resume();checkBlocked();
  const t=ctx.currentTime+.03;
  bell(262,t,4.2,.5,{wet:.35});
  bell(262,t+1.9,3.4,.3,{wet:.35});
}
function panner(t0,from,to,dur){
  if(!ctx.createStereoPanner)return null;
  const p=ctx.createStereoPanner();p.pan.setValueAtTime(from,t0);p.pan.linearRampToValueAtTime(to,t0+dur);p.connect(dry);return p;
}
let curve=null;
function shaper(){
  const w=ctx.createWaveShaper();
  if(!curve){const n=2048;curve=new Float32Array(n);for(let i=0;i<n;i++)curve[i]=Math.tanh((i*2/(n-1)-1)*4.5)}
  w.curve=curve;return w;
}
/* vồ xuống đất: thịch trầm + thân va đập + đất đá văng */
function thud(t0,vol,out){
  const o=track(ctx.createOscillator()),g=ctx.createGain();o.type='sine';
  o.frequency.setValueAtTime(150,t0);o.frequency.exponentialRampToValueAtTime(34,t0+.28);
  env(g,t0,[[.004,vol],[.7,.0001]]);o.connect(g);route(g,.12,out);o.start(t0);o.stop(t0+.8);
  const o2=track(ctx.createOscillator()),g2=ctx.createGain();o2.type='triangle';
  o2.frequency.setValueAtTime(95,t0);o2.frequency.exponentialRampToValueAtTime(28,t0+.4);
  env(g2,t0,[[.006,vol*.7],[.9,.0001]]);o2.connect(g2);route(g2,0,out);o2.start(t0);o2.stop(t0+1);
  noise(t0,.3,{type:'lowpass',f0:900,f1:200,q:.7,pts:[[.003,vol*.9],[.3,.0001]],out});
  for(let i=0;i<22;i++)noise(t0+.02+rnd(0,.5)*rnd(.3,1),.05,{type:'bandpass',f0:rnd(900,4200),q:2,
    pts:[[.002,vol*rnd(.08,.3)*(1-i/30)],[rnd(.015,.05),.0001]],out});
}
/* móng cào đất: chuỗi xẹt sỏi ngắn tăng dần rồi tắt */
function scrape(t0,dur,vol,out){
  for(let i=0;i<46;i++){
    const at=t0+dur*Math.pow(i/46,.8)+rnd(0,.01);
    noise(at,.04,{f0:rnd(1200,3800),q:6,pts:[[.003,vol*(.3+.7*Math.sin(Math.PI*i/46))*rnd(.4,1)],[rnd(.02,.04),.0001]],out});
  }
  noise(t0,dur,{f0:2600,f1:1100,q:5,pts:[[dur*.3,vol*.5],[dur,.0001]],out});
}
/* tiếng gầm: răng cưa + vuông méo, lọc formant (a→ô), rung biên độ, thêm tiếng rít và hơi thở */
function roar(t0,dur,out){
  const saw=track(ctx.createOscillator()),sub=track(ctx.createOscillator()),scr=track(ctx.createOscillator()),lfo=track(ctx.createOscillator());
  saw.type='sawtooth';sub.type='square';scr.type='sawtooth';
  const steps=Math.round(dur/.02);
  saw.frequency.setValueAtTime(105,t0);sub.frequency.setValueAtTime(52,t0);scr.frequency.setValueAtTime(520,t0);
  for(let i=1;i<=steps;i++){
    const u=i/steps,base=u<.18?105+(u/.18)*95:200-((u-.18)/.82)*135;
    const f=base*(1+rnd(-.07,.07)+.03*Math.sin(u*dur*31));
    saw.frequency.linearRampToValueAtTime(f,t0+u*dur);sub.frequency.linearRampToValueAtTime(f/2,t0+u*dur);
    scr.frequency.linearRampToValueAtTime(f*4.4,t0+u*dur);
  }
  const mix=ctx.createGain(),sg=ctx.createGain(),ug=ctx.createGain(),dist=shaper();
  sg.gain.value=.6;ug.gain.value=.5;saw.connect(sg);sub.connect(ug);sg.connect(dist);ug.connect(dist);
  const formant=(f0,f1,f2,q,gain)=>{
    const f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.Q.value=q;g.gain.value=gain;
    f.frequency.setValueAtTime(f0,t0);f.frequency.exponentialRampToValueAtTime(f1,t0+dur*.2);f.frequency.exponentialRampToValueAtTime(f2,t0+dur);
    dist.connect(f);f.connect(g);g.connect(mix);
  };
  formant(450,850,600,4,1.1);formant(900,1500,1000,5,.9);
  const body=ctx.createBiquadFilter(),bg=ctx.createGain();body.type='lowpass';body.frequency.value=520;bg.gain.value=.8;
  dist.connect(body);body.connect(bg);bg.connect(mix);
  const sc=ctx.createBiquadFilter(),scg=ctx.createGain();sc.type='bandpass';sc.frequency.value=1500;sc.Q.value=2;
  env(scg,t0,[[dur*.3,.16],[dur*.8,.05],[dur,.0001]]);scr.connect(sc);sc.connect(scg);scg.connect(mix);
  const amp=ctx.createGain(),am=ctx.createGain(),lg=ctx.createGain();
  env(amp,t0,[[.07,.95],[dur*.35,.9],[dur*.8,.55],[dur,.0001]]);
  am.gain.value=.75;lfo.frequency.value=38;lg.gain.value=.25;lfo.connect(lg);lg.connect(am.gain);
  mix.connect(amp);amp.connect(am);route(am,.22,out);
  noise(t0,dur,{f0:1800,q:.8,pts:[[.1,.32],[dur*.7,.22],[dur,.0001]],out});
  [saw,sub,scr,lfo].forEach(o=>{o.start(t0);o.stop(t0+dur+.1)});
}
/* phụt lửa: nổ bùng + luồng khí lửa + rền trầm + lách tách */
function fireBlast(t0,dur,out){
  const o=track(ctx.createOscillator()),g=ctx.createGain();o.type='sine';
  o.frequency.setValueAtTime(90,t0);o.frequency.exponentialRampToValueAtTime(35,t0+.35);
  env(g,t0,[[.01,.8],[.6,.0001]]);o.connect(g);route(g,.1,out);o.start(t0);o.stop(t0+.7);
  noise(t0,.3,{type:'lowpass',f0:1500,f1:300,q:.7,pts:[[.01,.7],[.3,.0001]],out});
  noise(t0+.05,dur,{f0:700,f1:1300,q:.6,pts:[[.18,.55],[dur*.7,.4],[dur,.0001]],wet:.1,out});
  noise(t0+.05,dur,{type:'lowpass',f0:3500,f1:900,q:.5,pts:[[.12,.5],[dur*.7,.3],[dur,.0001]],out});
  noise(t0+.05,dur,{type:'highpass',f0:4000,q:.5,pts:[[.15,.2],[dur,.0001]],out});
  for(let i=0;i<Math.floor(dur/.09);i++)
    noise(t0+.1+i*.09,.09,{f0:500,q:.8,pts:[[.02,rnd(.12,.3)],[.09,.0001]],out});
  tone('sine',48,t0,dur,.5,{wet:0,out});
  for(let i=0;i<60;i++)noise(t0+rnd(.1,dur),.04,{type:'highpass',f0:2200,q:.5,pts:[[.002,rnd(.05,.22)],[rnd(.012,.035),.0001]],out});
}
function dragon({signal,legacy=false}={}){
  if(!enabled||!ac())return;resume();checkBlocked();
  const c=global.CungDragon?.cues||{impact:.68,scrape:.85,smoke:1.1,growl:3.05,inhale:3.8,fire:4.15,fireEnd:5.55,coil:5.45,flight:6.1,tail:6.75};
  if(signal?.aborted)return;
  dragonAbort?.();
  if(signal){const cancel=()=>stop();signal.addEventListener('abort',cancel,{once:true});dragonAbort=()=>{signal.removeEventListener('abort',cancel);dragonAbort=null}}
  const t=ctx.currentTime+.015,p=panner(t,.15,0,.78);
  if(legacy){thud(t+1,.8,p);scrape(t+.75,.3,.3,p);roar(t+1.5,1.5,p);fireBlast(t+1.78,1.5,p);return}
  // Air displacement, screen impact and the metallic drag of four talons.
  noise(t,.68,{type:'lowpass',f0:180,f1:2300,q:.7,pts:[[.48,.25],[.6,.08],[.68,.0001]],out:p});
  thud(t+c.impact,.9,p);scrape(t+c.scrape,.4,.33,p);
  tone('sine',31,t+c.impact,1.3,.42,{wet:.1,out:p});
  // Heavy chest resonance under the fog; a close, textured exhalation.
  noise(t+.9,2.7,{type:'lowpass',f0:150,f1:310,q:.7,pts:[[.8,.15],[1.7,.2],[2.7,.0001]],wet:.3,out:p});
  noise(t+c.smoke,1.65,{f0:520,f1:1600,q:.6,pts:[[.2,.25],[.9,.18],[1.65,.0001]],wet:.25,out:p});
  tone('sine',42,t+1.7,2,.16,{attack:.4,wet:.3,out:p});
  roar(t+c.growl,1.05,p);
  noise(t+c.inhale,.35,{f0:320,f1:2100,q:1.3,pts:[[.27,.3],[.35,.0001]],out:p});
  fireBlast(t+c.fire,c.fireEnd-c.fire,p);
  // The serpentine body displaces air; tail cracks from left to right on departure.
  const fly=panner(t+c.coil,-.55,.85,2.3);
  noise(t+c.coil,2.3,{type:'lowpass',f0:900,f1:120,q:.7,pts:[[.4,.22],[1.2,.3],[2.3,.0001]],wet:.18,out:fly});
  noise(t+c.tail-.2,.5,{f0:450,f1:3400,q:.6,pts:[[.19,.35],[.26,.24],[.5,.0001]],out:fly});
  thud(t+c.tail,.27,fly);
}
function celestial(){
  if(!enabled||!ac())return;resume();checkBlocked();
  const t=ctx.currentTime+.03;
  // pad dâng lên
  [220,329.6,440,554.4].forEach((f,i)=>{
    const o=track(ctx.createOscillator()),g=ctx.createGain();o.type='sine';o.frequency.value=f;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.07,t+1.6+i*.1);g.gain.exponentialRampToValueAtTime(.0001,t+5.2);
    o.connect(g);route(g,.6);o.start(t);o.stop(t+5.4);
  });
  // gió lấp lánh dâng tới đỉnh
  noise(t,2.8,{type:'highpass',f0:5000,q:.5,pts:[[2.5,.09],[2.8,.0001]],wet:.3});
  // chuỗi chuông ngũ cung đi lên
  [880,987.8,1108.7,1318.5,1480,1760].forEach((f,i)=>bell(f,t+.3+i*.28,2,.2,{bright:true,wet:.5}));
  // đại chiêu: chuông lớn + cụm chuông trong + quét ánh sáng + trầm
  const b=t+2.7;
  bell(330,b,5,.65,{wet:.4});
  [1760,2217,2637].forEach((f,i)=>bell(f,b+i*.05,2.6,.3,{bright:true,wet:.5}));
  noise(b,1,{f0:400,f1:6000,q:1,pts:[[.15,.3],[1,.0001]],wet:.3});
  tone('sine',60,b,.9,.55,{wet:0});
  // cánh hoa rơi: chuông nhỏ rải rác
  const hi=[1318.5,1480,1760,1976,2217];
  for(let i=0;i<9;i++)bell(hi[(Math.random()*hi.length)|0],b+.5+rnd(0,2.2),1.6,.1,{bright:true,wet:.6});
}
function stop(){
  if(!ctx)return;
  dragonAbort?.();
  for(const source of sources){try{source.stop()}catch(error){}}
  sources.clear();
  const n=ctx.currentTime;master.gain.cancelScheduledValues(n);master.gain.setValueAtTime(master.gain.value,n);master.gain.linearRampToValueAtTime(0,n+.12);
}

function rouletteStart(){
  if(!enabled)return;
  resume();
  checkBlocked();
}
function rouletteClick(landing){
  if(!enabled||ctx?.state!=='running')return;
  const at=ctx.currentTime+.006;
  const pitch=landing?780:rnd(1200,1650);
  tone('triangle',pitch,at,.045,landing?.18:.11,{attack:.001,wet:.05});
  noise(at,.038,{f0:landing?2100:3700,q:1.6,pts:[[.001,landing?.22:.14],[.034,.0001]]});
}
function uploadedAlert(url,signal){
  return new Promise(resolve=>{
    const audio=new Audio(url);
    audio.volume=VOL;
    let timer,playing=false,finished=false;
    const done=()=>{
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      signal.removeEventListener('abort',done);
      audio.onplaying=audio.onended=audio.onerror=null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      resolve(playing);
    };
    audio.onplaying=()=>{
      if(playing)return;
      playing=true;
      clearTimeout(timer);
      timer=setTimeout(done,10000);
    };
    audio.onended=audio.onerror=done;
    signal.addEventListener('abort',done,{once:true});
    timer=setTimeout(done,3000);
    audio.play().catch(done);
  });
}
async function donateAlert(url,useTing,signal){
  if(!enabled||signal.aborted)return;
  const custom=typeof url==='string'&&/^uploads\/donate-sound\.mp3\?v=[a-f0-9]{16}$/.test(url);
  if(custom&&await uploadedAlert(url,signal))return;
  if(signal.aborted)return;
  if(custom||useTing){
    ting();
    await sleep(1350,signal);
  }else resume();
}
const S=global.CungSFX={ting,bell:templeBell,dragon,celestial,stop,resume,rouletteStart,rouletteClick,donateAlert};
if(typeof module!=='undefined')module.exports=S;

if(global.document){
  ['pointerdown','click','keydown'].forEach(e=>global.document.addEventListener(e,resume,{passive:true}));
  /* Âm thanh riêng cho từng bậc: 1 chuông chùa, 2 rồng, 3 thiên nữ. */
  if(typeof global.playTierIntro==='function'){
    const baseIntro=global.playTierIntro;
    global.playTierIntro=async function(d,signal){
      const tier=Math.max(1,Math.min(3,Number(d.tier)||1));
      if(enabled){
        if(tier===1&&signal)signal.addEventListener('abort',stop,{once:true});
        if(tier===1)S.bell();
        // Video intros carry their own audio and start it with their first frame.
      }
      return baseIntro.apply(this,arguments);
    };
  }
  global.addEventListener('pagehide',stop);
}
})(globalThis);
