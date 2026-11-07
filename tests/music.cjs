const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const [base,cookie]=process.argv.slice(2),root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cung-layout-browser-'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ws,child;
let completed=false;const watchdog=setTimeout(()=>{console.error('Layout browser test timed out');child?.kill();process.exit(1)},60000);
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
 await send('Page.navigate',{url:base+'/admin.php?view=donate'});
 for(let i=0;i<100;i++){if(await evaluate('document.querySelector("[data-tab=message]")?.getAttribute("aria-selected")==="true"'))break;await wait(50)}
 await evaluate('document.querySelector("[data-tab=music]").click()');await wait(200);
 assert.equal(await evaluate('document.querySelector("[data-panel=music]").hidden'),false);
 assert.equal(await evaluate('document.querySelector("[name=music_min]").value'),'60000');
 await evaluate('(()=>{const f=document.getElementById("donationSettingsForm");f.elements.music_width.value=420;f.elements.music_width.dispatchEvent(new Event("input"))})()');await wait(100);
 assert.equal(await evaluate('document.getElementById("musicPositionPreview").contentDocument.getElementById("musicCard").style.width'),'420px');
 await evaluate('(()=>{const f=document.getElementById("donationSettingsForm");f.elements.music_idle_enabled.click();f.elements.music_idle_message.value="Order nhạc <b>theo yêu cầu</b> 🎵";f.elements.music_idle_message.dispatchEvent(new Event("input"))})()');await wait(150);
 assert.equal(await evaluate('document.getElementById("musicPositionPreview").contentDocument.getElementById("musicIdleMessage").textContent'),'Order nhạc <b>theo yêu cầu</b> 🎵');
 assert.equal(await evaluate('document.getElementById("musicPositionPreview").contentDocument.querySelector("#musicIdleMessage b")'),null);
 assert.equal(await evaluate('document.getElementById("musicPositionPreview").contentDocument.getElementById("musicCard").classList.contains("is-idle")'),true);
 for(const [width,height] of [[1440,1100],[390,900]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await wait(100);
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'music-admin-'+width+'-033.png'),Buffer.from(shot.data,'base64'));
 }
 await send('Page.navigate',{url:base+'/index.html'});
 for(let i=0;i<100;i++){if(await evaluate('!!window.CungDonate?.ready'))break;await wait(50)}
 assert(await evaluate('CungDonate.ready'));
 await evaluate('document.querySelector("[data-donation-kind=music]").click()');await wait(100);
 assert.equal(await evaluate('document.getElementById("musicLinkField").hidden'),false);
 assert.equal(await evaluate('document.getElementById("amt").min'),'60000');
 assert.equal(await evaluate('CungDonate.videoID("https://youtu.be/dQw4w9WgXcQ?si=abc")'),'dQw4w9WgXcQ');
 assert.equal(await evaluate('(()=>{try{CungDonate.videoID("https://www.youtube.com.evil.test/watch?v=dQw4w9WgXcQ");return false}catch{return true}})()'),true);
 assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await evaluate('document.getElementById("musicLinkField").scrollIntoView({block:"center"})');
 const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'music-site-033.png'),Buffer.from(shot.data,'base64'));
 // Run the production OBS player against the real queue with a deterministic iframe API.
 await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:fs.readFileSync(path.join(__dirname,'youtube-player-fixture.js'),'utf8')});
 await send('Page.navigate',{url:base+'/overlay.html?k=layout-fixture-key'});
 const playing='window.testPlayers?.some(p=>!p.destroyed&&p.state===1)';
 for(let i=0;i<150;i++){if(await evaluate(playing))break;await wait(100)}assert(await evaluate(playing),'OBS starts the paid music queue');
 assert.equal(await evaluate('testPlayers.find(p=>!p.destroyed).volume'),40);
 assert.equal(await evaluate('document.getElementById("musicCard").hidden'),false);
 await evaluate('render({name:"Người order thứ hai",paid_amount:60000,donation_kind:"music",music_title:"Bài thứ hai trong hàng đợi",message:""})');
 assert.equal(await evaluate('document.getElementById("donorMessage").textContent'),'Đã order bài Bài thứ hai trong hàng đợi');

 assert.equal(await evaluate('getComputedStyle(document.getElementById("musicVideo")).opacity'),'0');
 assert.equal(await evaluate('document.getElementById("musicNext").hidden'),false);
 assert(await evaluate('document.getElementById("musicNextTitle").textContent.includes("Fixture song")'));
 await wait(600);
 assert(await evaluate('Number(document.querySelector(".music-progress").getAttribute("aria-valuenow"))>0'));
 assert.deepEqual(await evaluate('CungMusicProgress(4,8,180)'),{elapsed:4,total:8,remaining:4,percent:50,showNext:true});
 assert.deepEqual(await evaluate('CungMusicProgress(15,240,60)'),{elapsed:15,total:60,remaining:45,percent:25,showNext:false});

 const firstVideo=await evaluate('testPlayers.find(p=>!p.destroyed).videoId');
 const playerShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'music-obs-fixture-033.png'),Buffer.from(playerShot.data,'base64'));
 // Get an authenticated form token while keeping the OBS page running.
 const token=await evaluate('(async()=>{const html=await(await fetch("admin.php?view=music")).text();return html.match(/name="csrf" value="([a-f0-9]+)"/)[1]})()');
 const control=action=>evaluate('(async()=>{await fetch("admin.php?view=music",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:'+JSON.stringify('action='+action+'&csrf='+token)+'});return true})()');
 await control('music_pause');await wait(2300);
 assert.equal(await evaluate('testPlayers.find(p=>!p.destroyed).state'),2);
 const frozen=await evaluate('testPlayers.find(p=>!p.destroyed).getCurrentTime()');await wait(500);
 assert(Math.abs((await evaluate('testPlayers.find(p=>!p.destroyed).getCurrentTime()'))-frozen)<.1);
 await control('music_resume');
 for(let i=0;i<150;i++){if(await evaluate('testPlayers.some(p=>!p.destroyed&&p.videoId!=='+JSON.stringify(firstVideo)+')'))break;await wait(100)}
 assert(await evaluate('testPlayers.some(p=>!p.destroyed&&p.videoId!=='+JSON.stringify(firstVideo)+')'),'maximum duration advances to next video');
 await evaluate('testPlayers.find(p=>!p.destroyed).options.events.onError()');await wait(2500);
 assert.equal(await evaluate('document.getElementById("musicCard").hidden'),true);
 const saveIdle = (enabled,musicEnabled=true) => evaluate('(async()=>{const html=await(await fetch("admin.php?view=donate")).text();const doc=new DOMParser().parseFromString(html,"text/html");const form=doc.getElementById("donationSettingsForm");const body=new URLSearchParams(new FormData(form));body.set("music_idle_message","Order nhạc <b>theo yêu cầu</b> 🎵");if('+enabled+')body.set("music_idle_enabled","1");else body.delete("music_idle_enabled");if('+musicEnabled+')body.set("music_enabled","1");else body.delete("music_enabled");return (await fetch("admin.php?view=donate",{method:"POST",body})).ok})()');
 assert(await saveIdle(true));await wait(2300);
 assert.equal(await evaluate('document.getElementById("musicCard").hidden'),false);
 assert.equal(await evaluate('document.getElementById("musicIdleMessage").textContent'),'Order nhạc <b>theo yêu cầu</b> 🎵');
 assert.equal(await evaluate('document.querySelector("#musicIdleMessage b")'),null);
 assert.equal(await evaluate('getComputedStyle(document.querySelector(".music-progress")).display'),'none');
 const idleShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'music-idle-036.png'),Buffer.from(idleShot.data,'base64'));
 assert(await evaluate('(async()=>{const body=new URLSearchParams({action:"music_add",csrf:'+JSON.stringify(token)+',music_url:"https://youtu.be/dQw4w9WgXcQ"});return(await fetch("admin.php?view=music",{method:"POST",body})).ok})()'));await wait(2300);
 assert.equal(await evaluate('document.getElementById("musicCard").classList.contains("is-idle")'),false);
 assert.equal(await evaluate('document.getElementById("musicSender").textContent'),'Thêm bởi quản trị viên');
 assert(await evaluate('testPlayers.some(p=>!p.destroyed&&p.state===1)'));
 await evaluate('testPlayers.find(p=>!p.destroyed).options.events.onError()');await wait(2300);
 assert.equal(await evaluate('document.getElementById("musicCard").classList.contains("is-idle")'),true);
 assert(await saveIdle(true,false));await wait(2300);
 assert.equal(await evaluate('document.getElementById("musicCard").hidden'),true);
 assert(await saveIdle(false));await wait(2300);
 assert.equal(await evaluate('document.getElementById("musicCard").hidden'),true);
 assert.deepEqual(errors,[]);completed=true;console.log('PASS: real admin music settings tab, live idle preview, mobile layout, idle-to-manual playback transition, music alerts and index validation');await send('Browser.close').catch(()=>{});
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{clearTimeout(watchdog);ws?.close();child?.kill();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch{}},500).unref()});
