(function () {
  'use strict';
  const form = document.getElementById('donationSettingsForm');
  const iframe = document.getElementById('musicPositionPreview');
  if (!form || !iframe) return;
  const fields = ['music_x','music_y','music_width','music_height','music_opacity'];
  function send() {
    const layout = Object.fromEntries(fields.map(key => [key,Number(form.elements.namedItem(key).value)]));
    iframe.contentWindow?.postMessage({type:'music:layout',layout},location.origin);
  }
  fields.forEach(key => form.elements.namedItem(key).addEventListener('input',send));
  iframe.addEventListener('load',send);
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== iframe.contentWindow) return;
    if (event.data?.type === 'music:ready') send();
    if (event.data?.type === 'music:changed') {
      for (const key of ['music_x','music_y']) {
        if (Number.isFinite(event.data.layout?.[key])) form.elements.namedItem(key).value = event.data.layout[key];
      }
    }
  });
  form.closest('[data-tabs]').addEventListener('tabchange',send);
})();
