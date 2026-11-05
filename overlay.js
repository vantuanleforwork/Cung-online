'use strict';
const params=new URLSearchParams(location.search),K=params.get('k')||'',preview=params.get('preview')==='1';
const $=id=>document.getElementById(id);
let busy=false,demo=null;
function sleep(ms,signal){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted)return reject(new DOMException('Lease lost','AbortError'));
    const finish=()=>{signal?.removeEventListener('abort',cancel);resolve()};
    const timer=setTimeout(finish,ms),cancel=()=>{clearTimeout(timer);reject(new DOMException('Lease lost','AbortError'))};
    signal?.addEventListener('abort',cancel,{once:true});
  });
}
function notice(text){$('audioTools').hidden=false;$('notice').textContent=text}
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
function render(d){
  const tier=Math.max(1,Math.min(3,Number(d.tier)||1));
  $('donorName').textContent=d.name||'Ẩn danh';
  const avatar=$('avatar'),initial=Array.from((d.name||'Ẩn danh').trim())[0]?.toLocaleUpperCase('vi-VN')||'A';
  avatar.replaceChildren();
  if(typeof d.donor_avatar==='string' && (/^uploads\/avatars\/[a-f0-9]{40}\.(jpg|png|webp)$/.test(d.donor_avatar)||/^https:\/\/lh3\.googleusercontent\.com\//.test(d.donor_avatar))){
    const img=document.createElement('img');img.src=d.donor_avatar;img.alt='';img.referrerPolicy='no-referrer';avatar.append(img);
  }else avatar.textContent=initial;
  $('donorLevel').textContent='Lv'+Math.max(0,Number(d.donor_level)||0);
  $('donationAmount').textContent=Number(d.paid_amount).toLocaleString('vi-VN');
  $('donationAmount').style.fontSize=String(d.paid_amount).length>10?'32px':'';
  $('offeringBadge').textContent={1:'Thắp hương',2:'Dâng hoa quả',3:'Dâng lễ'}[tier];
  $('offeringText').textContent={1:'Một nén tâm hương',2:'Hoa thơm, quả ngọt',3:'Lễ thành kính dâng'}[tier];
  $('donorMessage').textContent=d.message||'Một tấm lòng thành, nguyện cầu bình an.';
  for(let i=1;i<=3;i++)$('art'+i).style.display=i===tier?'':'none';
  $('stage').style.setProperty('--duration',(d.speech?.display_seconds||8)+'s');
}
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
  render(d);$('stage').classList.remove('is-visible');void $('stage').offsetWidth;$('stage').classList.add('is-visible');
  try{
    await sleep(700,lease.signal);
    const reading=speak({...d},lease.signal).catch(error=>{
      if(lease.signal.aborted)throw error;
      notice(error.message);
    });
    await Promise.all([sleep((d.speech?.display_seconds||8)*1000,lease.signal),reading]);
    if(lease.signal.aborted)return false;
    if(!preview){$('stage').classList.remove('is-visible');await sleep(700,lease.signal)}
    return true;
  }catch(error){
    $('stage').classList.remove('is-visible');
    if(!preview)notice('Kết nối giữ lượt bị gián đoạn. Lượt chưa xác nhận sẽ được phát lại.');
    return false;
  }finally{lease.close();CungSpeech.stop();$('speechState').classList.remove('is-speaking')}
}
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
  if(!K)return {name:'Nguyễn Văn An',paid_amount:10000,tier:1,message:'Cầu mong gia đình bình an, mọi sự tốt lành.',speech_text:'Nguyễn Văn An đã thắp hương mười nghìn đồng. Với lời nhắn: Cầu mong gia đình bình an, mọi sự tốt lành.',speech:{enabled:true,provider:'browser',rate:1,volume:1,display_seconds:8}};
  const {response,data}=await request('overlay-settings.php');
  if(!response.ok)throw new Error(data.error||'Không đọc được cấu hình.');return data.demo;
}
async function test(){
  if(busy){notice('Hãy chờ lượt hiện tại phát xong để nghe thử.');return}
  busy=true;$('previewPlay').disabled=$('enableAudio').disabled=true;
  try{
    demo=await getDemo();
    if(preview)await play(demo);
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
  }catch(error){notice(error.message)}
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
      for(const d of data){d.lease_remaining_ms=Math.max(0,(Number(d.lease_seconds)||60)*1000-elapsed);if(await play(d))await acknowledge(d)}
    }catch(error){notice(error.message||'Mất kết nối hàng đợi, đang thử lại…')}
    finally{busy=false}
    await sleep(2000);
  }
}
$('previewPlay').addEventListener('click',test);$('enableAudio').addEventListener('click',test);
window.addEventListener('pagehide',()=>CungSpeech.stop());
if(preview){
  document.body.classList.add('preview');$('previewTools').hidden=false;
  getDemo().then(d=>{demo=d;render(d);$('stage').classList.add('is-visible')}).catch(error=>notice(error.message));
}else if(!K)notice('Thiếu khóa overlay. Thêm ?k=OVERLAY_KEY vào đường dẫn.');
else{if(params.get('controls')==='1')notice('Bấm nghe thử trước khi phát live.');loop()}
