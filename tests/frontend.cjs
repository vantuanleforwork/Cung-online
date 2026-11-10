// Exercise the current donation page script with a small DOM and network harness.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=html.match(/<script>\s*(const \$=i=>[\s\S]*?)<\/script>/)?.[1];
assert(source,'Donation page script was not found');
for(const file of ['overlay.js','speech-runtime.js','admin-voice.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'));
new vm.Script(source);
const payment={code:'CHUAABCDEF',status_token:'a'.repeat(64),qr:'https://img.vietqr.io/image/test.png'};
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};

function page(saved=null){
  const elements=new Map(),calls=[],timers=[],storage=new Map(saved?[['cung_order',JSON.stringify(saved)]]:[]);
  const get=id=>{
    if(!elements.has(id))elements.set(id,{
      value:id==='amt'?'20000':'',style:{},textContent:'',disabled:false,hidden:false,children:[],dataset:{},
      replaceChildren(...items){this.children=items},setAttribute(){},append(...items){this.children.push(...items)}
    });
    return elements.get(id);
  };
  let status={state:'pending',paid_amount:null,ahead:0,paused:false},custom=null;
  const sandbox={document:{getElementById:get,querySelectorAll:()=>[]},window:{dispatchEvent(){}},
    CungDonate:{ready:true,kind:'message',testAccount:false,
      settings:{message_min:10000,tier2_min:50000,tier3_min:200000,music_enabled:true},minimum:()=>10000},
    Option:class{constructor(text,value){this.text=text;this.value=value}},URL,AbortController,Event,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    setTimeout:(fn,ms)=>{const timer={fn,ms,cancelled:false};timers.push(timer);return timer},
    clearTimeout:timer=>{if(timer)timer.cancelled=true},
    fetch:async(url,options)=>{
      calls.push({url,options});
      if(custom)return custom(url,options);
      const data=url==='create.php'?payment:url==='status.php'?status:url==='profile.php'?{logged_in:false,csrf:'csrf'}:
        url.startsWith('donation-history.php')?{items:[],has_more:false}:{tier2:{voices:[]},tier3:{voices:[]}};
      return {ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data};
    }
  };
  const context=vm.createContext(sandbox);vm.runInContext(source,context);
  return {get,calls,timers,storage,context,setStatus:value=>{status=value},setCustom:value=>{custom=value}};
}

(async()=>{
  const p=page();await tick();
  assert.equal(p.get('resumeOrder').hidden,true);
  assert.equal(p.get('go').disabled,false,'anonymous donors can create a QR');
  await p.get('go').onclick();await tick();
  assert.equal(p.get('res').style.display,'block');
  assert.equal(p.get('code').textContent,payment.code);
  assert.equal(JSON.parse(p.storage.get('cung_order')).status_token,payment.status_token);
  const statusCall=p.calls.find(call=>call.url==='status.php');
  assert.equal(statusCall.options.method,'POST');
  assert.equal(JSON.parse(statusCall.options.body).status_token,payment.status_token);
  for(const state of ['review','queued','playing','shown','skipped']){
    p.setStatus({state,paid_amount:50000,ahead:3,paused:state==='queued'});
    await vm.runInContext('refreshStatus(statusGeneration)',p.context);
    const labels={review:/chờ duyệt/,queued:/3 lượt phía trước.*tạm dừng/,playing:/đang được phát/,shown:/đã hiển thị/,skipped:/không hiển thị/};
    assert.match(p.get('paymentStatus').textContent,labels[state]);
  }
  p.setCustom(()=>{throw new Error('offline')});
  await vm.runInContext('refreshStatus(statusGeneration)',p.context);
  assert.match(p.get('paymentStatus').textContent,/không cần chuyển lại/);
  assert(p.timers.some(timer=>timer.ms===4000&&!timer.cancelled));

  const saved=JSON.parse(p.storage.get('cung_order'));
  const restored=page(saved);await tick();
  assert.equal(restored.get('f').style.display,undefined,'new visits still show the form');
  assert.equal(restored.get('resumeOrder').hidden,false);
  assert.equal(restored.get('resumeCode').textContent,payment.code);
  restored.get('resumeOrderButton').onclick();await tick();
  assert.equal(restored.get('code').textContent,payment.code);
  restored.get('newOrder').onclick();
  assert.equal(restored.get('resumeOrder').hidden,false);
  restored.get('dismissOrderButton').onclick();
  assert.equal(restored.storage.has('cung_order'),false);
  assert.equal(restored.get('resumeOrder').hidden,true);

  const expired=page({...saved,saved_at:Date.now()-25*60*60*1000});await tick();
  assert.equal(expired.get('resumeOrder').hidden,true);
  assert.equal(expired.storage.has('cung_order'),false);
  console.log('PASS: donation script, anonymous QR, private status, recovery after refresh, expiry, dismissal');
})().catch(error=>{console.error(error);process.exitCode=1});
