// Exercise the real inline page script with a small DOM/network harness.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8').split('<script>')[1].split('</script>')[0];
for(const file of ['overlay.js','speech-runtime.js','admin-voice.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'));
const order={code:'CHUAABCDEF',status_token:'a'.repeat(64),qr:'https://img.vietqr.io/image/test.png'};
const tick=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};

function page(saved=null){
  const elements=new Map();
  const get=id=>{
    if(!elements.has(id))elements.set(id,{value:id==='amt'?'20000':'',style:{},textContent:'',disabled:false});
    return elements.get(id);
  };
  const calls=[],timers=[],storage=new Map(saved?[['cung_order',JSON.stringify(saved)]]:[]);
  let reply={state:'pending',paid_amount:null,ahead:0,paused:false},custom=null;
  const sandbox={document:{getElementById:get,querySelectorAll:()=>[]},AbortController,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    setTimeout:(fn,ms)=>{const timer={fn,ms,cancelled:false};timers.push(timer);return timer},clearTimeout:timer=>{if(timer)timer.cancelled=true},
    fetch:async(url,options)=>{calls.push({url,options});return custom?custom(url,options):{ok:true,json:async()=>url==='create.php'?order:reply}}};
  const context=vm.createContext(sandbox);vm.runInContext(source,context);
  return {get,calls,timers,storage,context,setReply:value=>{reply=value},setCustom:value=>{custom=value}};
}

(async()=>{
  const p=page();
  await p.get('go').onclick();await tick();
  assert.equal(p.get('go').disabled,false);
  assert.equal(p.get('res').style.display,'block');
  assert.equal(p.get('code').textContent,order.code);
  assert.equal(JSON.parse(p.storage.get('cung_order')).status_token,order.status_token);
  const statusCall=p.calls.find(call=>call.url==='status.php');
  assert.equal(statusCall.options.method,'POST');
  assert.equal(JSON.parse(statusCall.options.body).status_token,order.status_token);
  assert.match(p.get('paymentStatus').textContent,/chờ nhận tiền/);
  for(const state of ['review','queued','playing','shown','skipped']){
    p.setReply({state,paid_amount:50000,ahead:3,paused:state==='queued'});
    await vm.runInContext('refreshStatus(statusGeneration)',p.context);
    const labels={review:/chờ duyệt/,queued:/3 lượt phía trước.*tạm dừng/,playing:/đang được phát/,shown:/đã hiển thị/,skipped:/không hiển thị/};
    assert.match(p.get('paymentStatus').textContent,labels[state]);
  }
  p.setCustom(()=>{throw new Error('offline')});
  await vm.runInContext('refreshStatus(statusGeneration)',p.context);
  assert.match(p.get('paymentStatus').textContent,/không cần chuyển lại/);
  assert(p.timers.some(timer=>timer.ms===5000&&!timer.cancelled));

  const restored=page(order);await tick();
  assert.equal(restored.get('code').textContent,order.code);
  let resolve;
  restored.setCustom(()=>({ok:true,json:()=>new Promise(r=>{resolve=r})}));
  const inflight=vm.runInContext('refreshStatus(statusGeneration)',restored.context);
  await tick();
  restored.get('newOrder').onclick();
  restored.get('paymentStatus').textContent='new request';
  resolve({state:'shown'});await inflight;
  assert.equal(restored.get('paymentStatus').textContent,'new request');
  assert.equal(restored.get('f').style.display,'block');
  assert.equal(restored.storage.has('cung_order'),false);
  console.log('PASS: inline JS syntax, QR creation, private status requests/states, retry, local restore, stale response isolation');
})().catch(error=>{console.error(error);process.exitCode=1});
