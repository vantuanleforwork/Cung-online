(function () {
  'use strict';
  const tabs = [...document.querySelectorAll('.leaderboard-tab')];
  const list = document.getElementById('leaderboardList');
  const status = document.getElementById('leaderboardStatus');
  const panel = document.getElementById('leaderboardPanel');
  const toggle = document.getElementById('leaderboardToggle');
  let expanded = false;
  let period = 'day';
  let renderedPeriod;
  const requests = new Map();

  function avatarFor(item) {
    const avatar = document.createElement('span');
    avatar.className = 'leaderboard-avatar';
    avatar.textContent = Array.from(item.name.trim())[0]?.toLocaleUpperCase('vi-VN') || '?';
    if (!item.avatar) return avatar;
    let url;
    try { url = new URL(item.avatar, location.href); } catch { return avatar; }
    const local = url.origin === location.origin && /\/uploads\/avatars\/[a-f0-9]{40}\.(jpg|png|webp)$/.test(url.pathname);
    const google = url.protocol === 'https:' && /(^|\.)googleusercontent\.com$/i.test(url.hostname);
    if (!local && !google) return avatar;
    const image = document.createElement('img');
    image.alt = '';
    image.src = url.href;
    image.referrerPolicy = 'no-referrer';
    image.loading = 'lazy';
    image.addEventListener('error', () => image.remove(), { once: true });
    image.addEventListener('load', () => avatar.replaceChildren(image), { once: true });
    // Keep the initial visible until the image is decoded.
    return avatar;
  }

  function render(items) {
    list.replaceChildren();
    for (const item of items) {
      const row = document.createElement('li');
      row.className = 'leaderboard-row';
      row.dataset.rank = String(item.rank);
      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.setAttribute('aria-label', 'Hạng ' + item.rank);
      if (item.rank <= 3) {
        rank.innerHTML = '<svg class="leaderboard-crown" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 5 4 4-7 4 7 5-4-2 12H5L3 6Zm3 14h12v2H6z"/></svg>';
      } else rank.textContent = item.rank;
      const name = document.createElement('span');
      name.className = 'leaderboard-name';
      name.textContent = item.name;
      name.title = item.name;
      const amount = document.createElement('span');
      amount.className = 'leaderboard-amount';
      amount.textContent = Number(item.amount).toLocaleString('vi-VN') + 'đ';
      row.append(rank, avatarFor(item), name, amount);
      list.append(row);
    }
  }

  async function fetchPeriod(next) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('leaderboard.php?period=' + next, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Không tải được bảng xếp hạng.');
      const data = await response.json();
      return data.items;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function load(next = period) {
    period = next;
    tabs.forEach(tab => {
      const active = tab.dataset.period === period;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', 'leaderboard-' + period);
    if (!expanded || renderedPeriod === next) return;
    panel.setAttribute('aria-busy', 'true');
    list.replaceChildren();
    renderedPeriod = null;
    status.textContent = 'Đang tải bảng xếp hạng…';
    if (!requests.has(next)) {
      requests.set(next, fetchPeriod(next).catch(error => {
        requests.delete(next);
        throw error;
      }));
    }
    try {
      const items = await requests.get(next);
      if (!expanded || period !== next || renderedPeriod === next) return;
      render(items);
      renderedPeriod = next;
      status.textContent = items.length ? '' : 'Chưa có lượt donate trong thời gian này.';
    } catch {
      if (expanded && period === next) status.textContent = 'Chưa tải được bảng xếp hạng. Bấm tab để thử lại.';
    } finally {
      if (expanded && period === next) panel.setAttribute('aria-busy', 'false');
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => load(tab.dataset.period));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') target = tabs[(index + tabs.length - 1) % tabs.length];
      if (event.key === 'Home') target = tabs[0];
      if (event.key === 'End') target = tabs[tabs.length - 1];
      if (!target) return;
      event.preventDefault();
      target.focus();
      load(target.dataset.period);
    });
  });
  toggle.addEventListener('click', () => {
    expanded = !expanded;
    panel.hidden = !expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Thu gọn' : 'Hiển thị';
    if (expanded) load();
  });
})();
