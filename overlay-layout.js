(function(global){
'use strict';
const frame=document.getElementById('obsFrame'),card=document.getElementById('stage');
const query=new URLSearchParams(location.search),editor=query.get('preview')==='1'&&query.get('editor')==='1';
let layout={x:960,y:64,width:760,font_size:22},override=null,scale=1;
const valid=(v,fallback,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):fallback;
function apply(value){
  const next=override||value||layout;
  const width=valid(next.width,760,360,1400),x=valid(next.x,960,width/2,1920-width/2);
  card.style.width=width+'px';
  const font_size=valid(next.font_size,22,16,48);
  card.style.setProperty('--message-size',font_size+'px');
  const y=valid(next.y,64,0,Math.max(0,1080-card.offsetHeight-24));
  layout={x,y,width,font_size};card.style.left=x+'px';card.style.top=y+'px';
  return layout;
}
function fit(){
  scale=Math.min(innerWidth/1920,innerHeight/1080);
  frame.style.transform='translate(-50%,-50%) scale('+scale+')';apply(layout);
}
function notify(){if(editor&&parent!==global)parent.postMessage({type:'cung:layout-change',layout},location.origin)}
global.CungLayout={apply,get value(){return {...layout}},fit};
global.addEventListener('resize',fit);fit();
if(typeof ResizeObserver==='function')new ResizeObserver(()=>apply(layout)).observe(card);
if(editor){
  document.body.classList.add('layout-editor');
  global.addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='cung:layout-set')return;
    if(!event.data.layout||typeof event.data.layout!=='object')return;
    override=event.data.layout;apply(override);notify();
  });
  let drag=null;
  card.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();card.setPointerCapture(event.pointerId);
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:layout.x,startY:layout.y};card.classList.add('is-dragging');
  });
  card.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    override={...layout,x:drag.startX+(event.clientX-drag.x)/scale,y:drag.startY+(event.clientY-drag.y)/scale};apply(override);notify();
  });
  const end=event=>{if(!drag||event.pointerId!==drag.id)return;drag=null;card.classList.remove('is-dragging');notify()};
  card.addEventListener('pointerup',end);card.addEventListener('pointercancel',end);card.addEventListener('lostpointercapture',end);
  global.addEventListener('load',()=>parent.postMessage({type:'cung:layout-ready'},location.origin));
}
})(globalThis);
