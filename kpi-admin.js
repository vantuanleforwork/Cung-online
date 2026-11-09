(() => {
  const list = document.getElementById('kpiStageList');
  if (!list) return;
  const count = document.getElementById('kpiSettings').elements.stage_count;
  let dragging = null;

  function updateLabels() {
    [...list.children].forEach((item, index) => {
      const position = index + 1;
      item.querySelector('[data-kpi-stage-label]').textContent =
        position <= Number(count.value) ? `Mốc ${position * 100 / Number(count.value)}%` : 'Dự phòng';
    });
  }

  count.addEventListener('change', updateLabels);
  list.addEventListener('dragstart', event => {
    if (!event.target.matches('[data-kpi-drag]')) return;
    dragging = event.target.closest('li');
    event.dataTransfer.setData('text/plain', dragging.querySelector('input[type=hidden]').value);
    event.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragend', () => { dragging = null; });
  list.addEventListener('dragover', event => {
    if (dragging && event.target.closest('li')) event.preventDefault();
  });
  list.addEventListener('drop', event => {
    const target = event.target.closest('li');
    if (!dragging || !target || target === dragging) return;
    event.preventDefault();
    const items = [...list.children];
    list.insertBefore(dragging, items.indexOf(dragging) < items.indexOf(target) ? target.nextElementSibling : target);
    updateLabels();
  });
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-kpi-move]');
    if (!button) return;
    const row = button.closest('li');
    const down = button.dataset.kpiMove === '1';
    const other = down ? row.nextElementSibling : row.previousElementSibling;
    if (!other) return;
    list.insertBefore(row, down ? other.nextElementSibling : other);
    button.focus();
    updateLabels();
  });
  document.getElementById('resetKpiForm').addEventListener('submit', event => {
    if (!confirm('Đưa tiến độ KPI về 0đ và giữ mục tiêu cùng ảnh đã lưu?')) event.preventDefault();
  });
  updateLabels();
})();
