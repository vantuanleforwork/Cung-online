(function(){
'use strict';
const form=document.getElementById('overlayPositionForm'),iframe=document.getElementById('overlayPositionPreview');
if(!form||!iframe)return;
const status=document.getElementById('overlayPositionStatus'),names={x:'overlay_x',y:'overlay_y',width:'overlay_width',font_size:'overlay_font_size'};
let dirty=false;
const field=key=>form.elements.namedItem(names[key]);
function value(){return Object.fromEntries(Object.keys(names).map(key=>[key,Number(field(key).value)]))}
function describe(){status.textContent=dirty?'Thay đổi chưa lưu. Bấm “Lưu vị trí thông điệp” để áp dụng cho OBS.':'Vị trí đã lưu trên khung OBS 1920 × 1080. Kéo thông điệp để chỉnh.'}
function send(markDirty=false){
  if(markDirty)dirty=true;
  if(!Object.keys(names).every(key=>field(key).validity.valid))return;
  iframe.contentWindow?.postMessage({type:'cung:layout-set',layout:value()},location.origin);
  describe();
}
Object.keys(names).forEach(key=>field(key).addEventListener('input',()=>send(true)));
iframe.addEventListener('load',()=>send());
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==iframe.contentWindow)return;
  if(event.data?.type==='cung:layout-ready'){send();return}
  const next=event.data?.layout;
  if(event.data?.type!=='cung:layout-change'||!next||!Object.keys(names).every(key=>Number.isFinite(next[key])))return;
  if(Object.keys(names).some(key=>Number(field(key).value)!==Math.round(next[key])))dirty=true;
  Object.keys(names).forEach(key=>field(key).value=String(Math.round(next[key])));describe();
});
document.getElementById('overlayPositionReset').addEventListener('click',()=>{
  field('x').value='960';field('y').value='64';field('width').value='760';field('font_size').value='22';send(true);
});
})();
