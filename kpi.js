(() => {
  const widget = document.querySelector('[data-daily-kpi]');
  if (!widget) return;
  widget.innerHTML = `
    <img class="daily-kpi-character" alt="Nhân vật KPI" width="1024" height="1536" decoding="async">
    <div class="daily-kpi-panel">
      <div class="daily-kpi-heading"><h2>KPI donate hôm nay</h2><strong data-kpi-percent></strong></div>
      <p data-kpi-total></p>
      <progress max="100" aria-label="Tiến độ KPI donate hôm nay"></progress>
      <ol aria-label="Các mốc KPI">
        <li data-kpi-mark="25">25%</li><li data-kpi-mark="50">50%</li>
        <li data-kpi-mark="75">75%</li><li data-kpi-mark="100">100%</li>
      </ol>
    </div>`;
  const image = widget.querySelector('img');
  const progress = widget.querySelector('progress');
  const percent = widget.querySelector('[data-kpi-percent]');
  const total = widget.querySelector('[data-kpi-total]');
  const marks = widget.querySelectorAll('[data-kpi-mark]');
  const money = new Intl.NumberFormat('vi-VN');
  let milestone = null;

  async function refresh() {
    try {
      const response = await fetch('kpi.php', {cache:'no-store'});
      if (!response.ok) return;
      const data = await response.json();
      widget.hidden = !data.target;
      if (widget.hidden) return;
      if (data.milestone !== milestone && [0,25,50,75,100].includes(data.milestone)) {
        milestone = data.milestone;
        image.src = `assets/kpi/mage-${milestone}.png`;
      }
      progress.value = data.percent;
      percent.textContent = data.percent + '%';
      total.textContent = `${money.format(data.total)}đ / ${money.format(data.target)}đ`;
      for (const mark of marks) mark.classList.toggle('is-reached', data.percent >= Number(mark.dataset.kpiMark));
    } catch {
      // Keep the last successful render during a temporary connection loss.
    } finally {
      setTimeout(refresh, 10000);
    }
  }
  refresh();
})();
