// Render the actual canvas in Chrome and verify WebAudio scheduling/cancellation offline.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts');fs.mkdirSync(out,{recursive:true});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cung-dragon-')),errors=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
 if(!/^(?:[\w-]+\.(?:js|css|html)|assets\/dragon\/(?:head|claw|flight|fire)\.png)$/.test(name)){res.writeHead(404);res.end();return}
 const file=path.join(root,name);if(!fs.existsSync(file)){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));
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
 for(let i=0;i<100;i++){if(await evaluate('!!globalThis.CungDragon?.ready'))break;await wait(100)}
 assert(await evaluate('CungDragon.ready'),'all four dragon assets loaded');
 assert.equal(await evaluate('CungDragon.duration'),16000);
 for(const [width,height,times]of [[1280,720,[.85,3.5,5.9,8.6,11.9,13.8]],[430,850,[.85,5.9,8.6,11.9]]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  for(const time of times){
   const result=await evaluate(`(()=>{document.getElementById('stage').style.visibility='hidden';document.getElementById('previewTools').hidden=true;document.getElementById('audioTools').hidden=true;const intro=document.getElementById('tierIntro');intro.hidden=false;intro.className='tier-intro tier-2';intro.querySelector('.intro-title').style.display='none';const c=document.getElementById('fxCanvas');c.width=${width};c.height=${height};c.style.opacity=1;const x=c.getContext('2d'),s=CungDragon.scene(c.width,c.height);let elapsed=0,frames=0,peak=0;for(let t=0;t<=${time};t+=1/60){x.clearRect(0,0,c.width,c.height);const st=performance.now();s.frame(x,t,t/16,1/60);elapsed+=performance.now()-st;frames++}const pixels=x.getImageData(0,0,c.width,c.height).data;let bright=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>80||pixels[i+1]>80)bright++;return {ms:elapsed/frames,bright}})()`);
   assert(result.bright>500,`visible dragon frame ${width}/${time}`);
   const png=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,`dragon-${width}-${time}.png`),Buffer.from(png.data,'base64'));
   console.log(`Frame ${width}x${height} @ ${time}s: ${result.ms.toFixed(2)} ms draw`);
  }
 }
 // A reduced-motion intro must finish cleanly without entering the 16-second audio scene.
 assert.equal(await evaluate(`(async()=>{await CungFX.run(2,120,null,document.getElementById('fxCanvas'));return document.getElementById('fxCanvas').style.opacity})()`),'0');
 assert.equal(await evaluate(`(async()=>{const controller=new AbortController(),promise=CungFX.run(2,16000,controller.signal,document.getElementById('fxCanvas'));setTimeout(()=>controller.abort(),70);try{await promise;return 'unexpected'}catch(e){return e.name+':'+document.getElementById('fxCanvas').style.opacity}})()`),'AbortError:0');
 const sfx=fs.readFileSync(path.join(root,'sfx.js'),'utf8');
 // Isolate the score from page hooks; render through the same compressor and reverb as production.
 async function renderAudio(abort){return evaluate(`(async()=>{const offline=new OfflineAudioContext(2,44100*18,44100),sandbox={AudioContext:function(){return offline},location:{search:'?sfxvol=.7'},CungDragon:{cues:CungDragon.cues}};new Function('globalThis',${JSON.stringify(sfx)})(sandbox);const controller=new AbortController();sandbox.CungSFX.dragon({signal:controller.signal});${abort?'controller.abort();':''}const b=await offline.startRendering(),windows=[];let peak=0;for(let j=0;j<18;j++){let sq=0;for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=j*44100;i<(j+1)*44100;i++){peak=Math.max(peak,Math.abs(d[i]));sq+=d[i]*d[i]}}windows.push(Math.sqrt(sq/88200))}return {peak,windows}})()`)}
 const score=await renderAudio(false),cancelled=await renderAudio(true);
 assert(score.peak>.1&&score.peak<1,'score is audible without digital clipping');
 for(const second of [0,2,5,7,8,11,13,14])assert(score.windows[second]>.003,`sound cue at ${second}s`);
 assert(cancelled.windows.slice(1).every(v=>v<.00001),'aborting prevents all future scheduled dragon sounds');
 assert.deepEqual(errors,[],'no browser runtime errors');
 fs.writeFileSync(path.join(out,'dragon-audio-check.json'),JSON.stringify({score,cancelled},null,2));
 console.log('Dragon assets, desktop/mobile frames, reduced motion, cancellation and 18s offline audio passed. Peak:',score.peak.toFixed(3));
 if(process.argv.includes('--record')){
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const video=await evaluate(`(async()=>{const c=document.getElementById('fxCanvas'),a=new AudioContext(),destination=a.createMediaStreamDestination(),original=a.createDynamicsCompressor.bind(a);a.createDynamicsCompressor=()=>{const node=original();node.connect(destination);return node};const sandbox={AudioContext:function(){return a},location:{search:'?sfxvol=.7'},CungDragon:{cues:CungDragon.cues}};new Function('globalThis',${JSON.stringify(sfx)})(sandbox);const previous=CungSFX;globalThis.CungSFX=sandbox.CungSFX;const stream=c.captureStream(30);destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:3500000}),chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const stopped=new Promise(r=>recorder.onstop=r);await a.resume();recorder.start(500);await CungFX.run(2,16000,null,c);await new Promise(r=>setTimeout(r,200));recorder.stop();await stopped;globalThis.CungSFX=previous;sandbox.CungSFX.stop();await a.close();stream.getTracks().forEach(track=>track.stop());return await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}))})})()`);
  fs.writeFileSync(path.join(out,'dragon-preview.webm'),Buffer.from(video,'base64'));console.log('Saved artifacts/dragon-preview.webm with sound');
 }
 await send('Browser.close').catch(()=>{});
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{ws?.close();child?.kill();server.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch{}},500).unref()});
