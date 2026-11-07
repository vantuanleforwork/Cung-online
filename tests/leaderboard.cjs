const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const [base]=process.argv.slice(2),root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cung-layout-browser-'));
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
 let boardRequests=0;ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent'&&m.params.request.url.includes('/leaderboard.php'))boardRequests++});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:base+'/index.html'});
 const ready='document.querySelectorAll(".leaderboard-row").length===3&&document.getElementById("leaderboardPanel").getAttribute("aria-busy")==="false"';
 for(let i=0;i<100;i++){if(await evaluate('!!document.getElementById("leaderboardToggle")'))break;await wait(50)}
 await wait(250);assert.equal(boardRequests,0,'no initial leaderboard fetch');
 assert.equal(await evaluate('location.pathname'),'/');
 assert(await evaluate('document.querySelector(".intro #account")!==null&&document.querySelector("main #account")===null'));
 await evaluate('document.getElementById("leaderboard-month").click()');await wait(100);assert.equal(boardRequests,0,'closed tabs do not fetch');
 await evaluate('document.getElementById("leaderboardToggle").click()');
 for(let i=0;i<100;i++){if(await evaluate(ready))break;await wait(80)}assert(await evaluate(ready));
 assert.equal(await evaluate('document.querySelector(".leaderboard-name").textContent'),'Alice');
 assert.equal(await evaluate('document.querySelectorAll(".leaderboard-crown").length'),3);
 assert.equal(await evaluate('document.body.textContent.includes("Thông báo và giọng đọc AI sẽ tự động kích hoạt")'),false);
 await evaluate('document.getElementById("leaderboard-all").click()');
 for(let i=0;i<100;i++){if(await evaluate(ready))break;await wait(50)}
 assert.equal(await evaluate('document.querySelector(".leaderboard-name").textContent'),'Bob');
 assert.equal(await evaluate('document.querySelector(".leaderboard-amount").textContent'),'280.000đ');
 for(const [width,height,label] of [[1440,1100,'desktop'],[390,844,'mobile']]){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await wait(150);
 assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'no horizontal overflow');
 const positions=await evaluate('(()=>{const r=document.querySelector(".leaderboard-row"),n=r.querySelector(".leaderboard-name").getBoundingClientRect(),a=r.querySelector(".leaderboard-amount").getBoundingClientRect();return {nameRight:n.right,amountLeft:a.left}})()');assert(positions.nameRight<=positions.amountLeft);
 assert(await evaluate('!document.getElementById("history").closest("main")'),'history is separate from donation form');
 assert.equal(await evaluate('document.querySelectorAll(".feature-icon svg").length'),3);
 assert(await evaluate('parseFloat(getComputedStyle(document.getElementById("account")).borderTopWidth)>0'));
 assert(await evaluate('parseFloat(getComputedStyle(document.getElementById("msg")).fontSize)>=16'));
 const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'leaderboard-'+label+'-032.png'),Buffer.from(shot.data,'base64'));
 await evaluate('document.getElementById("history").scrollIntoView({block:"end"})');await wait(100);
 const historyShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'history-'+label+'-032.png'),Buffer.from(historyShot.data,'base64'));
 }
 await evaluate('document.getElementById("leaderboardToggle").click()');const before=boardRequests;await evaluate('document.getElementById("leaderboard-day").click()');await wait(100);assert.equal(boardRequests,before);
 assert.deepEqual(errors,[]);completed=true;console.log('PASS: live page tabs, crown icons, amount alignment and desktop/mobile layout');
 await send('Browser.close').catch(()=>{});
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{clearTimeout(watchdog);ws?.close();child?.kill();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch{}},500).unref()});
