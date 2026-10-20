type RecoveryOptions = {
  onRecovering: () => void;
  onRecovered: () => void;
  onFailure: () => void;
  stallMs?: number;
  retryDelayMs?: number;
  maxRetries?: number;
};

const pendingPlayers = new WeakMap<HTMLAudioElement, () => void>();

// A different preview must not be interrupted by a previous player's retry.
export function cancelMediaRecovery(audio: HTMLAudioElement) {
  pendingPlayers.get(audio)?.();
}

// Reconnect an interrupted HTTP recording on the same media element. Keeping
// the element also preserves its Web Audio graph, EQ, volume and playback rate.
export function attachMediaRecovery(audio: HTMLAudioElement, options: RecoveryOptions) {
  const stallMs = options.stallMs ?? 6000;
  const retryDelayMs = options.retryDelayMs ?? 300;
  const maxRetries = options.maxRetries ?? 3;
  let source = audio.src, retries = 0, wantedPlayback = !audio.paused;
  let recovering = false, disposed = false, exhausted = false;
  let playbackRate = audio.playbackRate, volume = audio.volume, muted = audio.muted;
  let position = 0, timer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let restore: (() => void) | undefined;
  const listeners: [string, EventListener][] = [];
  const listen = (name: string, callback: () => void) => {
    audio.addEventListener(name, callback); listeners.push([name, callback]);
  };
  function clearWatchdog() { clearTimeout(timer); timer = undefined; }
  function clearRestore() {
    if (restore) audio.removeEventListener('loadedmetadata', restore);
    restore = undefined;
  }
  function supported() {
    try { const url = new URL(audio.src); return /^https?:$/.test(url.protocol) && url.pathname.includes('/api/listening-audio/'); }
    catch { return false; }
  }
  function watch() {
    clearWatchdog();
    if (!disposed && !exhausted && supported() && (recovering || wantedPlayback && !audio.paused)) {
      timer = setTimeout(() => { timer = undefined; reconnect(); }, stallMs);
    }
  }
  function complete() {
    if (!recovering) return;
    recovering = false; clearWatchdog(); clearRestore(); options.onRecovered();
  }
  function reconnect() {
    if (disposed || exhausted || !supported()) return false;
    if (retryTimer !== undefined) return true;
    clearWatchdog(); clearRestore();
    if (retries >= maxRetries) {
      recovering = false; exhausted = true; options.onFailure(); return false;
    }
    retries++;
    if (!recovering) {
      if (Number.isFinite(audio.currentTime)) position = audio.currentTime;
      playbackRate = audio.playbackRate; volume = audio.volume; muted = audio.muted;
    }
    recovering = true; options.onRecovering();
    const expectedSource = audio.src;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      if (disposed || audio.src !== expectedSource) return;
      restore = () => {
        clearRestore();
        if (disposed || audio.src !== expectedSource) return;
        audio.currentTime = Number.isFinite(audio.duration) ? Math.min(position, Math.max(0, audio.duration - .01)) : position;
        if (wantedPlayback) {
          void audio.play().catch(error => {
            if (disposed || audio.src !== expectedSource) return;
            if (error.name === 'NotAllowedError') { wantedPlayback = false; complete(); }
            else watch();
          });
        } else if (!audio.seeking) complete();
      };
      audio.addEventListener('loadedmetadata', restore);
      audio.load();
      audio.playbackRate = playbackRate; audio.volume = volume; audio.muted = muted;
      watch();
    }, retryDelayMs * retries);
    return true;
  }
  listen('play', () => { wantedPlayback = true; });
  listen('pause', () => { if (!recovering && !audio.error) { wantedPlayback = false; clearWatchdog(); } });
  listen('seeking', () => { if (!recovering && Number.isFinite(audio.currentTime)) position = audio.currentTime; watch(); });
  listen('seeked', () => { if (recovering && !wantedPlayback) complete(); });
  listen('waiting', watch);
  listen('stalled', watch);
  listen('playing', () => { clearWatchdog(); complete(); });
  listen('timeupdate', () => {
    if (!recovering && Number.isFinite(audio.currentTime)) position = audio.currentTime;
    if (!audio.paused && !audio.seeking && audio.readyState >= 3) { clearWatchdog(); complete(); }
  });
  listen('ended', () => { wantedPlayback = false; clearWatchdog(); });
  listen('loadstart', () => {
    if (audio.src === source) return;
    source = audio.src; retries = 0; exhausted = false; recovering = false;
    position = 0; wantedPlayback = !audio.paused;
    clearWatchdog(); clearRestore(); clearTimeout(retryTimer); retryTimer = undefined;
  });
  pendingPlayers.set(audio, () => { wantedPlayback = false; });
  return {
    retry() {
      if (audio.error?.code !== 2 || !supported()) return false;
      exhausted = false; retries = 0; wantedPlayback = true;
      return reconnect();
    },
    handleError() {
      // Format/decoder failures and files from the listener's device retain the
      // normal error UI. Only an interrupted pool download is retried.
      return audio.error?.code === 2 && reconnect();
    },
    dispose() {
      pendingPlayers.delete(audio);
      disposed = true; clearWatchdog(); clearRestore(); clearTimeout(retryTimer);
      for (const [name, callback] of listeners) audio.removeEventListener(name, callback);
    },
  };
}
