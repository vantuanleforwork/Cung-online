/* Âm thanh hiệu ứng tổng hợp bằng WebAudio (không cần file mp3).
   Tải SAU overlay.js và intro-fx.js. Tùy chọn trên URL overlay: &sfx=0 (tắt), &sfxvol=0.5 (âm lượng 0-1). */
(function(global){
'use strict';
const rnd=(a,b)=>a+Math.random()*(b-a);
const params=new URLSearchParams((global.location&&global.location.search)||'');
const enabled=params.get('sfx')!=='0';
const VOL=Math.max(0,Math.min(1,Number(params.get('sfxvol')||.7)));
let ctx=null,master,dry,conv,noiseBuf,warned=false;

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
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.value=freq;o.detune.value=detune;
  env(g,t0,[[attack,vol],[dur,.0001]]);
  o.connect(g);route(g,wet,out);o.start(t0);o.stop(t0+dur+.1);return o;
}
function noise(t0,dur,{type='bandpass',f0=1000,f1=null,q=1,pts,wet=0,out=null,hp=0}){
  const s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;
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
function dragon(){
  if(!enabled||!ac())return;resume();checkBlocked();
  const t=ctx.currentTime+.03,p=panner(t,-.8,.8,4.2);
  // cánh quạt gió khi rồng lao vào
  noise(t,1.5,{f0:300,f1:1500,q:1.2,pts:[[.6,.28],[1.4,.0001]],out:p});
  noise(t+2.9,1.3,{f0:1400,f1:300,q:1.2,pts:[[.3,.22],[1.2,.0001]],out:p});
  // tiếng khè lúc mở miệng
  noise(t+1.4,.8,{type:'bandpass',f0:5200,q:.9,hp:3000,pts:[[.08,.22],[.35,.14],[.8,.0001]],out:p});
  // tiếng gầm: sóng răng cưa trầm + vuông, lọc thông thấp quét, rung biên độ 28Hz
  const t1=t+1.45,dur=1.6;
  const a=ctx.createOscillator(),b=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain();
  a.type='sawtooth';b.type='square';b.detune.value=-12;
  a.frequency.setValueAtTime(80,t1);a.frequency.exponentialRampToValueAtTime(175,t1+.3);a.frequency.exponentialRampToValueAtTime(65,t1+dur);
  b.frequency.setValueAtTime(40,t1);b.frequency.exponentialRampToValueAtTime(88,t1+.3);b.frequency.exponentialRampToValueAtTime(33,t1+dur);
  f.type='lowpass';f.Q.value=3;f.frequency.setValueAtTime(400,t1);f.frequency.exponentialRampToValueAtTime(2200,t1+.3);f.frequency.exponentialRampToValueAtTime(500,t1+dur);
  env(g,t1,[[.12,.55],[1.1,.4],[dur,.0001]]);
  lfo.frequency.value=28;lg.gain.value=.18;lfo.connect(lg);lg.connect(g.gain);
  a.connect(f);b.connect(f);f.connect(g);route(g,.15,p);
  [a,b,lfo].forEach(o=>{o.start(t1);o.stop(t1+dur+.1)});
  // lửa phun: gió nền + tiếng rền + lách tách
  noise(t+1.55,1.5,{f0:900,f1:700,q:.7,pts:[[.2,.4],[1.0,.3],[1.5,.0001]],wet:.1,out:p});
  noise(t+1.55,1.5,{type:'lowpass',f0:2500,f1:700,q:.5,pts:[[.2,.35],[1.0,.25],[1.5,.0001]],out:p});
  tone('sine',55,t+1.55,1.5,.35,{wet:0,out:p});
  for(let i=0;i<46;i++){
    const at=t+1.6+rnd(0,1.7);
    noise(at,.04,{type:'highpass',f0:2200,q:.5,pts:[[.002,rnd(.05,.2)],[rnd(.012,.035),.0001]],out:p});
  }
  // chiêng trầm khai lễ
  bell(131,t+3.3,3.6,.5,{wet:.4});
}
function celestial(){
  if(!enabled||!ac())return;resume();checkBlocked();
  const t=ctx.currentTime+.03;
  // pad dâng lên
  [220,329.6,440,554.4].forEach((f,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;
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
  const n=ctx.currentTime;master.gain.cancelScheduledValues(n);master.gain.setValueAtTime(master.gain.value,n);master.gain.linearRampToValueAtTime(0,n+.12);
  master.gain.setValueAtTime(VOL,n+.5);
}

const S=global.CungSFX={ting,bell:templeBell,dragon,celestial,stop,resume};
if(typeof module!=='undefined')module.exports=S;

if(global.document){
  ['pointerdown','click','keydown'].forEach(e=>global.document.addEventListener(e,resume,{passive:true}));
  /* Tiếng ting trước mỗi lượt donate, rồi 0,85 giây sau mới vào hiệu ứng. */
  if(typeof global.play==='function'){
    const basePlay=global.play;
    global.play=async function(d){
      if(enabled){S.ting();await new Promise(r=>setTimeout(r,850))}
      return basePlay.apply(this,arguments);
    };
  }
  /* Âm thanh riêng cho từng bậc: 1 chuông chùa, 2 rồng, 3 thiên nữ. */
  if(typeof global.playTierIntro==='function'){
    const baseIntro=global.playTierIntro;
    global.playTierIntro=async function(d,signal){
      const tier=Math.max(1,Math.min(3,Number(d.tier)||1));
      if(enabled){
        if(signal)signal.addEventListener('abort',stop,{once:true});
        if(tier===1)S.bell();else if(tier===2)S.dragon();else S.celestial();
      }
      return baseIntro.apply(this,arguments);
    };
  }
}
})(globalThis);
