// Use a real encoded clip in Chrome to verify film playback, restart and cancellation.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cung-cinema-')),wait=ms=>new Promise(r=>setTimeout(r,ms));
let fixture=null,fetches=0,child,ws,completed=false;
const server=http.createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><canvas id="canvas"></canvas><script src="/cinematic-fx.js"></script>');return}
 if(req.url==='/cinematic-fx.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'cinematic-fx.js')));return}
 if(req.url==='/fixture'&&req.method==='POST'){const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{fixture=Buffer.concat(chunks);res.end('ok')});return}
 if(req.url==='/fixture.webm'&&fixture){fetches++;res.setHeader('Content-Type','video/webm');res.end(fixture);return}
 res.writeHead(404);res.end();
});
const watchdog=setTimeout(()=>{console.error('Cinematic test timed out');child?.kill();process.exit(1)},30000);
process.on('beforeExit',()=>{if(!completed)process.exitCode=1});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--no-first-run','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=0',`--user-data-dir=${tmp}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<100;i++){try{port=fs.readFileSync(path.join(tmp,'DevToolsActivePort'),'utf8').split('\n')[0];break}catch{await wait(100)}}assert(port);
 const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
 for(let i=0;i<50;i++){if(await evaluate('!!globalThis.CungCinema'))break;await wait(50)}
 await evaluate(`(async()=>{
   const c=document.createElement('canvas');c.width=320;c.height=180;const x=c.getContext('2d'),stream=c.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];
   recorder.ondataavailable=e=>chunks.push(e.data);const stopped=new Promise(r=>recorder.onstop=r);recorder.start();
   const start=performance.now();await new Promise(resolve=>{function draw(now){x.fillStyle='#840f22';x.fillRect(0,0,320,180);x.fillStyle='#d9eea2';x.fillRect(30+(now-start)*.05,50,40,70);if(now-start>.85*1000)resolve();else requestAnimationFrame(draw)}requestAnimationFrame(draw)});
   recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());await fetch('/fixture',{method:'POST',body:new Blob(chunks,{type:'video/webm'})});
   globalThis.calls=[];globalThis.CungSFX={dragon:()=>calls.push('dragon'),celestial:()=>calls.push('celestial'),stop:()=>calls.push('stop')};
   CungCinema.configure({2:{src:'/fixture.webm',seconds:.32},3:{src:'/fixture.webm',seconds:.32}});await CungCinema.prepare(2);
 })()`);
 assert(fixture?.length>500);
 const result=await evaluate(`(async()=>{const c=document.getElementById('canvas'),started=performance.now();await CungCinema.run(2,c);return {elapsed:performance.now()-started,calls,width:c.width,height:c.height,opacity:c.style.opacity}})()`);
 assert(result.elapsed>=250&&result.elapsed<800,'plays on the media clock');assert.deepEqual(result.calls,['dragon','stop']);assert.equal(result.width,1920);assert.equal(result.height,1080);assert.equal(result.opacity,'0');
 await evaluate(`(async()=>{calls.length=0;await CungCinema.run(2,document.getElementById('canvas'))})()`);assert.equal(fetches,1,'cached shot restarts without a second download');
 assert.equal(await evaluate(`(async()=>{calls.length=0;const controller=new AbortController(),p=CungCinema.run(2,document.getElementById('canvas'),controller.signal);setTimeout(()=>controller.abort(),60);try{await p;return 'unexpected'}catch(e){return e.name+':'+document.getElementById('canvas').style.opacity}})()`),'AbortError:0');
 assert.deepEqual(await evaluate('calls'),['dragon','stop']);
 assert.equal(await evaluate(`(async()=>{const controller=new AbortController();controller.abort();try{await CungCinema.run(2,document.getElementById('canvas'),controller.signal);return 'unexpected'}catch(e){return e.name}})()`),'AbortError');
 await evaluate(`(async()=>{calls.length=0;await CungCinema.run(3,document.getElementById('canvas'))})()`);assert.deepEqual(await evaluate('calls'),['celestial','stop']);
 assert.equal(await evaluate(`(async()=>{CungCinema.configure({3:{src:'/missing.mp4'}});try{await CungCinema.prepare(3);return 'unexpected'}catch(e){return e.message}})()`),'Cannot load cinematic clip (404).');
 assert.equal(await evaluate(`(()=>{try{CungCinema.configure({2:{src:'https://external.invalid/clip.mp4'}});return 'unexpected'}catch(e){return e.message}})()`),'Cinematic media must be hosted with the overlay.');
 assert.deepEqual(errors,[]);completed=true;console.log('PASS: actual video decoding, 1920x1080 frame, media timing, replay cache, tier sounds, cancellation and missing-media handling');await send('Browser.close').catch(()=>{});
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{clearTimeout(watchdog);ws?.close();child?.kill();server.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch{}},500).unref()});
