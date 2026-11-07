(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const key = params.get('k');
  if (!key || params.get('preview') === '1') return;
  const card = document.getElementById('musicCard');
  const title = document.getElementById('musicTitle');
  const sender = document.getElementById('musicSender');
  const owner = [...crypto.getRandomValues(new Uint8Array(16))].map(value => value.toString(16).padStart(2,'0')).join('');
  let player, item, settings, paused = false, pendingEvent, inFlight = false, lastReply = 0, generation = 0;
  const progressBar = document.querySelector('.music-progress');
  const progressFill = document.getElementById('musicProgressFill');
  const nextBox = document.getElementById('musicNext');
  const nextTitle = document.getElementById('musicNextTitle');
  const enable = document.getElementById('musicEnable');
  const titles = new Map();
  let upcoming = null;
  let apiPromise;
  const clock = seconds => Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
  function updateProgress() {
    if (!item || !settings) return;
    const metric = CungMusicProgress(player?.getCurrentTime?.() || item.position_seconds, player?.getDuration?.(), settings.music_seconds);
    progressFill.style.width = metric.percent+'%';
    progressBar.setAttribute('aria-valuenow',String(metric.percent));
    document.getElementById('musicPercent').textContent = metric.percent+'%';
    document.getElementById('musicTime').textContent = clock(metric.elapsed)+' / '+clock(metric.total);
    nextBox.hidden = !upcoming || !metric.showNext;
    nextTitle.textContent = upcoming ? (upcoming.title || titles.get(Number(upcoming.id)) || 'Đang lấy tên bài…') : '';
    return metric;
  }
  const titleRetries = new Map();
  function prepareTitle(id) {
    id = Number(id);
    if (!id || titles.get(id) || performance.now() < (titleRetries.get(id) || 0)) return;
    titleRetries.set(id,performance.now()+60000);
    const metadataController = new AbortController();
    const metadataTimeout = setTimeout(() => metadataController.abort(),6000);
    fetch('music-title.php?k='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id}),signal:metadataController.signal})
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (data?.title) {
          titles.set(id,data.title);
          if (Number(item?.id) === id && !item.title) { item.title = data.title; title.textContent = data.title; }
        }
        updateProgress();
      })
      .catch(() => {})
      .finally(() => clearTimeout(metadataTimeout));
  }
  enable.addEventListener('click', () => { autoplayBlocked = false; enable.hidden = true; player?.playVideo?.(); });
  let lastMovement = 0, lastPosition = 0, autoplayBlocked = false;
  function youtubeAPI() {
    if (window.YT?.Player) return Promise.resolve();
    if (!apiPromise) apiPromise = new Promise((resolve,reject) => {
      const timer = setTimeout(() => reject(new Error('Không tải được YouTube.')),15000);
      window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); resolve(); };
      const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => { clearTimeout(timer); reject(new Error('Không kết nối được YouTube.')); };
      document.head.append(script);
    }).catch(error => { apiPromise = null; throw error; });
    return apiPromise;
  }
  function stop() {
    generation++;
    if (player) { player.destroy(); player = null; }
    document.getElementById('musicVideo').replaceChildren();
    card.hidden = true; item = null; enable.hidden = true; nextBox.hidden = true;
  }
  function finish(event) {
    if (!item) return;
    pendingEvent = {id:Number(item.id),event};
    player?.pauseVideo?.();
  }
  async function start(next) {
    stop();
    item = next;
    card.classList.remove('is-idle');
    document.getElementById('musicIdle').hidden = true;
    card.hidden = false;
    lastMovement = performance.now(); lastPosition = Number(next.position_seconds)||0; autoplayBlocked = false;
    updateProgress();
    const version = generation;
    title.textContent = next.title || 'Đang tải nhạc YouTube…';
    sender.textContent = next.donation_id === null ? 'Thêm bởi quản trị viên' : next.name+' · '+Number(next.paid_amount).toLocaleString('vi-VN')+'đ';
    try {
      await youtubeAPI();
      if (version !== generation || !item) return;
      const target = document.createElement('div'); document.getElementById('musicVideo').append(target);
      player = new YT.Player(target, {
        width:'100%',height:'100%',
        playerVars:{origin:location.origin,playsinline:1,controls:1},
        events:{
          onReady(event) {
            if (version !== generation) return;
            event.target.getIframe().referrerPolicy = 'strict-origin-when-cross-origin';
            event.target.setVolume(Number(settings.music_volume));
            const video = {videoId:next.video_id,startSeconds:Number(next.position_seconds)||0};
            if (paused) event.target.cueVideoById(video); else event.target.loadVideoById(video);
          },
          onStateChange(event) {
            if (version !== generation) return;
            if (event.data === YT.PlayerState.ENDED) finish('ended');
            if (event.data === YT.PlayerState.PLAYING) {
              autoplayBlocked = false; enable.hidden = true;
              if (paused) event.target.pauseVideo();
              const name = event.target.getVideoData()?.title;
              if (name) { item.title = name; title.textContent = name; }
            }
          },
          onError() { if (version === generation) finish('error'); },
          onAutoplayBlocked() { autoplayBlocked = true; enable.hidden = false; }
        }
      });
    } catch (error) {
      if (version === generation) { title.textContent = error.message; item = null; }
    }
  }
  async function heartbeat() {
    if (inFlight) return;
    inFlight = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),7000);
    const event = pendingEvent;
    const position = player?.getCurrentTime?.() || Number(item?.position_seconds) || 0;
    try {
      const response = await fetch('music-overlay.php?k='+encodeURIComponent(key), {
        method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({owner,id:event?.id || Number(item?.id)||0,position,title:item?.title||'',event:event?.event||''})
      });
      if (!response.ok) throw new Error('Mất kết nối hàng đợi nhạc.');
      const data = await response.json(); lastReply = performance.now();
      if (pendingEvent === event) pendingEvent = null;
      if (!data.owner) { stop(); return; }
      settings = data.settings; paused = data.paused;
      CungMusicLayout.apply(settings);
      upcoming = data.next;
      prepareTitle(data.untitled_id);
      if (item && Number(item.id) === Number(data.item?.id) && data.item.title && !item.title) {
        item.title = data.item.title; title.textContent = item.title;
      }
      if (!data.item) { stop(); CungMusicLayout.showIdle(settings); return; }
      if (Number(item?.id) !== Number(data.item.id)) { start(data.item); return; }
      if (player?.getPlayerState) {
        player.setVolume(Number(settings.music_volume));
        if (paused) player.pauseVideo();
        else if (!pendingEvent && !autoplayBlocked && player.getPlayerState() !== YT.PlayerState.PLAYING && player.getPlayerState() !== YT.PlayerState.BUFFERING) player.playVideo();
      }
    } catch (error) {
      if (performance.now()-lastReply > 9000) stop();
    } finally { clearTimeout(timeout); inFlight = false; }
  }
  setInterval(heartbeat,2000);
  setInterval(() => {
    if (lastReply && performance.now()-lastReply > 10000) stop();
    if (!item || !settings) return;
    const position = Number(player?.getCurrentTime?.()||0);
    if (position > lastPosition + .1) { lastPosition = position; lastMovement = performance.now(); }
    if (paused || autoplayBlocked) lastMovement = performance.now();
    const metric = updateProgress();
    if (position >= metric.total) finish('ended');
    else if (player && performance.now()-lastMovement > 45000) finish('error');
  },250);
  window.addEventListener('pagehide',stop);
  heartbeat();
})();
