(function (global) {
  'use strict';
  function progress(position, duration, maximum) {
    const cap = Number.isFinite(Number(maximum)) && Number(maximum)>0 ? Number(maximum) : 180;
    const length = Number(duration);
    const total = Number.isFinite(length) && length>0 ? Math.min(length,cap) : cap;
    const elapsed = Math.max(0,Math.min(total,Number(position)||0));
    const remaining = Math.max(0,total-elapsed);
    return {elapsed,total,remaining,percent:Math.min(100,Math.floor(elapsed/total*100)),showNext:remaining<=30};
  }
  global.CungMusicProgress = progress;
  if (typeof module !== 'undefined') module.exports = progress;
})(globalThis);
