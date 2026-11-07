/* Plays a complete film shot in the OBS design frame. No character layers or mesh deformation. */
(function(global){
'use strict';
const entries=new Map(),params=new URLSearchParams(global.location?.search||'');
const audible=params.get('sfx')!=='0',volume=Math.max(0,Math.min(1,Number(params.get('sfxvol')||.7)));
let active=null;
const aborted=()=>new DOMException('Playback cancelled','AbortError');
function configure(manifest){
  for(const [key,spec]of Object.entries(manifest||{})){
    const tier=Number(key);if(![2,3].includes(tier)||!spec?.src)continue;
    const url=new URL(spec.src,location.href);
    if(url.origin!==location.origin)throw new Error('Cinematic media must be hosted with the overlay.');
    const previous=entries.get(tier);if(previous?.src===url.href)continue;
    if(previous?.objectURL)URL.revokeObjectURL(previous.objectURL);
    entries.set(tier,{src:url.href,seconds:Math.max(.1,Number(spec.seconds)||8),blueScreen:spec.blueScreen===true,embeddedAudio:spec.audio==='embedded',video:null,loading:null,objectURL:null});
  }
}
async function prepare(tier){
  const entry=entries.get(Number(tier));if(!entry)return null;
  if(entry.video)return entry;
  if(entry.loading)return entry.loading;
  entry.loading=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
    try{
      // Download the entire short shot before starting its clock, so network buffering
      // cannot separate the dragon's mouth and the scheduled fire sound.
      const response=await fetch(entry.src,{cache:'no-cache',signal:controller.signal});
      if(!response.ok)throw new Error('Cannot load cinematic clip ('+response.status+').');
      const blob=await response.blob();if(!blob.size)throw new Error('Cinematic clip is empty.');
      const objectURL=URL.createObjectURL(blob),video=document.createElement('video');
      video.preload='auto';video.playsInline=true;video.muted=true;video.loop=false;
      try{
        await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>finish(new Error('Cinematic decoder timed out.')),15000);
          const finish=error=>{clearTimeout(timeout);video.removeEventListener('loadeddata',loaded);video.removeEventListener('error',failed);error?reject(error):resolve()};
          const loaded=()=>finish(),failed=()=>finish(new Error('Cinematic video format is not supported.'));
          video.addEventListener('loadeddata',loaded,{once:true});video.addEventListener('error',failed,{once:true});video.src=objectURL;video.load();
        });
        if(!video.videoWidth||!video.videoHeight)throw new Error('Cinematic video has no picture.');
        entry.video=video;entry.objectURL=objectURL;return entry;
      }catch(error){URL.revokeObjectURL(objectURL);throw error}
    }finally{clearTimeout(timer)}
  })().catch(error=>{entry.loading=null;throw error});
  return entry.loading;
}
function removeBlueScreen(context, width, height) {
  const frame = context.getImageData(0, 0, width, height);
  const pixels = frame.data;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const neutral = Math.max(red, green);
    // Blue dominance leaves neutral white clouds and dark smoke intact.
    const dominance = blue - neutral;
    const removal = Math.max(0, Math.min(1, (dominance - 15) / 65));
    const softened = removal * removal * (3 - 2 * removal);
    pixels[offset + 3] = Math.round(255 * (1 - softened));
    if (dominance > 15) {
      pixels[offset + 2] = Math.round(blue - (blue - neutral) * removal);
    }
  }
  context.putImageData(frame, 0, 0);
}
function waitFor(entry,signal){
  if(signal?.aborted)return Promise.reject(aborted());
  if(!signal)return entry;
  return new Promise((resolve,reject)=>{
    const cancel=()=>reject(aborted());signal.addEventListener('abort',cancel,{once:true});
    entry.then(resolve,reject).finally(()=>signal.removeEventListener('abort',cancel));
  });
}
async function run(tier,canvas,signal){
  const entry=await waitFor(prepare(tier),signal);if(!entry)return false;
  if(signal?.aborted)throw aborted();
  active?.cancel();
  const video=entry.video,ctx=canvas.getContext('2d',{willReadFrequently:entry.blueScreen});if(!ctx)throw new Error('OBS canvas unavailable.');
  canvas.width=1920;canvas.height=1080;video.pause();video.currentTime=0;
  const limit=Math.min(entry.seconds,Number.isFinite(video.duration)?video.duration:entry.seconds);
  video.muted=!entry.embeddedAudio||!audible;video.volume=volume;
  return new Promise((resolve,reject)=>{
    let done=false,raf=0,frameRequest=0,started=false;
    function cleanup(){
      cancelAnimationFrame(raf);if(frameRequest&&video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frameRequest);
      video.pause();video.removeEventListener('ended',finish);video.removeEventListener('error',failed);signal?.removeEventListener('abort',cancel);
      global.CungSFX?.stop();canvas.style.opacity='0';ctx.clearRect(0,0,1920,1080);if(active?.cancel===cancel)active=null;
    }
    function settle(error){if(done)return;done=true;cleanup();error?reject(error):resolve(true)}
    function finish(){settle()}
    function cancel(){settle(aborted())}
    function failed(){settle(new Error('Cinematic decoder failed during playback.'))}
    function draw(){
      if(done)return;
      const t=video.currentTime;if(t>=limit){finish();return}
      if(video.readyState>=2){
        if(!started){started=true;if(!entry.embeddedAudio&&audible){if(Number(tier)===2)global.CungSFX?.dragon({signal});else global.CungSFX?.celestial()}}
        // Preserve 16:9 framing. A differently sized source is letterboxed, never stretched.
        const scale=Math.min(1920/video.videoWidth,1080/video.videoHeight),w=video.videoWidth*scale,h=video.videoHeight*scale;
        ctx.clearRect(0,0,1920,1080);ctx.drawImage(video,(1920-w)/2,(1080-h)/2,w,h);
        if (entry.blueScreen) removeBlueScreen(ctx, 1920, 1080);
        canvas.style.opacity=String(Math.min(1,t/.12,(limit-t)/.18));
      }
      if(video.requestVideoFrameCallback)frameRequest=video.requestVideoFrameCallback(draw);else raf=requestAnimationFrame(draw);
    }
    active={cancel};signal?.addEventListener('abort',cancel,{once:true});video.addEventListener('ended',finish,{once:true});video.addEventListener('error',failed,{once:true});
    video.play().then(draw,error=>{
      if(error?.name==='NotAllowedError'&&entry.embeddedAudio){video.muted=true;video.play().then(draw,settle)}else settle(error);
    });
  });
}
function stop(){active?.cancel()}
global.CungCinema={configure,prepare,run,stop,has:tier=>entries.has(Number(tier))};
global.addEventListener('pagehide',stop);
})(globalThis);
