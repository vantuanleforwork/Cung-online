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
 const url=base+'/admin.php?view=revenue&period=range&from=2025-05-01&to=2025-05-03';
 await send('Page.navigate',{url});
 for(let i=0;i<100;i++){if(await evaluate('document.readyState==="complete" && document.querySelectorAll(".revenue-chart-bar").length===3'))break;await wait(50)}
 for(const width of [1440,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate('document.querySelector(".revenue-chart").scrollIntoView({block:"center"})');await wait(150);
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  const point=await evaluate('(()=>{const r=document.querySelectorAll(".revenue-chart-bar")[2].getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});await wait(100);
  assert.equal(await evaluate('document.getElementById("revenueChartTooltip").hidden'),false);
  assert(await evaluate('document.getElementById("revenueChartTooltip").textContent.includes("60.000đ")'));
  assert(await evaluate('document.getElementById("revenueChartTooltip").textContent.includes("03/05/2025")'));
  const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'revenue-range-'+width+'-035.png'),Buffer.from(shot.data,'base64'));
 }
 await evaluate('document.querySelectorAll(".revenue-chart-bar")[1].focus()');await wait(50);
 assert(await evaluate('document.getElementById("revenueChartTooltip").textContent.includes("0đ")'));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});await wait(50);
 assert(await evaluate('document.getElementById("revenueChartTooltip").textContent.includes("60.000đ")'));
 assert.deepEqual(errors,[]);completed=true;console.log('PASS: bar-chart hover tooltip, zero-day focus, keyboard navigation and desktop/mobile sizing');await send('Browser.close').catch(()=>{});
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{clearTimeout(watchdog);ws?.close();child?.kill();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch{}},500).unref()});
