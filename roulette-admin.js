'use strict';
const roulettePercent = new Intl.NumberFormat('vi-VN', {style: 'percent', maximumFractionDigits: 2});
document.querySelectorAll('[data-roulette-editor]').forEach(form => {
  const rows = form.querySelector('[data-roulette-rows]');
  const add = form.querySelector('[data-roulette-add]');
  const template = form.querySelector('[data-roulette-template]');

  function refresh() {
    const options = [...rows.children];
    const frequencies = options.map(row => row.querySelector('[name="option_frequency[]"]'));
    const sum = frequencies.reduce((total, input) => total + (input.valueAsNumber || 0), 0);
    options.forEach((row, index) => {
      const number = index + 1;
      row.querySelector('[name="option_label[]"]').setAttribute('aria-label', 'Tên kết quả ' + number);
      frequencies[index].setAttribute('aria-label', 'Tần suất kết quả ' + number);
      frequencies[index].setCustomValidity(index === 0 && sum === 0 ? 'Ít nhất một ô phải có tần suất lớn hơn 0.' : '');
      row.querySelector('[data-roulette-percent]').textContent = roulettePercent.format(sum ? (frequencies[index].valueAsNumber || 0) / sum : 0);
      const remove = row.querySelector('[data-roulette-remove]');
      remove.setAttribute('aria-label', 'Xóa kết quả ' + number);
      remove.disabled = options.length === 1;
    });
    add.disabled = options.length >= 16;
  }

  add.addEventListener('click', () => {
    rows.append(template.content.cloneNode(true));
    refresh();
    rows.lastElementChild.querySelector('input').focus();
  });
  rows.addEventListener('input', event => {
    if (event.target.name === 'option_frequency[]') refresh();
  });
  rows.addEventListener('click', event => {
    const remove = event.target.closest('[data-roulette-remove]');
    if (!remove || rows.children.length < 2) return;
    const row = remove.closest('[data-roulette-row]');
    const next = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    refresh();
    next.querySelector('input').focus();
  });
  refresh();
});
