(function () {
  'use strict';
  const chart = document.querySelector('.revenue-chart');
  if (!chart) return;
  const tooltip = document.getElementById('revenueChartTooltip');
  const bars = [...chart.querySelectorAll('.revenue-chart-bar')];
  function hide() { tooltip.hidden = true; }
  function show(bar) {
    tooltip.replaceChildren();
    const date = document.createElement('span'); date.textContent = bar.dataset.label;
    const amount = document.createElement('strong'); amount.textContent = Number(bar.dataset.amount).toLocaleString('vi-VN')+'đ';
    const count = document.createElement('small'); count.textContent = bar.dataset.count+' lượt donate';
    tooltip.append(date,amount,count); tooltip.hidden = false;
    const rect = bar.getBoundingClientRect();
    const size = tooltip.getBoundingClientRect();
    const left = Math.max(8,Math.min(innerWidth-size.width-8,rect.left+rect.width/2-size.width/2));
    const top = Math.max(8,Math.min(innerHeight-size.height-8,rect.top-size.height-10));
    tooltip.style.left = left+'px'; tooltip.style.top = top+'px';
  }
  bars.forEach((bar,index) => {
    bar.addEventListener('pointerenter',()=>show(bar));
    bar.addEventListener('pointerleave',hide);
    bar.addEventListener('focus',()=>show(bar));
    bar.addEventListener('blur',hide);
    bar.addEventListener('click',()=>show(bar));
    bar.addEventListener('keydown',event => {
      let target;
      if (event.key==='ArrowRight') target=bars[Math.min(bars.length-1,index+1)];
      if (event.key==='ArrowLeft') target=bars[Math.max(0,index-1)];
      if (event.key==='Home') target=bars[0];
      if (event.key==='End') target=bars[bars.length-1];
      if (event.key==='Escape') hide();
      if (!target) return;
      event.preventDefault(); target.focus();
    });
  });
  document.querySelector('.revenue-chart-scroll').addEventListener('scroll',hide,{passive:true});
  window.addEventListener('scroll',hide,{passive:true});
  window.addEventListener('resize',hide);
  const from = document.querySelector('[name=from]');
  const to = document.querySelector('[name=to]');
  if (from && to) from.addEventListener('change',()=>{ to.min=from.value||'2000-01-01'; });
})();
