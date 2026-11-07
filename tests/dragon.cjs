// Verify the production Veo films and complete donation entry in Chrome.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts');fs.mkdirSync(out,{recursive:true});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cung-dragon-')),errors=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
 if(!/^(?:[\w-]+\.(?:js|mjs|css|html)|vendor\/three\.module\.min\.js|assets\/cinematic-v026\/(?:rong|gai)\.mp4)$/.test(name)){res.writeHead(404);res.end();return}
 const file=path.join(root,name);if(!fs.existsSync(file)){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',(/\.(?:mjs|js)$/.test(name))?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.mp4')?'video/mp4':'text/html');res.end(fs.readFileSync(file));
});
let child,ws;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--no-first-run','--no-default-browser-check','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=0',`--user-data-dir=${tmp}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<100;i++){try{port=fs.readFileSync(path.join(tmp,'DevToolsActivePort'),'utf8').split('\n')[0];break}catch{await wait(100)}}
 assert(port,'Chrome started');
 const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/overlay.html?preview=1&motion=1`});

 for(let i=0;i<100;i++){if(await evaluate('!!globalThis.CungCinema'))break;await wait(100)}
 const report={};
 for(const tier of [2,3]){
  const clip=await evaluate('(async()=>{const e=await CungCinema.prepare('+tier+');return {width:e.video.videoWidth,height:e.video.videoHeight,duration:e.video.duration,embedded:e.embeddedAudio}})()');
  assert.equal(clip.width,1920);assert.equal(clip.height,1080);assert(Math.abs(clip.duration-(tier===2?4.757:9.963))<.1);assert(clip.embedded);
  const label=tier===2?'dragon':'celestial';
  for(const time of [.8,3.5]){
   const png=await evaluate('(async()=>{const e=await CungCinema.prepare('+tier+'),v=e.video;v.currentTime='+time+';await new Promise(r=>v.addEventListener("seeked",r,{once:true}));const c=document.createElement("canvas");c.width=960;c.height=540;c.getContext("2d").drawImage(v,0,0,960,540);return c.toDataURL("image/png").split(",")[1]})()');
   fs.writeFileSync(path.join(out,label+'-film-'+time+'.png'),Buffer.from(png,'base64'));
  }
  const audio=await evaluate('(async()=>{const e=await CungCinema.prepare('+tier+'),a=new AudioContext(),b=await a.decodeAudioData(await(await fetch(e.src)).arrayBuffer());let peak=0,sq=0;for(let ch=0;ch<b.numberOfChannels;ch++){const d=b.getChannelData(ch);for(let i=0;i<d.length;i++){peak=Math.max(peak,Math.abs(d[i]));sq+=d[i]*d[i]}}await a.close();return {channels:b.numberOfChannels,duration:b.duration,peak,rms:Math.sqrt(sq/(b.length*b.numberOfChannels))}})()');
  assert(audio.peak>.05);assert(audio.rms>.001,'embedded soundtrack is audible');
  const run=await evaluate('(async()=>{const t=performance.now(),p=playTierIntro({tier:'+tier+'});await new Promise(r=>setTimeout(r,1000));const e=await CungCinema.prepare('+tier+'),visible=!document.getElementById("tierIntro").hidden&&Number(document.getElementById("fxCanvas").style.opacity)>.9;const pixels=document.getElementById("fxCanvas").getContext("2d").getImageData(0,0,1920,1080).data;let transparent=0,opaque=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]<10)transparent++;if(pixels[i]>240)opaque++}const sound=!e.video.muted&&e.video.volume===.7;await p;return {elapsed:performance.now()-t,visible,sound,transparent,opaque,hidden:document.getElementById("tierIntro").hidden,opacity:document.getElementById("fxCanvas").style.opacity}})()');
  assert(Math.abs(run.elapsed-clip.duration*1000)<1500);assert(run.visible&&run.sound&&run.hidden);assert(run.transparent>10000&&run.opaque>10000,"background transparent and subject retained");assert.equal(run.opacity,'0');
  report[label]={clip,audio,run};
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
 await evaluate('globalThis.fullPlayback=play({tier:3,name:"Nguyễn Văn An",paid_amount:200000,message:"Bình an và may mắn!",speech:{enabled:false,display_seconds:8,overlay:{x:960,y:64,width:760}}});void 0');
 await wait(2000);
 const keyedShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'celestial-keyed-026.png'),Buffer.from(keyedShot.data,'base64'));
 await wait(9000);
 const card=await evaluate('(()=>{const c=document.getElementById("stage"),r=c.getBoundingClientRect();return {visible:c.classList.contains("is-visible"),hidden:document.getElementById("tierIntro").hidden,x:r.x+r.width/2,y:r.y,width:r.width}})()');
 assert(card.visible&&card.hidden);assert(Math.abs(card.x-960)<1);assert(Math.abs(card.y-64)<1);assert.equal(card.width,760);
 const screenshot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'cinematic-donation-card-024.png'),Buffer.from(screenshot.data,'base64'));
 assert.equal(await evaluate('fullPlayback'),true);report.card=card;
 assert.equal(await evaluate('(async()=>{const a=new AbortController(),p=playTierIntro({tier:2},a.signal);setTimeout(()=>a.abort(),100);try{await p;return "unexpected"}catch(e){return e.name+":"+document.getElementById("tierIntro").hidden}})()'),'AbortError:true');
 assert.equal(await evaluate('(async()=>{await CungFX.run(2,120,null,document.getElementById("fxCanvas"));return document.getElementById("fxCanvas").style.opacity})()'),'0');
 assert.deepEqual(errors,[],'no browser runtime errors');
 fs.writeFileSync(path.join(out,'cinematic-check-026.json'),JSON.stringify(report,null,2));
 console.log('PASS: both production Veo clips, 1920x1080, original clip duration and blue-screen removal, embedded audio, visible frames, clean exit, cancellation and reduced motion');
 await send('Browser.close').catch(()=>{});
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{ws?.close();child?.kill();server.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch{}},500).unref()});
