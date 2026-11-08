/* Shared donation modes and read-only music queue on the public page. */
(function () {
  'use strict';
  const state = window.CungDonate = {ready:false,kind:'message',settings:{message_min:10000,tier2_min:50000,tier3_min:200000,music_min:50000,music_enabled:true,music_seconds:180}};
  const wheelSelect = document.getElementById('rouletteWheel');
  const selectedWheel = () => (state.settings.wheels || []).find(wheel => String(wheel.id) === wheelSelect?.value);
  state.minimum = () => Number(state.kind === 'roulette' ? selectedWheel()?.minimum ?? 50000001 :
    state.settings[state.kind === 'music' ? 'music_min' : 'message_min']);
  state.videoID = link => {
    let url;
    try { url = new URL(link.trim()); } catch { throw new Error('Chỉ nhận link YouTube.'); }
    if (url.protocol !== 'https:' || !['www.youtube.com','youtu.be'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('Chỉ nhận link YouTube bắt đầu bằng https://www.youtube.com/ hoặc https://youtu.be/.');
    let id = '';
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
    else if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
    else id = url.pathname.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] || '';
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Link YouTube phải trỏ đến một video cụ thể.');
    return id;
  };
  const buttons = [...document.querySelectorAll('[data-donation-kind]')];
  const field = document.getElementById('musicLinkField');
  const queue = document.getElementById('musicQueueSection');
  let loading = false;
  function refreshForm() {
    buttons.forEach(button => {
      const active = button.dataset.donationKind === state.kind;
      button.setAttribute('aria-selected',String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document.getElementById('donationFields').setAttribute('aria-labelledby','donation-tab-'+state.kind);
    const music = state.kind === 'music';
    const roulette = state.kind === 'roulette';
    field.hidden = !music; queue.hidden = !music;
    document.querySelector('.voice-select-box').hidden = music || roulette;
    const rouletteField = document.getElementById('rouletteField');
    if (rouletteField) rouletteField.hidden = !roulette;
    if (roulette) {
      document.getElementById('rouletteRule').textContent = 'Tối thiểu '+state.minimum().toLocaleString('vi-VN')+'đ mỗi lượt';
      const amount = document.getElementById('amt');
      if (Number(amount.value) < state.minimum()) amount.value = state.minimum();
    }
    document.getElementById('amt').min = state.minimum();
    document.getElementById('musicRule').textContent = 'Tối thiểu '+state.minimum().toLocaleString('vi-VN')+'đ · Tối đa '+state.settings.music_seconds+' giây/bài'+(!state.settings.music_enabled?' · Hiện tạm dừng nhận nhạc.':'');
    if (window.upd) window.upd();
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    state.kind = button.dataset.donationKind;
    refreshForm();
    if (state.kind === 'music') loadQueue();
  }));
  buttons.forEach(button => button.addEventListener('keydown', event => {
    let target;
    const visible = buttons.filter(item => !item.hidden);
    const current = visible.indexOf(button);
    if (event.key === 'ArrowRight') target = visible[(current+1)%visible.length];
    if (event.key === 'ArrowLeft') target = visible[(current+visible.length-1)%visible.length];
    if (event.key === 'Home') target = visible[0];
    if (event.key === 'End') target = visible[visible.length-1];
    if (!target) return;
    event.preventDefault(); target.click(); target.focus();
  }));
  wheelSelect?.addEventListener('change', refreshForm);
  async function loadQueue() {
    if (loading || state.kind !== 'music' || document.hidden) return;
    loading = true;
    const status = document.getElementById('musicQueueStatus');
    try {
      const response = await fetch('music-queue.php',{cache:'no-store'});
      if (!response.ok) throw new Error('Chưa tải được hàng đợi nhạc.');
      const data = await response.json();
      const list = document.getElementById('musicQueueList'); list.replaceChildren();
      for (const song of data.items) {
        const row = document.createElement('li'); row.className = 'music-queue-row';
        const text = document.createElement('div');
        const link = document.createElement('a'); link.href = 'https://www.youtube.com/watch?v='+song.video_id;
        link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = song.title || 'Đang lấy tên bài…';
        const person = document.createElement('small'); person.textContent = song.donation_id === null ? 'Thêm bởi quản trị viên' : song.name+' · '+Number(song.paid_amount).toLocaleString('vi-VN')+'đ';
        text.append(link,person);
        const badge = document.createElement('span'); badge.textContent = song.state === 'playing' ? 'Đang phát' : 'Chờ phát';
        row.append(text,badge); list.append(row);
      }
      status.textContent = data.paused ? 'Hàng đợi đang tạm dừng.' : data.items.length ? 'Thứ tự '+(data.order === 'amount' ? 'ưu tiên số tiền donate' : 'thanh toán trước phát trước') : 'Chưa có bài nhạc. Bài sẽ xuất hiện sau khi thanh toán thành công.';
    } catch (error) { status.textContent = error.message; }
    finally { loading = false; }
  }
  state.loadQueue = loadQueue;
  fetch('donation-settings.php',{cache:'no-store'}).then(async response => {
    if (!response.ok) throw new Error('Chưa tải được mức donate. Vui lòng tải lại trang hoặc liên hệ quản trị.');
    state.settings = await response.json(); state.ready = true;
    const wheels = state.settings.wheels || [];
    if (wheelSelect) wheelSelect.replaceChildren(...wheels.map(wheel => new Option(wheel.name, wheel.id)));
    const wheelTab = document.getElementById('donation-tab-roulette');
    if (wheelTab) wheelTab.hidden = wheels.length === 0;
    const quick = document.querySelectorAll('.q button');
    [state.settings.message_min,state.settings.tier2_min,state.settings.tier3_min].forEach((value,index) => {
      quick[index].dataset.v = value; quick[index].textContent = Number(value).toLocaleString('vi-VN')+'đ';
    });
    document.getElementById('amt').value = state.settings.tier2_min;
    refreshForm();
  }).catch(error => { document.getElementById('err').textContent = error.message; });
  setInterval(loadQueue,10000);
  window.addEventListener('donation:paid',loadQueue);
})();
