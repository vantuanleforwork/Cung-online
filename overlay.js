'use strict';
const params=new URLSearchParams(location.search),K=params.get('k')||'',preview=params.get('preview')==='1';
const $=id=>document.getElementById(id);
let busy=false,demo=null,selectedPreviewTier=[1,2,3].includes(Number(params.get('tier')))?Number(params.get('tier')):1;
function sleep(ms,signal){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted)return reject(new DOMException('Lease lost','AbortError'));
    const finish=()=>{signal?.removeEventListener('abort',cancel);resolve()};
    const timer=setTimeout(finish,ms),cancel=()=>{clearTimeout(timer);reject(new DOMException('Lease lost','AbortError'))};
    signal?.addEventListener('abort',cancel,{once:true});
  });
}
function notice(text){$('audioTools').hidden=false;$('notice').textContent=text}
function noticeError(error,fallback){
  const message=String(error?.message||'');
  const text=error?.name==='AbortError'||/signal is aborted|aborted without reason/i.test(message)?fallback:(message||fallback);
  notice(text);
}
async function request(url,body={},signal){
  const started=Date.now();
  const controller=new AbortController(),cancel=()=>controller.abort(),timer=setTimeout(cancel,25000);
  signal?.addEventListener('abort',cancel,{once:true});
  try{
    if(signal?.aborted)cancel();
    const response=await fetch(url+'?k='+encodeURIComponent(K),{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    const data=await response.json();return {response,data,elapsed:Date.now()-started};
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}
function startLease(d){
  const controller=new AbortController(),ttl=Math.max(30,Number(d.lease_seconds)||60)*1000;
  let timer,expiry,closed=false;
  const expire=()=>{if(!closed)controller.abort()};
  const resetExpiry=(remaining=ttl)=>{clearTimeout(expiry);if(remaining<=3000)expire();else expiry=setTimeout(expire,remaining-3000)};
  async function renew(){
    if(closed||controller.signal.aborted)return;
    let delay=Math.min(15000,ttl/3);
    try{
      const {response,data,elapsed}=await request('renew.php',{id:d.id,claim_token:d.claim_token},controller.signal);
      if(response.status===409||response.status===403){expire();return}
      if(response.ok&&data.success)resetExpiry(ttl-elapsed);else delay=2000;
    }catch(error){delay=2000}
    if(!closed&&!controller.signal.aborted)timer=setTimeout(renew,delay);
  }
  resetExpiry(d.lease_remaining_ms??ttl);timer=setTimeout(renew,Math.min(15000,ttl/3));
  return {signal:controller.signal,close(){closed=true;clearTimeout(timer);clearTimeout(expiry);controller.abort()}};
}
function donationTier(d){return Math.max(1,Math.min(3,Number(d.tier)||1))}
async function playTierIntro(d,signal){
  const tier=donationTier(d),intro=$('tierIntro');
  intro.hidden=true;intro.className='tier-intro';
  if(tier<2)return;
  $('introKicker').textContent=tier===2?'HỎA LONG KHAI LỄ':'ĐẠI LỄ TỐI THƯỢNG';
  $('introTitle').textContent=tier===2?'RỒNG LỬA GIÁNG LÂM':'THIÊN NỮ GIÁNG LÂM';
  void intro.offsetWidth;intro.hidden=false;intro.className='tier-intro tier-'+tier;
  const reduced=!document.body.classList.contains('force-motion')&&typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{await sleep(reduced?120:(tier===2?2800:3800),signal)}
  finally{intro.hidden=true;intro.className='tier-intro'}
}
globalThis.playTierIntro=playTierIntro;
function render(d){
  const tier=donationTier(d);
  $('donorName').textContent=d.name||'Ẩn danh';
  const avatar=$('avatar'),initial=Array.from((d.name||'Ẩn danh').trim())[0]?.toLocaleUpperCase('vi-VN')||'A';
  avatar.replaceChildren();
  let avatarUrl='';
  if(typeof d.donor_avatar==='string'&&d.donor_avatar.trim())try{
    const url=new URL(d.donor_avatar,location.href);
    const local=url.origin===location.origin&&/^\/uploads\/avatars\/[a-f0-9]{40}\.(jpg|png|webp)$/.test(url.pathname);
    const google=url.protocol==='https:'&&/(^|\.)googleusercontent\.com$/i.test(url.hostname);
    if(local||google)avatarUrl=url.href;
  }catch(error){}
  if(avatarUrl){
    const img=document.createElement('img');img.src=avatarUrl;img.alt='';img.referrerPolicy='no-referrer';img.decoding='async';
    img.addEventListener('error',()=>{avatar.replaceChildren();avatar.textContent=initial},{once:true});avatar.append(img);
  }else avatar.textContent=initial;
  $('donorLevel').textContent='Lv'+Math.max(0,Number(d.donor_level)||0);
  $('donationAmount').textContent=Number(d.paid_amount).toLocaleString('en-US');
  $('donationAmount').style.fontSize=String(d.paid_amount).length>10?'32px':'';
  $('offeringBadge').textContent={1:'Donate',2:'Donate Hỏa Long',3:'Donate Đại Lễ'}[tier]||'Donate';
  $('offeringText').textContent={1:'Đã gửi tặng',2:'Hỏa Long xuất hiện',3:'Đại lễ tối thượng'}[tier]||'Đã gửi tặng';
  $('donorMessage').textContent=d.message||'Cảm ơn bạn đã ủng hộ kênh!';
  for(let i=1;i<=3;i++)$('art'+i).style.display=i===tier?'':'none';
  $('stage').dataset.tier=String(tier);$('stage').style.setProperty('--duration',displaySeconds(d)+'s');
}
function displaySeconds(d){return Math.max(8,Math.min(30,Number(d.speech?.display_seconds)||8))}
async function speak(d,signal){
  if(!d.speech?.enabled||d.speech.volume===0)return;
  $('speechLabel').textContent='ĐANG CHUẨN BỊ GIỌNG';
  if(['fpt','elevenlabs','custom_api'].includes(d.speech.provider)){
    const deadline=Date.now()+(d.speech.provider==='custom_api'?180000:45000);
    while(!d.audio_url){
      if(Date.now()>deadline)throw new Error('Giọng đọc chưa sẵn sàng. Kiểm tra kết nối hoặc bộ nhớ giọng trong admin.');
      const {response,data}=await request('tts.php',preview?{preview:true}:{id:d.id,claim_token:d.claim_token},signal);
      if(data.disabled)return;
      if(!response.ok)throw new Error(data.error||'Không tạo được giọng đọc.');
      d.audio_url=data.audio_url;
      if(!d.audio_url)await sleep(2000,signal);
    }
  }
  $('speechState').classList.add('is-speaking');$('speechLabel').textContent='ĐANG ĐỌC LỜI GỬI GẮM';
  try{await CungSpeech.read(d,{signal})}
  finally{$('speechState').classList.remove('is-speaking');$('speechLabel').textContent='LỜI GỬI GẮM'}
}
async function play(d){
  const lease=preview?{signal:new AbortController().signal,close(){}}:startLease(d);
  render(d);$('stage').classList.remove('is-visible');
  try{
    await (globalThis.playTierIntro||playTierIntro)(d,lease.signal);
    void $('stage').offsetWidth;$('stage').classList.add('is-visible');
    await sleep(700,lease.signal);
    const reading=speak({...d},lease.signal).catch(error=>{
      if(lease.signal.aborted)throw error;
      noticeError(error,'Không phát được giọng đọc.');
    });
    await Promise.all([sleep(displaySeconds(d)*1000,lease.signal),reading]);
    if(lease.signal.aborted)return false;
    if(!preview){$('stage').classList.remove('is-visible');await sleep(700,lease.signal)}
    return true;
  }catch(error){
    $('stage').classList.remove('is-visible');
    if(!preview)notice('Kết nối giữ lượt bị gián đoạn. Lượt chưa xác nhận sẽ được phát lại.');
    return false;
  }finally{lease.close();CungSpeech.stop();$('speechState').classList.remove('is-speaking')}
}
globalThis.play=play;
async function acknowledge(d){
  for(;;){
    try{
      const {response,data}=await request('ack.php',{id:d.id,claim_token:d.claim_token});
      if((response.ok&&data.success)||response.status===409)return;
      if(response.status===403){notice('Khóa overlay không đúng. Kiểm tra lại đường dẫn trong OBS.');return}
    }catch(error){}
    await sleep(2000);
  }
}
async function getDemo(){
  let value;
  if(!K)value={name:'Nguyễn Văn An',paid_amount:10000,tier:1,message:'Chúc kênh livestream phát triển thuận lợi, vạn sự như ý!',speech_text:'Nguyễn Văn An đã donate mười nghìn đồng. Với lời nhắn: Chúc kênh livestream phát triển thuận lợi, vạn sự như ý!',speech:{enabled:true,provider:'browser',rate:1,volume:1,display_seconds:8}};
  else{const {response,data}=await request('overlay-settings.php');if(!response.ok)throw new Error(data.error||'Không đọc được cấu hình.');value=data.demo}
  if(preview){value.tier=selectedPreviewTier;value.paid_amount={1:10000,2:50000,3:200000}[selectedPreviewTier]}
  return value;
}
async function test(){
  if(busy){notice('Hãy chờ lượt hiện tại phát xong để nghe thử.');return}
  busy=true;$('previewPlay').disabled=$('enableAudio').disabled=true;
  try{
    demo=await getDemo();
    if(preview)await (globalThis.play||play)(demo);
    else {
      // Preview requests never claim or acknowledge real queue entries.
      if(['fpt','elevenlabs','custom_api'].includes(demo.speech?.provider)){
        const deadline=Date.now()+180000;
        while(!demo.audio_url){
          const {response,data}=await request('tts.php',{preview:true});
          if(!response.ok)throw new Error(data.error||'Chưa tạo được giọng.');
          demo.audio_url=data.audio_url;
          if(!demo.audio_url){if(Date.now()>deadline)throw new Error('Giọng vẫn đang tạo. Kiểm tra lịch sử dịch vụ rồi bấm thử lại.');await sleep(3000)}
        }
      }
      await CungSpeech.read(demo);
      $('notice').textContent='Đã nghe thử. Có thể ẩn bảng này bằng cách bỏ controls=1 khỏi URL và tải lại overlay.';
    }
  }catch(error){noticeError(error,'Không nghe thử được giọng đọc.')}
  finally{busy=false;$('previewPlay').disabled=$('enableAudio').disabled=false}
}
async function loop(){
  for(;;){
    if(busy){await sleep(250);continue}
    busy=true;
    try{
      const {response,data,elapsed}=await request('poll.php');
      if(response.status===403){notice('Khóa overlay không đúng. Kiểm tra OVERLAY_KEY trong đường dẫn.');return}
      if(!response.ok)throw new Error('Chưa kết nối được hàng đợi. Kiểm tra cấu hình và migration 003.');
      for(const d of data){d.lease_remaining_ms=Math.max(0,(Number(d.lease_seconds)||60)*1000-elapsed);if(await (globalThis.play||play)(d))await acknowledge(d)}
    }catch(error){noticeError(error,'Mất kết nối hàng đợi, đang thử lại…')}
    finally{busy=false}
    await sleep(2000);
  }
}
$('previewPlay').addEventListener('click',test);$('enableAudio').addEventListener('click',test);
document.querySelectorAll('[data-preview-tier]').forEach(button=>{
  const sync=()=>button.setAttribute('aria-pressed',String(Number(button.dataset.previewTier)===selectedPreviewTier));sync();
  button.addEventListener('click',()=>{selectedPreviewTier=Number(button.dataset.previewTier);document.querySelectorAll('[data-preview-tier]').forEach(item=>item.setAttribute('aria-pressed',String(Number(item.dataset.previewTier)===selectedPreviewTier)));test()});
});
window.addEventListener('pagehide',()=>CungSpeech.stop());
if(preview){
  document.body.classList.add('preview');if(params.get('motion')==='1')document.body.classList.add('force-motion');$('previewTools').hidden=false;
  if(params.get('autoplay')==='1'){$('previewTools').hidden=true;test()}
  else getDemo().then(d=>{demo=d;render(d);$('stage').classList.add('is-visible')}).catch(error=>noticeError(error,'Không đọc được cấu hình overlay.'));
}else if(!K)notice('Thiếu khóa overlay. Thêm ?k=OVERLAY_KEY vào đường dẫn.');
else{document.body.classList.add('force-motion');if(params.get('controls')==='1')notice('Bấm nghe thử trước khi phát live.');loop()}
