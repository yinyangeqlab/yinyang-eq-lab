const waveform = [0.961, 0.867, 0.691, 0.585, 0.506, 0.442, 0.383, 0.246, 0.14, 0.112, 0.381, 0.086, 0.059, 0.048, 0.208, 0.666, 0.689, 0.612, 0.483, 0.224, 0.844, 0.614, 0.514, 0.47, 0.425, 0.385, 0.199, 0.537, 0.64, 0.426, 0.511, 0.233, 0.192, 0.149, 0.429, 0.619, 0.562, 0.481, 0.169, 0.052, 0.811, 0.861, 0.685, 0.592, 0.504, 0.447, 0.381, 0.236, 0.153, 0.119, 0.372, 0.09, 0.06, 0.049, 0.202, 0.638, 0.692, 0.65, 0.479, 0.226, 0.927, 0.609, 0.525, 0.471, 0.424, 0.386, 0.198, 0.531, 0.649, 0.427, 0.518, 0.242, 0.202, 0.154, 0.402, 0.57, 0.511, 0.432, 0.156, 0.055, 1.0, 0.809, 0.655, 0.589, 0.499, 0.435, 0.373, 0.229, 0.146, 0.124, 0.357, 0.097, 0.061, 0.052, 0.201, 0.65, 0.69, 0.611, 0.468, 0.229, 0.665, 0.625, 0.523, 0.47, 0.414, 0.385, 0.2, 0.519, 0.649, 0.424, 0.487, 0.261, 0.187, 0.151, 0.43, 0.616, 0.545, 0.465, 0.168, 0.056, 0.971, 0.851, 0.693, 0.574, 0.476, 0.44, 0.369, 0.237, 0.143, 0.119, 0.369, 0.086, 0.056, 0.048, 0.194, 0.633, 0.697, 0.602, 0.473, 0.239, 0.982, 0.623, 0.54, 0.473, 0.423, 0.391, 0.2, 0.518, 0.647, 0.42, 0.499, 0.255, 0.175, 0.144, 0.418, 0.606, 0.562, 0.459, 0.167, 0.051];

/** Mount one listening desk and release its audio on route changes. */
export function mountSample(root) {
  const listeners = new AbortController();
  const sides = ['A', 'B'];
  const buttons = [...root.querySelectorAll('[data-side]')];
  const waveformColors = Object.fromEntries(buttons.map(button => [button.dataset.side, getComputedStyle(button).backgroundColor]));
  const transport = root.querySelector('#transport');
  const seek = root.querySelector('#seek');
  const canvas = root.querySelector('#sample .rail canvas');
  const clock = root.querySelector('#clock');
  const status = root.querySelector('#sample-status');
  const length = 12;
  let selected = null;
  let context, output, decoded, startedAt = 0, offset = 0, ticket = 0, frame = 0;
  let voices = [];
  let pending = false;
  const active = () => voices.length > 0;
  const current = () => active() ? (offset + context.currentTime - startedAt) % length : offset;

  function renderControls(errorMessage) {
    const label = active() ? 'Pause sample' : pending ? 'Cancel loading' : 'Play sample';
    transport.setAttribute('aria-label', label);
    transport.title = label;
    transport.toggleAttribute('data-playing', active());
    for (const button of buttons) {
      const chosen = selected === button.dataset.side;
      button.setAttribute('aria-pressed', String(chosen));
    }
    status.classList.toggle('sr-only', !errorMessage);
    status.textContent = errorMessage ?? (active() ? 'Playing Sound ' + selected + '.'
      : pending ? 'Loading preview.' : selected ? 'Preview paused.' : '');
  }
  function paint() {
    const t = current();
    const seconds = Math.floor(t);
    const label = '0:' + String(seconds).padStart(2, '0');
    if (clock.textContent !== label) clock.textContent = label;
    seek.value = String(t);
    seek.setAttribute('aria-valuetext', seconds + ' of 12 seconds');
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * ratio), h = Math.round(canvas.clientHeight * ratio);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, w, h);
    const step = w / waveform.length;
    const accent = waveformColors[selected ?? 'A'];
    waveform.forEach((peak, i) => {
      const bar = Math.max(2 * ratio, peak * h * .92);
      g.fillStyle = i / waveform.length < t / length ? accent : '#82a2ab';
      g.fillRect(i * step, (h - bar) / 2, Math.max(1, step * .66), bar);
    });
    g.fillStyle = '#effaf7';
    g.fillRect(Math.min(w - 2 * ratio, w * t / length), 0, 2 * ratio, h);
  }
  function tick() {
    paint();
    if (active()) frame = requestAnimationFrame(tick);
  }
  function load() {
    if (!decoded) {
      decoded = Promise.all(sides.map(async side => {
        const response = await fetch('/sample-assets/' + side.toLowerCase() + '.flac', {signal: listeners.signal});
        if (!response.ok) throw Error('Sample unavailable');
        return context.decodeAudioData(await response.arrayBuffer());
      })).catch(error => { decoded = null; throw error; });
    }
    return decoded;
  }
  function stopVoices() {
    if (!active()) return;
    offset = current();
    const now = context.currentTime;
    for (const { source, gain } of voices) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, .003);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      source.stop(now + .024);
    }
    voices = [];
    cancelAnimationFrame(frame);
  }
  function pause() {
    ticket++;
    pending = false;
    stopVoices();
    renderControls();
    paint();
  }
  async function play() {
    if (pending || active()) return;
    const request = ++ticket;
    pending = true;
    selected ??= 'A';
    renderControls();
    try {
      context ??= new AudioContext();
      if (!output) {
        output = context.createGain();
        output.gain.value = .48;
        output.connect(context.destination);
      }
      const [, buffers] = await Promise.all([context.resume(), load()]);
      if (request !== ticket) return;
      startedAt = context.currentTime;
      voices = buffers.map((buffer, i) => {
        const source = context.createBufferSource(), gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        source.loopEnd = length;
        gain.gain.value = 0;
        gain.gain.setTargetAtTime(sides[i] === selected ? 1 : 0, startedAt, .004);
        source.connect(gain); gain.connect(output);
        source.start(startedAt, offset);
        return { source, gain };
      });
      pending = false;
      renderControls(); tick();
    } catch {
      if (request !== ticket) return;
      pause();
      renderControls('The preview couldn’t play. Select either sound to try again.');
    }
  }
  function choose(side) {
    selected = side;
    if (pending) { renderControls(); return; }
    if (!active()) { void play(); return; }
    voices.forEach(({gain}, i) => {
      gain.gain.setTargetAtTime(sides[i] === side ? 1 : 0, context.currentTime, .013);
    });
    renderControls(); paint();
  }
  function seekTo(t) {
    const resume = active() || pending;
    pause();
    offset = Math.max(0, Math.min(length - .01, t));
    paint();
    if (resume) void play();
  }
  const options = {signal: listeners.signal};
  buttons.forEach(button => button.addEventListener('click', () => choose(button.dataset.side), options));
  transport.addEventListener('click', () => active() || pending ? pause() : void play(), options);
  seek.addEventListener('input', () => seekTo(Number(seek.value)), options);
  seek.addEventListener('keydown', event => {
    if (['ArrowRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft'].includes(event.key)) {
      event.preventDefault();
      seekTo(current() + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1));
    }
  }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, options);
  window.addEventListener('pagehide', pause, options);
  const size = new ResizeObserver(paint);
  size.observe(canvas);
  return () => {
    listeners.abort();
    size.disconnect();
    pause();
    if (context && context.state !== 'closed') void context.close();
  };
}
