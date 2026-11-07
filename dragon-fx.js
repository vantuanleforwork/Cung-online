/* One articulated model, one eight-second camera shot. */
(function(global){
'use strict';
const source=new URL('dragon-rig.mjs?v=1',document.currentScript.src);
const cues=Object.freeze({impact:.68,scrape:.85,smoke:1.1,emerge:1.6,stare:2.6,growl:3.05,inhale:3.8,fire:4.15,fireEnd:5.55,coil:5.45,flight:6.1,tail:6.75,end:8});
let factory=null,pending=null;
function preload(){
  if(!pending)pending=import(source.href).then(module=>{factory=module.createDragonScene;return true}).catch(error=>{console.error('Dragon 3D could not load:',error);pending=null;return false});
  return pending;
}
global.CungDragon={duration:8000,cues,preload,scene(W,H){return factory(W,H)},get ready(){return !!factory}};
preload();
})(globalThis);
