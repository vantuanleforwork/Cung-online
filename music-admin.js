(function () {
  'use strict';
  const volume = document.getElementById('donateSoundVolume');
  if (volume) {
    const output = document.getElementById('donateSoundVolumeValue');
    const preview = document.getElementById('donateSoundPreview');
    const sync = () => {
      output.value = volume.value + '%';
      if (preview) preview.volume = Number(volume.value) / 100;
    };
    volume.addEventListener('input', sync);
    sync();
  }
  const form = document.getElementById('donationSettingsForm');
  const iframe = document.getElementById('musicPositionPreview');
  if (!form || !iframe) return;
  const fields = ['music_x','music_y','music_width','music_height','music_opacity'];
  function send() {
    const layout = Object.fromEntries(fields.map(key => [key,Number(form.elements.namedItem(key).value)]));
    layout.music_idle_enabled = Number(form.elements.music_idle_enabled.checked);
    layout.music_enabled = Number(form.elements.music_enabled.checked);
    layout.music_idle_message = form.elements.music_idle_message.value;
    layout.music_preview_state = form.elements.music_preview_state.value;
    iframe.contentWindow?.postMessage({type:'music:layout',layout},location.origin);
  }
  fields.forEach(key => form.elements.namedItem(key).addEventListener('input',send));
  for (const key of ['music_idle_message','music_enabled','music_preview_state']) {
    form.elements.namedItem(key).addEventListener('input',send);
  }
  form.elements.music_idle_enabled.addEventListener('change',() => {
    form.elements.music_preview_state.value = form.elements.music_idle_enabled.checked ? 'idle' : 'playing';
    send();
  });
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
