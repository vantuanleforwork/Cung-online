// Deterministic iframe API double. It never contacts YouTube or plays audio.
window.testPlayers = [];
window.YT = {
  PlayerState: {UNSTARTED:-1, ENDED:0, PLAYING:1, PAUSED:2, BUFFERING:3, CUED:5},
  Player: class {
    constructor(target, options) {
      this.options = options; this.position = 0; this.state = -1; this.volume = 0;
      this.frame = document.createElement('iframe');
      this.frame.srcdoc = '<body style="margin:0;background:#101b2a;color:#c5f467;display:grid;place-items:center;height:100vh;font:18px sans-serif">▶ YouTube API test</body>';
      target.replaceWith(this.frame); window.testPlayers.push(this);
      setTimeout(() => options.events.onReady({target:this}), 20);
    }
    getIframe() { return this.frame; }
    setVolume(value) { this.volume = value; }
    getCurrentTime() { return this.position + (this.state === 1 ? (performance.now()-this.started)/1000 : 0); }
    getPlayerState() { return this.state; }
    getVideoData() { return {title:'Bài nhạc kiểm thử '+this.videoId}; }
    loadVideoById(video) { this.videoId = video.videoId; this.position = video.startSeconds; this.playVideo(); }
    cueVideoById(video) { this.videoId = video.videoId; this.position = video.startSeconds; this.state = 5; }
    playVideo() { if (this.state !== 1) { this.started = performance.now(); this.state = 1; this.options.events.onStateChange({data:1,target:this}); } }
    pauseVideo() { this.position = this.getCurrentTime(); this.state = 2; }
    destroy() { this.pauseVideo(); this.frame.remove(); this.destroyed = true; }
  }
};
