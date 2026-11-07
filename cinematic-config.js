/* Both clips include their own synchronized Veo soundtracks. */
(function (global) {
  'use strict';
  global.CungCinema.configure({
    2: { src: 'assets/cinematic-v026/rong.mp4?v=26', seconds: 4.757, audio: 'embedded', blueScreen: true },
    3: { src: 'assets/cinematic-v026/gai.mp4?v=26', seconds: 9.963, audio: 'embedded', blueScreen: true }
  });
  const params = new URLSearchParams(global.location.search);
  if (params.get('editor') === '1') return;
  const tiers = params.get('preview') === '1' ? [Number(params.get('tier'))] : [2, 3];
  for (const tier of tiers) {
    if (global.CungCinema.has(tier)) {
      global.CungCinema.prepare(tier).catch(error => console.warn('Video preload:', error.message));
    }
  }
})(globalThis);
