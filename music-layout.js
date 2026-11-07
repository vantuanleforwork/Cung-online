(function () {
  'use strict';
  const card = document.getElementById('musicCard');
  const frame = document.getElementById('obsFrame');
  const editor = document.body.classList.contains('music-editor');
  let layout = {music_x:48,music_y:740,music_width:360,music_height:160,music_opacity:90};
  let scale = 1;
  function apply(value) {
    layout = {...layout,...value};
    layout.music_width = Math.max(240, Math.min(960, Number(layout.music_width)||360));
    layout.music_height = Math.max(140, Math.min(700, Number(layout.music_height)||160));
    layout.music_x = Math.max(0, Math.min(1920-layout.music_width, Number(layout.music_x)||0));
    layout.music_y = Math.max(0, Math.min(1080-layout.music_height, Number(layout.music_y)||0));
    card.style.left = layout.music_x+'px'; card.style.top = layout.music_y+'px';
    card.style.width = layout.music_width+'px'; card.style.height = layout.music_height+'px';
    card.style.setProperty('--music-opacity', Math.max(0,Math.min(1,Number(layout.music_opacity)/100)));
    return {...layout};
  }
  function fit() {
    scale = Math.min(innerWidth/1920,innerHeight/1080);
    if (editor) frame.style.transform = 'translate(-50%,-50%) scale('+scale+')';
  }
  window.CungMusicLayout = {apply};
  if (!editor) return;
  fit(); window.addEventListener('resize',fit);
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'music:layout') return;
    apply(event.data.layout); fit();
    parent.postMessage({type:'music:changed',layout:{music_x:Math.round(layout.music_x),music_y:Math.round(layout.music_y)}},location.origin);
  });
  let drag;
  card.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); card.setPointerCapture(event.pointerId);
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY,left:layout.music_x,top:layout.music_y};
  });
  card.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    apply({...layout,music_x:drag.left+(event.clientX-drag.x)/scale,music_y:drag.top+(event.clientY-drag.y)/scale});
    parent.postMessage({type:'music:changed',layout:{music_x:Math.round(layout.music_x),music_y:Math.round(layout.music_y)}},location.origin);
  });
  card.addEventListener('pointerup', () => { drag = null; });
  card.addEventListener('pointercancel', () => { drag = null; });
  window.addEventListener('load', () => parent.postMessage({type:'music:ready'},location.origin));
})();
