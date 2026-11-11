(() => {
  const widget = document.querySelector('[data-daily-kpi]');
  if (!widget) return;
  const overlay = document.body.classList.contains('kpi-overlay');
  widget.innerHTML = `
    <img class="daily-kpi-character" alt="Nhân vật KPI" width="1024" height="1536" decoding="async">
    <div class="daily-kpi-panel">
      <div class="daily-kpi-heading"><h2>KPI donate</h2><strong data-kpi-percent></strong></div>
      <p data-kpi-total></p>
      <progress max="100" aria-label="Tiến độ KPI donate"></progress>
      <ol aria-label="Các mốc KPI"></ol>
    </div>`;
  const image = widget.querySelector('img');
  const progress = widget.querySelector('progress');
  const percent = widget.querySelector('[data-kpi-percent]');
  const total = widget.querySelector('[data-kpi-total]');
  const marks = widget.querySelector('ol');
  const money = new Intl.NumberFormat('vi-VN');
  let lastImage = '', lastCount = 0, lastEvent = 0, hideTimer;
  if (overlay) {
    try { lastEvent = Number(sessionStorage.getItem('kpi-last-chime')) || 0; } catch {}
  }

  async function chime() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const close = setTimeout(() => context.close().catch(() => {}), 1800);
    try {
      await context.resume();
      [523.25, 659.25, 783.99, 1046.50].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.105;
        const note = context.createOscillator();
        const gain = context.createGain();
        note.type = 'sine';
        note.frequency.value = frequency;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.17, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.37);
        note.connect(gain).connect(context.destination);
        note.start(start);
        note.stop(start + 0.38);
      });
    } catch {
      clearTimeout(close);
      context.close().catch(() => {});
    }
  }

  async function refresh() {
    try {
      const response = await fetch('kpi.php', {cache:'no-store'});
      if (!response.ok) return;
      const data = await response.json();
      clearTimeout(hideTimer);
      widget.hidden = overlay && data.remaining <= 0;
      if (widget.hidden) return;
      if (data.image !== lastImage) {
        lastImage = data.image;
        image.src = data.image;
      }
      if (data.stage_count !== lastCount) {
        lastCount = data.stage_count;
        marks.style.setProperty('--kpi-count', String(lastCount));
        marks.replaceChildren(...Array.from({length:lastCount}, (_, index) => {
          const mark = document.createElement('li');
          mark.textContent = `${(index + 1) * 100 / lastCount}%`;
          return mark;
        }));
      }
      progress.value = data.percent;
      percent.textContent = data.percent + '%';
      if (!data.target) {
        total.textContent = 'Chưa đặt mục tiêu';
      } else {
        const remainingAmount = Math.max(data.target - data.total, 0);
        total.textContent = remainingAmount > 0
          ? `Còn thiếu ${money.format(remainingAmount)}đ để đạt KPI`
          : 'Đã đạt KPI';
      }
      [...marks.children].forEach((mark, index) => mark.classList.toggle('is-reached', index < data.stage));
      if (overlay) {
        hideTimer = setTimeout(() => { widget.hidden = true; }, data.remaining * 1000);
        if (data.event > lastEvent) {
          lastEvent = data.event;
          try { sessionStorage.setItem('kpi-last-chime', String(lastEvent)); } catch {}
          chime().catch(() => {});
        }
      }
    } catch {
      // Keep the last successful render during a temporary connection loss.
    } finally {
      setTimeout(refresh, overlay ? 2500 : 10000);
    }
  }
  refresh();
})();
