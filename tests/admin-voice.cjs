const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../admin-voice.js'),'utf8');
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
function node(value=''){
  const events=new Map();return {value,hidden:false,disabled:false,textContent:'',children:[],
    addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn)},
    async fire(type,event={}){for(const fn of events.get(type)||[])await fn(event)},
    replaceChildren(...children){this.children=children;this.value=children[0]?.value||''},append(child){this.children.push(child)},
    click(){return this.fire('click')}};
}
const fields=new Map(Object.entries({action:'save_speech',csrf:'fixture',speech_provider:'elevenlabs',custom_api_url:'https://api.vibi.pro/v1',
  custom_api_key:'fixture-custom',custom_api_engine:'elevenlabs',custom_api_model:'eleven_flash_v2_5',
  custom_model_preset:'eleven_flash_v2_5',custom_model_other:'',
  custom_voice_id:'',eleven_api_key:'fixture-eleven',eleven_voice_id:''}).map(([key,value])=>[key,node(value)]));
fields.get('custom_model_preset').options=[['eleven_flash_v2_5','elevenlabs'],['eleven_v3','elevenlabs'],['speech-2.8-turbo','minimax'],['speech-2.8-hd','minimax'],['capcut','capcut'],['__custom__','']].map(([value,engine])=>({value,dataset:{engine}}));
const panels=['browser','fpt','elevenlabs','custom_api'].map(provider=>Object.assign(node(),{dataset:{providerPanel:provider}}));
const form={elements:{namedItem:name=>fields.get(name)},querySelectorAll:()=>panels};
function picker(provider){
  const elements=new Map(['.voice-search','.load-voices','.more-voices','.voice-results','.voice-feedback','.catalog-kind'].map(name=>[name,node(name==='.catalog-kind'?'shared':'')]));
  return {dataset:{provider},querySelector:name=>elements.get(name),get:name=>elements.get(name)};
}
const pickers=[picker('elevenlabs'),picker('custom_api')],button=node(),feedback=node(),calls=[],spoken=[];
const main=new Map([['speechForm',form],['testVoice',button],['voiceFeedback',feedback],['customModelOtherLabel',node()]]);
class FormData{
  constructor(){this.values=new Map([...fields].filter(([key,field])=>{
    const provider=key.startsWith('custom_')?'custom_api':key.startsWith('eleven_')?'elevenlabs':null;
    return !field.disabled&&(!provider||!panels.find(panel=>panel.dataset.providerPanel===provider).disabled);
  }).map(([key,value])=>[key,value.value]))}
  set(key,value){this.values.set(key,value)}get(key){return this.values.get(key)}
}
let previewCount=0;
const context=vm.createContext({AbortController,DOMException,FormData,Option:class{constructor(text,value){this.textContent=text;this.value=value}},
  document:{getElementById:name=>main.get(name),querySelectorAll:()=>pickers},window:{addEventListener(){}},
  setTimeout:(fn,ms)=>setTimeout(fn,ms===3000?0:ms),clearTimeout,
  CungSpeech:{read:async data=>spoken.push(data),stop(){}},
  fetch:async(url,{body})=>{
    calls.push(Object.fromEntries(body.values));
    const action=body.get('action');let data;
    if(action==='list_voices')data={voices:[{voice_id:'7036989371643923969',name:'Giọng <mẫu>',language:'vi'}],has_more:true,next_cursor:'next-cursor'};
    else{previewCount++;data={demo:{speech_text:'Nguyễn Văn An đã thắp hương mười nghìn đồng.',speech:{enabled:true,provider:'custom_api',volume:1},audio_url:previewCount<3?null:'https://api.vibi.pro/audio/fixture.mp3'}}}
    return {ok:true,headers:{get:()=> 'application/json'},json:async()=>data};
  }});
vm.runInContext(source,context);
(async()=>{
  const direct=pickers[0],custom=pickers[1];
  assert.deepEqual(panels.filter(panel=>!panel.hidden).map(panel=>panel.dataset.providerPanel),['elevenlabs']);
  assert.equal(new FormData().get('custom_api_url'),undefined);
  await direct.get('.load-voices').click();
  assert.equal(calls[0].catalog_provider,'elevenlabs');assert.equal(calls[0].voice_page,'0');
  direct.get('.voice-results').value='7036989371643923969';await direct.get('.voice-results').fire('change');
  assert.equal(fields.get('eleven_voice_id').value,'7036989371643923969');
  await direct.get('.more-voices').click();assert.equal(calls[1].voice_cursor,'next-cursor');
  assert.equal(direct.get('.voice-results').children[1].textContent,'Giọng <mẫu> · vi · 7036989371643923969');
  fields.get('speech_provider').value='custom_api';await fields.get('speech_provider').fire('change');
  assert.deepEqual(panels.filter(panel=>!panel.hidden).map(panel=>panel.dataset.providerPanel),['custom_api']);
  assert.equal(new FormData().get('eleven_api_key'),undefined);
  await custom.get('.load-voices').click();
  custom.get('.voice-results').value='7036989371643923969';await custom.get('.voice-results').fire('change');
  assert.equal(fields.get('custom_voice_id').value,'7036989371643923969');
  fields.get('custom_model_preset').value='eleven_v3';await fields.get('custom_model_preset').fire('change');
  assert.equal(fields.get('custom_api_model').value,'eleven_v3');
  fields.get('custom_api_engine').value='minimax';await fields.get('custom_api_engine').fire('input');await fields.get('custom_api_engine').fire('change');
  assert.equal(fields.get('custom_api_model').value,'speech-2.8-turbo');assert.equal(custom.get('.voice-results').hidden,true);
  assert.equal(fields.get('custom_model_preset').options.find(option=>option.value==='eleven_v3').disabled,true);
  fields.get('custom_api_engine').value='elevenlabs';await fields.get('custom_api_engine').fire('change');
  assert.equal(fields.get('custom_api_model').value,'eleven_v3');
  fields.get('custom_model_preset').value='__custom__';await fields.get('custom_model_preset').fire('change');
  fields.get('custom_model_other').value='model-new';await fields.get('custom_model_other').fire('input');
  assert.equal(fields.get('custom_api_model').value,'model-new');
  assert.equal(main.get('customModelOtherLabel').hidden,false);
  fields.get('speech_provider').value='fpt';await fields.get('speech_provider').fire('change');
  assert.deepEqual(panels.filter(panel=>!panel.hidden).map(panel=>panel.dataset.providerPanel),['fpt']);
  assert.equal(fields.get('custom_model_other').disabled,true);
  fields.get('speech_provider').value='custom_api';await fields.get('speech_provider').fire('change');
  assert.equal(fields.get('custom_model_other').value,'model-new');assert.equal(fields.get('custom_model_other').disabled,false);
  fields.get('custom_model_preset').value='eleven_v3';await fields.get('custom_model_preset').fire('change');
  await button.click();await flush();
  assert.equal(previewCount,3);assert.equal(spoken.length,1);assert.equal(button.disabled,false);
  assert.match(feedback.textContent,/Đã đọc thử/);
  console.log('PASS: selected platform only, disabled inactive fields, v3/engine models, retained values, catalogs, async preview');
})().catch(error=>{console.error(error);process.exitCode=1});
