'use strict';
globalThis.CungRoulette = (() => {
  const turn = Math.PI * 2;
  const ease = value => 1 - (1 - value) ** 3;
  const mix = (from, to, progress) => from + (to - from) * progress;

  const spinDuration = 6800;
  const center = {x:320, y:188, tilt:.70};

  function motion(count, winner, elapsed) {
    const step = turn / count;
    const final = (winner + .5) * step;
    const fake = count > 1 ? final - step : final;
    const wheel = -turn * 1.12 * ease(elapsed / spinDuration);
    const approach = Math.min(elapsed / 5550, 1);
    const settle = Math.max(0, Math.min(1, (elapsed - 5900) / 900));
    const relative = settle > 0 ? mix(fake, final, ease(settle)) : mix(fake - turn * 6, fake, ease(approach));
    const radius = mix(234, 179, ease(Math.max(0, (approach - .52) / .48)));
    const lift = settle > 0 && settle < 1
      ? 23 * Math.sin(Math.PI * settle)
      : 5 * Math.abs(Math.sin(relative * count / 2)) * approach;
    return {step, wheel, relative, radius, lift: elapsed === spinDuration ? 0 : lift};
  }

  function gradient(context, y, radius, colors) {
    const paint = context.createLinearGradient(0, y - radius, 0, y + radius);
    colors.forEach(([at, color]) => paint.addColorStop(at, color));
    return paint;
  }

  function draw(context, count, winner, position, finished) {
    const {step, wheel, relative, radius, lift} = position;
    context.clearRect(0, 0, 640, 420);
    context.save();
    context.translate(center.x, center.y);
    context.scale(1, center.tilt);
    function disc(y, size, color) {
      context.beginPath();
      context.arc(0, y, size, 0, turn);
      context.fillStyle = color;
      context.fill();
    }
    const rim = gradient(context, 0, 261, [[0,'#f8e4b0'],[.19,'#93774d'],[.49,'#393e44'],[.78,'#c6ac77'],[1,'#59442e']]);
    const track = gradient(context, 0, 243, [[0,'#32495a'],[.38,'#101a26'],[.7,'#1d3041'],[1,'#080e18']]);
    disc(31, 263, gradient(context, 31, 263, [[0,'#232832'],[.52,'#3d3128'],[.89,'#171419'],[1,'#08090e']]));
    disc(0, 263, rim);
    disc(0, 257, '#111a23');
    disc(0, 252, rim);
    disc(0, 243, track);
    disc(0, 219, '#9e855d');
    disc(0, 215, '#111722');
    const pocketColors = [
      gradient(context, 0, 212, [[0,'#496078'],[.50,'#24394c'],[1,'#102030']]),
      gradient(context, 0, 212, [[0,'#65434d'],[.50,'#402d3b'],[1,'#2b1e2c']])
    ];
    const winningPaint = gradient(context, 0, 212, [[0,'#eaffab'],[.52,'#c9f46b'],[1,'#a4d645']]);
    for (let index = 0; index < count; index++) {
      const start = wheel + step * index;
      const middle = start + step / 2;
      const winning = finished && index === winner;
      context.beginPath();
      context.arc(0, 0, 212, start, start + step);
      context.arc(0, 0, 133, start + step, start, true);
      context.closePath();
      context.fillStyle = winning ? winningPaint : pocketColors[index % 2];
      context.fill();
      context.strokeStyle = '#111923';
      context.lineWidth = 2;
      context.stroke();
      context.beginPath();
      context.moveTo(136 * Math.cos(start), 136 * Math.sin(start));
      context.lineTo(209 * Math.cos(start), 209 * Math.sin(start));
      context.strokeStyle = '#b49a70';
      context.lineWidth = 2.5;
      context.stroke();
      context.fillStyle = winning ? '#101923' : '#f5f2e6';
      context.font = '700 23px system-ui';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(index + 1, 195 * Math.cos(middle), 195 * Math.sin(middle));
    }
    disc(0, 133, rim);
    const bowl = context.createRadialGradient(-30, -30, 12, 0, 0, 129);
    bowl.addColorStop(0,'#52616c');
    bowl.addColorStop(.5,'#2b3c4a');
    bowl.addColorStop(1,'#101b27');
    disc(0, 129, bowl);
    disc(0, 63, rim);
    disc(0, 58, '#1a2632');
    context.rotate(wheel);
    context.fillStyle = rim;
    for (let spoke = 0; spoke < 3; spoke++) {
      context.rotate(turn / 3);
      context.fillRect(0, -3, 57, 6);
    }
    disc(7, 28, '#302820');
    disc(0, 28, rim);
    disc(0, 20, gradient(context, 0, 20, [[0,'#fff2c8'],[.55,'#c6a66b'],[1,'#6a5033']]));
    context.restore();
    const angle = wheel + relative;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle) * center.tilt;
    const size = 13 + 2 * Math.sin(angle);
    context.beginPath();
    context.ellipse(x + 4, y + 3, size + 2, 6, 0, 0, turn);
    context.fillStyle = '#03060b9c';
    context.fill();
    const ball = context.createRadialGradient(x - 5, y - lift - 8, 1, x, y - lift - 2, size);
    ball.addColorStop(0, '#ffffff');
    ball.addColorStop(.38, '#f1f5f8');
    ball.addColorStop(.72, '#adbec8');
    ball.addColorStop(1, '#4f6475');
    context.beginPath();
    context.arc(x, y - lift - 2, size, 0, turn);
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
    result.classList.remove('is-revealed');
    overlay.hidden = false;
    let frame;
    try {
      const reduced = !document.body.classList.contains('force-motion') && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (context && !reduced) {
        globalThis.CungSFX?.rouletteStart?.();
        await new Promise(resolve => {
          const start = performance.now();
          let previousPocket, lastClick = -Infinity;
          function stop() {
            cancelAnimationFrame(frame);
            signal.removeEventListener('abort', stop);
            resolve();
          }
          function tick(now) {
            const elapsed = Math.max(0, Math.min(now - start, spinDuration));
            const position = motion(items.length, spin.winner, elapsed);
            const pocket = Math.floor(position.relative / position.step);
            if (previousPocket !== undefined && previousPocket !== pocket && elapsed - lastClick >= 30) {
              globalThis.CungSFX?.rouletteClick?.(elapsed > 5900);
              lastClick = elapsed;
            }
            previousPocket = pocket;
            draw(context, items.length, spin.winner, position, false);
            if (elapsed < spinDuration) frame = requestAnimationFrame(tick);
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
      if (context) draw(context, items.length, spin.winner, motion(items.length, spin.winner, spinDuration), true);
      items[spin.winner].classList.add('is-winner');
      result.textContent = 'Ô trúng · ' + spin.options[spin.winner];
      result.classList.add('is-revealed');
      await Promise.all([sleep(4200, signal), onReveal?.()]);
    } finally {
      cancelAnimationFrame(frame);
      overlay.hidden = true;
    }
  }
  return {play};
})();
