'use strict';
globalThis.CungRoulette = (() => {
  const turn = Math.PI * 2;
  const ease = value => 1 - (1 - value) ** 3;
  const mix = (from, to, progress) => from + (to - from) * progress;

  function draw(context, count, winner, elapsed, finished) {
    const step = turn / count;
    const final = (winner + .5) * step;
    const fake = count > 1 ? final - step : final;
    const progress = Math.min(elapsed / 5200, 1);
    const wheel = -turn * .85 * ease(progress);
    const approach = Math.min(elapsed / 4100, 1);
    const bounce = Math.max(0, (elapsed - 4400) / 800);
    const angle = wheel + (elapsed < 4400
      ? mix(fake - turn * 5, fake, ease(approach))
      : mix(fake, final, ease(Math.min(1, bounce))));
    const radius = elapsed < 4400 ? mix(232, 172, ease(approach)) : 172;
    const lift = bounce > 0 && bounce < 1 ? 32 * Math.sin(Math.PI * bounce) : 0;
    context.clearRect(0, 0, 640, 420);
    context.save();
    context.translate(320, 196);
    context.scale(1, .68);
    function disc(y, size, color) {
      context.beginPath();
      context.arc(0, y, size, 0, turn);
      context.fillStyle = color;
      context.fill();
    }
    disc(26, 259, '#080b13');
    disc(0, 259, '#60778d');
    disc(0, 251, '#0d1828');
    for (let index = 0; index < count; index++) {
      const start = wheel + step * index;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, 213, start, start + step);
      context.closePath();
      context.fillStyle = finished && index === winner ? '#d5f66e' : index % 2 ? '#2e5472' : '#192d43';
      context.fill();
      context.strokeStyle = '#8296aa';
      context.stroke();
      context.fillStyle = finished && index === winner ? '#090f19' : '#ffffff';
      context.font = 'bold 23px system-ui';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(index + 1, 192 * Math.cos(start + step / 2), 192 * Math.sin(start + step / 2));
    }
    disc(0, 131, '#0f1d2b');
    disc(0, 112, '#243b52');
    disc(0, 82, '#142438');
    disc(0, 27, '#adc955');
    context.restore();
    const x = 320 + radius * Math.cos(angle);
    const y = 196 + radius * Math.sin(angle) * .68;
    context.beginPath();
    context.ellipse(x + 4, y + 4, 16, 8, 0, 0, turn);
    context.fillStyle = '#03060b99';
    context.fill();
    const ball = context.createRadialGradient(x - 5, y - lift - 7, 1, x, y - lift, 16);
    ball.addColorStop(0, '#ffffff');
    ball.addColorStop(.5, '#e7efff');
    ball.addColorStop(1, '#577089');
    context.beginPath();
    context.arc(x, y - lift - 3, 15, 0, turn);
    context.fillStyle = ball;
    context.fill();
  }

  async function play(spin, signal, onReveal) {
    const overlay = document.getElementById('rouletteOverlay');
    const context = overlay.querySelector('canvas').getContext('2d');
    const result = overlay.querySelector('.roulette-result');
    const items = spin.options.map(label => {
      const item = document.createElement('li');
      item.textContent = label;
      return item;
    });
    overlay.querySelector('h2').textContent = spin.name;
    overlay.querySelector('ol').replaceChildren(...items);
    result.textContent = 'Đang quay…';
    overlay.hidden = false;
    let frame;
    try {
      const reduced = !document.body.classList.contains('force-motion') && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (context && !reduced) {
        await new Promise(resolve => {
          const start = performance.now();
          function stop() {
            cancelAnimationFrame(frame);
            signal.removeEventListener('abort', stop);
            resolve();
          }
          function tick(now) {
            const elapsed = Math.min(now - start, 5200);
            draw(context, items.length, spin.winner, elapsed, false);
            if (elapsed < 5200) frame = requestAnimationFrame(tick);
            else stop();
          }
          if (signal.aborted) stop();
          else {
            signal.addEventListener('abort', stop, {once: true});
            frame = requestAnimationFrame(tick);
          }
        });
      }
      if (signal.aborted) return;
      if (context) draw(context, items.length, spin.winner, 5200, true);
      items[spin.winner].classList.add('is-winner');
      result.textContent = 'Ô trúng · ' + spin.options[spin.winner];
      await Promise.all([sleep(4200, signal), onReveal?.()]);
    } finally {
      cancelAnimationFrame(frame);
      overlay.hidden = true;
    }
  }
  return {play};
})();
