const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const [base,cookie]=process.argv.slice(2),root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cung-layout-browser-'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ws,child;
let completed=false;const watchdog=setTimeout(()=>{console.error('Layout browser test timed out');child?.kill();process.exit(1)},45000);
process.on('beforeExit',()=>{if(!completed)process.exitCode=1});
(async()=>{
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${tmp}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<100;i++){try{port=fs.readFileSync(path.join(tmp,'DevToolsActivePort'),'utf8').split('\n')[0];break}catch{await wait(100)}}
 const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
 await send('Network.setCookie',{name:'cung_admin',value:cookie,url:base,httpOnly:true,sameSite:'Strict'});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:base+'/admin.php?view=speech'});
 const ready="!!document.getElementById('overlayPositionPreview')?.contentWindow?.CungLayout&&document.getElementById('overlayPositionPreview').contentDocument.getElementById('stage').classList.contains('is-visible')";
 for(let i=0;i<100;i++){if(await evaluate(ready))break;await wait(100)}assert(await evaluate(ready),'admin iframe ready');
 assert.deepEqual(await evaluate("document.getElementById('overlayPositionPreview').contentWindow.CungLayout.value"),{x:1200,y:120,width:880,font_size:32});
 await evaluate("document.querySelector('[data-tab=display]').click()");await wait(100);
 await evaluate("document.getElementById('overlayPositionForm').closest('section').scrollIntoView({block:'start'})");await wait(100);
 const point=await evaluate("(()=>{const f=document.getElementById('overlayPositionPreview'),b=f.getBoundingClientRect(),c=f.contentDocument.getElementById('stage').getBoundingClientRect();return {x:b.left+c.left+c.width/2,y:b.top+c.top+40,scale:c.width/880}})()");
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});await send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x-80,y:point.y+50,button:'left',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x-80,y:point.y+50,button:'left',clickCount:1});await wait(150);
 const dragged=await evaluate("(()=>{const f=document.getElementById('overlayPositionForm');return {x:+f.elements.overlay_x.value,y:+f.elements.overlay_y.value,width:+f.elements.overlay_width.value}})()");assert(Math.abs(dragged.x-(1200-80/point.scale))<3,'drag changes real OBS X');assert(Math.abs(dragged.y-(120+50/point.scale))<3,'drag changes real OBS Y');
 await evaluate("(()=>{const f=document.getElementById('overlayPositionForm');f.elements.overlay_width.value=1000;f.elements.overlay_width.dispatchEvent(new Event('input',{bubbles:true}))})()");await wait(100);
 assert.equal(await evaluate("document.getElementById('overlayPositionPreview').contentWindow.CungLayout.value.width"),1000);
 assert.equal(await evaluate("document.getElementById('overlayPositionPreview').contentDocument.getElementById('donorMessage').getBoundingClientRect().height>0"),true);
 assert.equal(await evaluate("getComputedStyle(document.getElementById('overlayPositionPreview').contentDocument.getElementById('donorMessage')).fontSize"),'32px');
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,'admin-overlay-position.png'),Buffer.from(shot.data,'base64'));
 // Reset updates only the preview until its dedicated save button is submitted.
 await evaluate("document.getElementById('overlayPositionReset').click()");await wait(100);
 assert.deepEqual(await evaluate("document.getElementById('overlayPositionPreview').contentWindow.CungLayout.value"),{x:960,y:64,width:760,font_size:22});
 await evaluate("setTimeout(()=>document.getElementById('overlayPositionForm').requestSubmit(),0);true");await wait(350);
 for(let i=0;i<100;i++){if(await evaluate(ready))break;await wait(100)}
 assert.deepEqual(await evaluate("document.getElementById('overlayPositionPreview').contentWindow.CungLayout.value"),{x:960,y:64,width:760,font_size:22});
 // The actual overlay and iframe use the same 1920x1080 design, including at half size.
 await send('Page.navigate',{url:base+'/overlay.html?preview=1&editor=1&k=layout-fixture-key'});await wait(350);
 const metrics=await evaluate("(()=>{const f=document.getElementById('obsFrame').getBoundingClientRect(),c=document.getElementById('stage').getBoundingClientRect();return {ratio:f.width/f.height,designWidth:document.getElementById('obsFrame').offsetWidth,x:(c.left+c.width/2-f.left)/f.width*1920,y:(c.top-f.top)/f.height*1080}})()");
 assert.equal(metrics.designWidth,1920);assert(Math.abs(metrics.ratio-16/9)<.001);assert(Math.abs(metrics.x-960)<1);assert(Math.abs(metrics.y-64)<1);
 // Check the redesigned console at its normal view routes and mobile breakpoint.
 for(const width of [1440,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  for(const view of ['queue','payments','users','speech','logs','audit','revenue','donate','music']){
   await send('Page.navigate',{url:base+'/admin.php?view='+view});
   for(let i=0;i<60;i++){if(await evaluate('document.querySelector(".admin-sidebar nav [aria-current=page]")?.getAttribute("href")==="?view='+view+'"'))break;await wait(50)}
   await wait(80);
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'console fits '+view+'/'+width);
   if(view==='speech'||view==='queue'||view==='revenue'){
    const image=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'admin-'+view+'-'+width+'-032.png'),Buffer.from(image.data,'base64'));
   }
  }
 }
 assert.deepEqual(errors,[],'no browser exceptions');
 completed=true;console.log('PASS: actual admin preview, mouse drag, numeric width, reset, save/reload and OBS upper-center placement');await send('Browser.close').catch(()=>{});
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{clearTimeout(watchdog);ws?.close();child?.kill();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch{}},500).unref()});
