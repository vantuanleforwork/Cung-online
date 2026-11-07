/* Video intros for the full 1920 x 1080 OBS frame. */
(function (global) {
'use strict';

function shortIntro(ms, signal, canvas) {
  canvas.style.opacity = '0';
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Lease lost', 'AbortError'));
      return;
    }
    function finish() {
      signal?.removeEventListener('abort', cancel);
      resolve();
    }
    function cancel() {
      clearTimeout(timer);
      reject(new DOMException('Lease lost', 'AbortError'));
    }
    const timer = setTimeout(finish, ms);
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

async function run(tier, ms, signal, canvas) {
  if (ms < 600) return shortIntro(ms, signal, canvas);
  return global.CungCinema.run(tier, canvas, signal);
}

global.CungFX = { run };
if (typeof module !== 'undefined') module.exports = global.CungFX;

if (global.document && typeof global.playTierIntro === 'function') {
  global.playTierIntro = async function (donation, signal) {
    const tier = Math.max(1, Math.min(3, Number(donation.tier) || 1));
    const intro = document.getElementById('tierIntro');
    const canvas = document.getElementById('fxCanvas');
    intro.hidden = true;
    intro.className = 'tier-intro';
    if (tier < 2 || !canvas) return;

    const reduced = !document.body.classList.contains('force-motion') &&
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return shortIntro(120, signal, canvas);

    intro.hidden = false;
    intro.className = 'tier-intro tier-' + tier + ' cinematic-intro';
    try {
      await run(tier, 8000, signal, canvas);
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error('Cinematic intro unavailable:', error);
      if (document.body.classList.contains('preview') && typeof global.notice === 'function') {
        global.notice('Không tải được video hiệu ứng. Kiểm tra đã upload đầy đủ thư mục assets/cinematic-v024.');
      }
    } finally {
      intro.hidden = true;
      intro.className = 'tier-intro';
    }
  };
}
})(globalThis);
