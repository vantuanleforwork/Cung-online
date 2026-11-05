// Local Chrome DevTools capture with an exact viewport, including widths below Chrome's window minimum.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const [url,output,width,height,profile,platform]=process.argv.slice(2);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
  '--disable-background-networking',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let websocket;
(async()=>{
  let port;
  for(let i=0;i<100;i++){
    try{port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];break}catch{await delay(100)}
  }
  if(!port)throw new Error('Chrome did not start');
  const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  websocket=new WebSocket(targets.find(item=>item.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{websocket.addEventListener('open',resolve,{once:true});websocket.addEventListener('error',reject,{once:true})});
  let id=0;const pending=new Map(),events=new Map();
  websocket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){const callback=pending.get(message.id);pending.delete(message.id);if(message.error)callback?.reject(message.error);else callback?.resolve(message.result)}
    else events.get(message.method)?.(message.params);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const serial=++id;pending.set(serial,{resolve,reject});websocket.send(JSON.stringify({id:serial,method,params}))});
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:+width,height:+height,deviceScaleFactor:1,mobile:+width<600});
  const loaded=new Promise(resolve=>events.set('Page.loadEventFired',resolve));
  await send('Page.navigate',{url});await loaded;await delay(1200);
  if(platform){
    const target=platform==='custom_api_v3'?'custom_api':platform;
    const expression=`(()=>{const p=document.querySelector('[name="speech_provider"]');p.value=${JSON.stringify(target)};p.dispatchEvent(new Event('change'));
      ${platform==='custom_api_v3'?`const e=document.querySelector('[name="custom_api_engine"]');e.value='elevenlabs';e.dispatchEvent(new Event('change'));const m=document.getElementById('customModelPreset');m.value='eleven_v3';m.dispatchEvent(new Event('change'));`:''}
      return JSON.stringify([...document.querySelectorAll('[data-provider-panel]')].filter(p=>!p.hidden).map(p=>p.dataset.providerPanel))})()`;
    const result=await send('Runtime.evaluate',{expression,returnByValue:true});
    if(result.exceptionDetails||result.result.value!==JSON.stringify([target]))throw new Error('Incorrect provider visibility: '+JSON.stringify(result));
  }
  const metrics=await send('Runtime.evaluate',{expression:'JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})',returnByValue:true});
  const measured=JSON.parse(metrics.result.value);
  if(measured.scrollWidth>measured.width)throw new Error('Horizontal overflow: '+JSON.stringify(measured));
  const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(output,Buffer.from(screenshot.data,'base64'));
  await send('Browser.close').catch(()=>{});
  websocket.close();
})().catch(error=>{console.error(error);process.exitCode=1;websocket?.close();child.kill()});
setTimeout(()=>{if(child.exitCode===null)child.kill()},20000).unref();
