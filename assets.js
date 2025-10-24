// Lightweight asset loader exposed as global Assets for the page.
// - preloadSounds(): begins loading audio files (fails silently if files missing)
// - preloadBrandAssets(): best-effort image preloader that marks missing classes on <html>
// - playSound(name): non-blocking playback (clones audio nodes so overlap works)
// - toggleSound() / setSoundEnabled(flag) to update enabled state
(function () {
  const SOUND_FILES = {
    pop:  'sound/pop.mp3',
    bad:  'sound/bad.mp3',
    start:'sound/start.mp3',
    win:  'sound/win.mp3'
  };

  const sounds = {}; // key -> Audio or null
  let soundEnabled = true;

  function preloadSounds() {
    Object.keys(SOUND_FILES).forEach(key => {
      try {
        const audio = new Audio(SOUND_FILES[key]);
        audio.preload = 'auto';
        audio.volume = 0.9;
        audio.addEventListener('canplaythrough', () => { sounds[key] = audio; }, { once: true });
        audio.addEventListener('error', () => { sounds[key] = null; }, { once: true });
        audio.load();
        // keep a reference even before canplaythrough
        sounds[key] = audio;
      } catch (e) {
        sounds[key] = null;
      }
    });
  }

  function playSound(name) {
    if (!soundEnabled) return;
    const src = sounds[name];
    if (!src) return;
    try {
      const node = src.cloneNode();
      node.volume = src.volume ?? 0.9;
      node.play().catch(() => { /* ignore play interruptions */ });
    } catch (e) { /* ignore */ }
  }

  function setSoundEnabled(flag) {
    soundEnabled = !!flag;
  }
  function toggleSound() {
    soundEnabled = !soundEnabled;
    return soundEnabled;
  }

  // brand asset preloader (best-effort)
  function preloadBrandAssets() {
    try {
      if (window.DEV_MODE) {
        document.documentElement.classList.remove('no-water-can', 'no-dirty-can');
        return;
      }
    } catch (_) { /* ignore */ }

    try {
      const html = document.documentElement;
      const assets = [
        { src: 'img/water-can.png', missingClass: 'no-water-can' },
        { src: 'img/dirty-can.png', missingClass: 'no-dirty-can' }
      ];
      assets.forEach(({ src, missingClass }) => {
        html.classList.remove(missingClass);
        const img = new Image();
        img.onload = () => { html.classList.remove(missingClass); };
        img.onerror = () => { html.classList.add(missingClass); };
        img.src = src;
      });
    } catch (_) { /* ignore */ }
  }

  // inlined SVGs used as data URIs for reliable visuals
  const _WATER_CAN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect x='8' y='16' width='48' height='32' rx='6' fill='%23FFC907'/>
    <rect x='12' y='8' width='8' height='10' rx='2' fill='%23072b3a'/>
    <circle cx='46' cy='14' r='5' fill='%23072b3a'/>
    <path d='M32 26s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z' fill='%232E9DF7'/>
  </svg>`;
  const _DIRTY_CAN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect x='8' y='16' width='48' height='32' rx='6' fill='%236b4f3f'/>
    <rect x='12' y='8' width='8' height='10' rx='2' fill='%23111'/>
    <circle cx='46' cy='14' r='5' fill='%23111'/>
  </svg>`;

  const WATER_CAN_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(_WATER_CAN_SVG);
  const DIRTY_CAN_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(_DIRTY_CAN_SVG);

  // expose global Assets for use by script.js and any other modules
  window.Assets = {
    preloadSounds,
    preloadBrandAssets,
    playSound,
    setSoundEnabled,
    toggleSound,
    get soundEnabled() { return soundEnabled; },
    WATER_CAN_URI,
    DIRTY_CAN_URI,
    sounds,
    SOUND_FILES
  };
})();
