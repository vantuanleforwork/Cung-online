(function () {
  'use strict';
  let loading = false;
  async function refreshTitles() {
    if (loading || document.hidden) return;
    loading = true;
    try {
      const response = await fetch('music-queue.php', {cache:'no-store'});
      if (!response.ok) return;
      const data = await response.json();
      for (const song of data.items) {
        const link = document.querySelector('[data-music-id="'+Number(song.id)+'"]');
        if (link && song.title) link.textContent = song.title;
      }
    } catch (error) { /* Keep the current queue visible while offline. */ }
    finally { loading = false; }
  }
  setInterval(refreshTitles, 10000);
  refreshTitles();
})();
