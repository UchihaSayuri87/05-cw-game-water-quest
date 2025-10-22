"use strict";

// Whack-a-mole style game with jerry cans and obstacles.

const replayBtn = document.getElementById('replayBtn');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
let gridEl = document.getElementById('gameGrid');
const achievementEl = document.getElementById('achievement');
const progressFill = document.getElementById('progress-fill');
const overlay = document.getElementById('overlay');
const finalScore = document.getElementById('finalScore');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const bannerWrapEl = document.querySelector('.banner-wrapper');
const bannerPlayEl = document.getElementById('bannerPlay');
const topBannerEl = document.getElementById('topBanner');

const GAME_TIME = 30;
const WIN_THRESHOLD = 10;
const BAD_PENALTY = 2;

// difficulty configurations
const DIFFICULTY_CONFIGS = {
  easy:   { popMin: 900, popMax: 1400, visible: 1200, badChance: 0.12 },
  normal: { popMin: 600, popMax: 1000, visible: 900,  badChance: 0.18 },
  master: { popMin: 350, popMax: 700,  visible: 700,  badChance: 0.28 }
};

let popIntervalMin = DIFFICULTY_CONFIGS.normal.popMin;
let popIntervalMax = DIFFICULTY_CONFIGS.normal.popMax;
let popVisibleMs = DIFFICULTY_CONFIGS.normal.visible;
let badChance = DIFFICULTY_CONFIGS.normal.badChance;
let currentDifficulty = 'normal';

// messages
const winMessages = [
	"You brought clean water to many!",
	"Champion — wells of hope!",
	"Amazing — communities celebrate!"
];
const loseMessages = [
	"Almost there — try again!",
	"Not enough drops — give it another shot!",
	"Keep trying — clean water needs you!"
];
const milestones = {
	5: "Great start — 5 cans!",
	10: "Awesome — 10 cans!",
	15: "Incredible — 15 cans!"
};

// state
let score = 0;
let timeLeft = GAME_TIME;
let running = false;
let popTimer = null;
let countdownTimer = null;
let lastIndex = -1;
let scorePulseTimer = null;
let peakScore = 0;

// helpers
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rand(min, max) { return Math.random() * (max - min) + min; }

// ensure grid reference
if (!gridEl) {
  const fallback = document.querySelector('.game-grid');
  if (fallback) gridEl = fallback;
}

function updateHUD() {
	if (scoreEl) scoreEl.textContent = score;
	if (timeEl) timeEl.textContent = Math.max(0, Math.floor(timeLeft));
	const pct = Math.min(100, Math.round((score / WIN_THRESHOLD) * 100));
	if (progressFill) progressFill.style.width = pct + '%';
	const progressRoot = document.getElementById('goalProgress');
	const percentEl = document.getElementById('progressPercent');
	if (progressRoot) progressRoot.setAttribute('aria-valuenow', String(pct));
	if (percentEl) percentEl.textContent = `${pct}%`;
	if (progressRoot) {
		if (pct >= 100) progressRoot.classList.add('complete');
		else progressRoot.classList.remove('complete');
	}
	if (scoreEl) {
		scoreEl.classList.add('updated');
		clearTimeout(scorePulseTimer);
		scorePulseTimer = setTimeout(() => scoreEl.classList.remove('updated'), 360);
	}
}

function clearAllPops() {
	if (!gridEl) return;
	gridEl.querySelectorAll('.grid-cell').forEach(cell => {
		cell.classList.remove('pop');
		const wrapper = cell.querySelector('.water-can-wrapper');
		if (wrapper) wrapper.remove();
	});
}

function createCan(isBad) {
	const wrapper = document.createElement('div');
	wrapper.className = 'water-can-wrapper';

	const can = document.createElement('div');
	can.className = 'water-can';
	can.dataset.bad = isBad ? '1' : '0';

	// accessibility + focusability
	can.setAttribute('role', 'button');
	can.setAttribute('aria-pressed', 'false');
	can.setAttribute('aria-label', isBad ? 'Dirty jerry can — avoid' : 'Clean jerry can');
	can.tabIndex = 0;

	// Use inlined data URIs to avoid network 404s. This always displays the intended visuals
	if (isBad) {
		can.style.backgroundImage = `url("${DIRTY_CAN_URI}")`;
		can.innerHTML = '';
		can.classList.add('obstacle');
	} else {
		can.style.backgroundImage = `url("${WATER_CAN_URI}")`;
		can.innerHTML = '';
	}

	wrapper.appendChild(can);
	return { wrapper, can };
}

function popRandom() {
	if (!running || !gridEl) return;
	const cells = Array.from(gridEl.querySelectorAll('.grid-cell'));
	if (!cells.length) return;
	let idx = randInt(0, cells.length - 1);
	if (cells.length > 1 && idx === lastIndex) idx = (idx + 1) % cells.length;
	lastIndex = idx;
	const cell = cells[idx];
	const isBad = Math.random() < badChance;

	// ensure cell is cleared
	cell.innerHTML = '';
	const { wrapper, can } = createCan(isBad);
	cell.appendChild(wrapper);

	// mark cell when obstacle present so CSS can style whole cell
	if (isBad) cell.classList.add('obstacle-present');

	requestAnimationFrame(() => {
		wrapper.style.opacity = '1';
		wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
		cell.classList.add('pop');
		const svg = can.querySelector('svg');
		if (svg) { svg.style.width = '100%'; svg.style.height = '100%'; }
	});

	// auto-hide after configured visible time if not tapped
	setTimeout(() => {
		if (!cell) return;
		cell.classList.remove('pop');
		// remove marker when can is removed
		if (cell.classList.contains('obstacle-present')) cell.classList.remove('obstacle-present');
		if (wrapper && wrapper.parentNode) wrapper.remove();
	}, popVisibleMs);
}

function scheduleNextPop() {
	if (!running) return;
	popRandom();
	const next = randInt(popIntervalMin, popIntervalMax);
	popTimer = setTimeout(scheduleNextPop, next);
}

function startCountdown(reset = true) {
	// if requested, reset the remaining time to full game duration
	if (reset) timeLeft = GAME_TIME;
	updateHUD();
	clearInterval(countdownTimer);
	countdownTimer = setInterval(() => {
		timeLeft -= 1;
		updateHUD();
		if (timeLeft <= 0) {
			clearInterval(countdownTimer);
			countdownTimer = null;
			endGame();
		}
	}, 1000);
}

function showAchievement(text, ms = 1200) {
	if (!achievementEl) return;
	achievementEl.textContent = text;
	if (ms > 0) setTimeout(() => {
		if (achievementEl.textContent === text) achievementEl.textContent = '';
	}, ms);
}

// consolidated difficulty setter (declared before use)
function setDifficulty(level) {
  if (!DIFFICULTY_CONFIGS[level]) level = 'normal';
  currentDifficulty = level;
  const cfg = DIFFICULTY_CONFIGS[level];
  popIntervalMin = cfg.popMin;
  popIntervalMax = cfg.popMax;
  popVisibleMs = cfg.visible;
  badChance = cfg.badChance;
  showAchievement(`Difficulty: ${level === 'master' ? 'MasterQuest' : level.charAt(0).toUpperCase() + level.slice(1)}`, 900);
}

function startGame() {
	if (running) return;
	try {
		stopConfetti();
		clearTimeout(popTimer); popTimer = null;
		clearInterval(countdownTimer); countdownTimer = null;

		score = 0;
		timeLeft = GAME_TIME;
		running = true;
		peakScore = 0;

		if (overlay) overlay.classList.add('hidden');
		if (bannerWrapEl) bannerWrapEl.classList.add('hidden');

		updateHUD();
		clearAllPops();

		if (!gridEl) { running = false; return; }

		startCountdown();
		popRandom();
		scheduleNextPop();
		showAchievement('Game started — tap the yellow cans!', 1000);
	} catch (err) {
		running = false;
	}
}

// replace endGame to use overlayShow for accessibility (merge in place of prior endGame)
function endGame() {
	// stop running state and timers
	running = false;
	clearTimeout(popTimer); popTimer = null;
	clearInterval(countdownTimer); countdownTimer = null;

	// clear visible pops
	clearAllPops();

	// show results in endPanel using overlay helpers
	if (finalScore) finalScore.textContent = score;
	const isWin = score >= WIN_THRESHOLD;
	const pool = isWin ? winMessages : loseMessages;
	const msg = pool[Math.floor(Math.random() * pool.length)];
	if (resultTitle) resultTitle.textContent = isWin ? 'You win!' : 'Try again';
	if (resultMessage) resultMessage.textContent = msg;

	// show overlay end panel via helper (endPanel exists in DOM)
	const endPanelEl = document.getElementById('endPanel');
	if (endPanelEl) overlayShow(endPanelEl);

	// confetti for notable achievements:
	if (peakScore >= 10 && score >= 10) {
		setTimeout(() => launchConfettiBurst(140), 220);
	}
}

function resetGame() {
	clearTimeout(popTimer); popTimer = null;
	clearInterval(countdownTimer); countdownTimer = null;
	try { stopConfetti(); } catch (e) {}
	running = false;
	try { clearAllPops(); } catch (e) {}
	score = 0;
	timeLeft = GAME_TIME;
	updateHUD();
	if (overlay) overlay.classList.add('hidden');
	if (document.activeElement && document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function hideBanner() {
	if (!bannerWrapEl) return;
	const active = document.activeElement;
	if (active && bannerWrapEl.contains(active) && typeof active.blur === 'function') active.blur();
	bannerWrapEl.classList.add('hidden');
}

// --- Confetti (single consolidated implementation) ---
let _confettiCanvas = null;
let _confettiCtx = null;
let _confettiParticles = [];
let _confettiAnim = null;
function _createConfettiCanvas() {
	if (_confettiCanvas) return;
	_confettiCanvas = document.createElement('canvas');
	_confettiCanvas.className = 'confetti-canvas';
	_confettiCanvas.style.position = 'fixed';
	_confettiCanvas.style.inset = '0';
	_confettiCanvas.style.pointerEvents = 'none';
	_confettiCanvas.style.zIndex = '60';
	document.body.appendChild(_confettiCanvas);
	_confettiCtx = _confettiCanvas.getContext('2d');
	function resize() {
		_confettiCanvas.width = window.innerWidth;
		_confettiCanvas.height = window.innerHeight;
	}
	resize();
	window.addEventListener('resize', resize);
}
function _spawnConfetti(count = 80) {
	if (!_confettiCtx) _createConfettiCanvas();
	const colors = ['#FFC907','#2E9DF7','#8BD1CB','#4FCB53','#072b3a'];
	for (let i = 0; i < count; i++) {
		_confettiParticles.push({
			x: Math.random() * _confettiCanvas.width,
			y: -10 - Math.random() * 300,
			vx: (Math.random() - 0.5) * 8,
			vy: 2 + Math.random() * 6,
			rot: Math.random() * Math.PI * 2,
			vrot: (Math.random() - 0.5) * 0.3,
			w: 6 + Math.random() * 12,
			h: 8 + Math.random() * 8,
			color: colors[Math.floor(Math.random() * colors.length)],
			ttl: 80 + Math.floor(Math.random() * 120)
		});
	}
	if (!_confettiAnim) _confettiLoop();
}
function _confettiLoop() {
	if (!_confettiCtx) return;
	const ctx = _confettiCtx;
	const canvas = _confettiCanvas;
	ctx.clearRect(0,0,canvas.width,canvas.height);
	for (let i = _confettiParticles.length - 1; i >= 0; i--) {
		const p = _confettiParticles[i];
		p.x += p.vx;
		p.y += p.vy;
		p.vy += 0.09;
		p.rot += p.vrot;
		p.ttl--;
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.rotate(p.rot);
		ctx.fillStyle = p.color;
		ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
		ctx.restore();
		if (p.y > canvas.height + 60 || p.ttl <= 0) _confettiParticles.splice(i, 1);
	}
	if (_confettiParticles.length === 0) {
		cancelAnimationFrame(_confettiAnim);
		_confettiAnim = null;
		setTimeout(() => {
			if (_confettiCanvas && _confettiParticles.length === 0) {
				_confettiCanvas.remove();
				_confettiCanvas = null;
				_confettiCtx = null;
			}
		}, 400);
		return;
	}
	_confettiAnim = requestAnimationFrame(_confettiLoop);
}
function launchConfettiBurst(count = 100) { _spawnConfetti(count); }
function stopConfetti() { if (_confettiAnim) cancelAnimationFrame(_confettiAnim); _confettiAnim = null; _confettiParticles.length = 0; if (_confettiCanvas) { _confettiCanvas.remove(); _confettiCanvas = null; _confettiCtx = null; } }

// ---- DEV MODE + inlined can assets ----
/* Dev mode: set window.__DEV_MODE = true in the console or add ?dev=1 to the URL to skip network preload checks */
const DEV_MODE = Boolean(window.__DEV_MODE) || (new URLSearchParams(location.search).get('dev') === '1');

// small clean jerry-can SVG (keeps visuals consistent with in-game can)
const _WATER_CAN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
  <rect x='8' y='16' width='48' height='32' rx='6' fill='%23FFC907'/>
  <rect x='12' y='8' width='8' height='10' rx='2' fill='%23072b3a'/>
  <circle cx='46' cy='14' r='5' fill='%23072b3a'/>
  <path d='M32 26s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z' fill='%232E9DF7'/>
</svg>`;
const WATER_CAN_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(_WATER_CAN_SVG);

// small dirty jerry-can SVG (obstacle)
const _DIRTY_CAN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
  <rect x='8' y='16' width='48' height='32' rx='6' fill='%236b4f3f'/>
  <rect x='12' y='8' width='8' height='10' rx='2' fill='%23111'/>
  <circle cx='46' cy='14' r='5' fill='%23111'/>
</svg>`;
const DIRTY_CAN_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(_DIRTY_CAN_SVG);

// Preload brand assets — skip when DEV_MODE to avoid network checks during development
function preloadBrandAssets() {
  if (DEV_MODE) {
    // in dev mode we rely on inlined assets; ensure no marker classes exist
    document.documentElement.classList.remove('no-water-can', 'no-dirty-can');
    return;
  }

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
}

// call preloader early so UI logic knows which assets exist (no-op in DEV_MODE)
preloadBrandAssets();

// state restoration after tab switch (delayed to ensure DOM is ready)
setTimeout(() => {
	const saved = sessionStorage.getItem('waterQuestSave');
	if (!saved) return;
	const data = JSON.parse(saved);
	if (typeof data.score === 'number') score = Math.max(0, Math.floor(data.score));
	if (typeof data.timeLeft === 'number') timeLeft = Math.max(0, Math.floor(data.timeLeft));
	if (typeof data.peakScore === 'number') peakScore = Math.max(0, Math.floor(data.peakScore));
	if (typeof data.currentDifficulty === 'string' && DIFFICULTY_CONFIGS[data.currentDifficulty]) {
		currentDifficulty = data.currentDifficulty;
		setDifficulty(currentDifficulty);
	}
	updateHUD();
}, 50);

// save state on unload (throttled to avoid excessive calls)
let _saveTimer = null;
function saveState() {
	if (_saveTimer) clearTimeout(_saveTimer);
	_saveTimer = setTimeout(() => {
		if (!running) {
			const data = {
				score: score,
				timeLeft: timeLeft,
				peakScore: peakScore,
				currentDifficulty: currentDifficulty
			};
			sessionStorage.setItem('waterQuestSave', JSON.stringify(data));
		}
	}, 500);
}
window.addEventListener('beforeunload', saveState);

// --- Input handling and shared tap logic ---
function handleCanTap(can) {
	if (!can) return;
	// prevent double-tap
	if (can.classList.contains('tapped')) return;
	can.classList.add('tapped');

	// visual tap
	can.classList.add('tap-effect');

	// determine wrapper + cell
	const wrapper = can.parentElement;
	const cell = wrapper?.parentElement;

	const isBad = can.dataset.bad === '1' || can.classList.contains('obstacle');

	if (isBad) {
		// strong negative feedback: shake and silhouette, then remove
		can.classList.add('silhouette');
		can.classList.add('shake');
		setTimeout(() => {
			can.classList.remove('shake');
		}, 420);

		setTimeout(() => {
			if (cell) cell.classList.remove('pop');
			// ensure cell obstacle marker removed
			if (cell && cell.classList.contains('obstacle-present')) cell.classList.remove('obstacle-present');
			if (wrapper) wrapper.remove();
		}, 220);

		score = Math.max(0, score - BAD_PENALTY);
		showAchievement(`-${BAD_PENALTY} (dirty can)`);
	} else {
		setTimeout(() => {
			if (cell) cell.classList.remove('pop');
			if (wrapper) wrapper.remove();
		}, 120);

		score += 1;
		peakScore = Math.max(peakScore, score);
		if (milestones[score]) showAchievement(milestones[score]);
		else showAchievement('+1');
	}

	updateHUD();
}

// Delegated pointer handler — centralizes tapping logic and prevents attaching many listeners.
if (gridEl) {
	gridEl.addEventListener('pointerdown', (e) => {
		const can = e.target.closest('.water-can');
		if (!can || !gridEl.contains(can)) return;
		handleCanTap(can);
	});

	// keyboard support: Enter/Space on a focused grid-cell will attempt to tap the can inside it
	gridEl.addEventListener('keydown', (e) => {
		if (e.code !== 'Enter' && e.code !== 'Space') return;
		const focused = document.activeElement;
		if (!focused || !focused.classList || !focused.classList.contains('grid-cell')) return;
		const can = focused.querySelector('.water-can');
		if (!can) return;
		e.preventDefault();
		handleCanTap(can);
	});
}

// --- UI wiring (replay, reset, difficulty) ---
replayBtn?.addEventListener('click', () => {
	overlayHide();
	hideBanner();
	setTimeout(startGame, 140);
});

// keyboard: Space to start when not running
document.addEventListener('keydown', (e) => {
	if (e.code === 'Space' && !running) {
		e.preventDefault();
		hideBanner();
		startGame();
	}
});

// banner PLAY handlers
bannerPlayEl?.addEventListener('click', (e) => {
	e?.preventDefault();
	hideBanner();
	startGame();
});
topBannerEl?.addEventListener('click', (e) => {
	const el = e.currentTarget;
	if (!el) return;
	const style = window.getComputedStyle(el);
	if (style && (style.display === 'none' || style.visibility === 'hidden' || el.hasAttribute('hidden'))) return;
	e.preventDefault();
	hideBanner();
	startGame();
});

// wire reset button and difficulty selector (listeners added once)
const resetBtn = document.getElementById('resetBtn');
const difficultySelect = document.getElementById('difficultySelect');

resetBtn?.addEventListener('click', () => {
	// reset state and immediately restart the game with current difficulty
	resetGame();
	setTimeout(() => {
		setDifficulty(currentDifficulty);
		startGame();
	}, 120);
});

difficultySelect?.addEventListener('change', (e) => {
	const val = (e.target && e.target.value) || 'normal';
	setDifficulty(val);
	// if running, restart spawn loop with new timings to apply immediately
	if (running) {
		clearTimeout(popTimer);
		popTimer = null;
		scheduleNextPop();
	}
});

// --- inert fallback + modal helpers: focus trap, aria-hide and show/hide overlay panels ---
let _focusTrapListener = null;
let _previouslyFocused = null;
let _wasRunningBeforeModal = false;
const _appRegions = () => document.querySelectorAll('.brand-strip, .banner-wrapper, .game-wrap, .hud');

// helper: apply inert to container (fallback: make focusable descendants tabindex=-1)
function _applyInert(el, inert) {
  try {
    if ('inert' in el) {
      el.inert = inert;
      return;
    }
  } catch (_) {}
  // fallback: toggle aria-hidden and manage tabindex for focusable descendants
  if (inert) el.setAttribute('aria-hidden', 'true');
  else el.removeAttribute('aria-hidden');

  const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]';
  const focusables = Array.from(el.querySelectorAll(focusableSelector));
  focusables.forEach(node => {
    if (inert) {
      // store previous tabIndex
      if (!node.hasAttribute('data-prev-tabindex')) node.setAttribute('data-prev-tabindex', node.getAttribute('tabindex') ?? '');
      node.setAttribute('tabindex', '-1');
    } else {
      // restore
      if (node.hasAttribute('data-prev-tabindex')) {
        const prev = node.getAttribute('data-prev-tabindex');
        if (prev === '') node.removeAttribute('tabindex');
        else node.setAttribute('tabindex', prev);
        node.removeAttribute('data-prev-tabindex');
      } else {
        node.removeAttribute('tabindex');
      }
    }
  });
}

function _getFocusable(container) {
  return Array.from(container.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'))
    .filter(el => el.offsetParent !== null);
}

function _trapFocus(container) {
  const focusables = _getFocusable(container);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  // focus the first element
  first.focus();

  _focusTrapListener = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', _focusTrapListener);
}

function _releaseFocusTrap() {
  if (_focusTrapListener) {
    document.removeEventListener('keydown', _focusTrapListener);
    _focusTrapListener = null;
  }
}

// pause game (preserve timeLeft & score) and clear timers
function _pauseGameForModal() {
  _wasRunningBeforeModal = running;
  if (!running) return;
  clearTimeout(popTimer); popTimer = null;
  clearInterval(countdownTimer); countdownTimer = null;
  running = false;
}

// resume game if it was running when modal opened
function _resumeGameFromModal() {
  if (!_wasRunningBeforeModal) return;
  running = true;
  // restart countdown and spawn scheduling without resetting the remaining time
  startCountdown(false);
  scheduleNextPop();
  _wasRunningBeforeModal = false;
}

function overlayShow(panelEl) {
  if (!overlay || !panelEl) return;
  // save focus
  _previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // show overlay and target panel first so it is focusable/visible
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  // hide other overlay panels and reveal the requested panel
  Array.from(overlay.querySelectorAll('.overlay-content')).forEach(p => p.classList.add('hidden'));
  panelEl.classList.remove('hidden');
  panelEl.removeAttribute('aria-hidden');

  // trap focus inside the panel immediately (moves focus into the modal)
  _trapFocus(panelEl);

  // pause game while modal visible
  _pauseGameForModal();

  // mark app regions as inert (use fallback) AFTER focus moved into modal
  _appRegions().forEach(el => {
    try { _applyInert(el, true); } catch(_) {}
  });
}

// small helper to verify an element is in the document and visible
function _isVisible(el) {
  if (!el || !(el instanceof Element)) return false;
  try {
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || el.hasAttribute('hidden')) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  } catch (e) {
    return false;
  }
}

// Replace overlayHide with a safe, syntactically-correct implementation
function overlayHide() {
  if (!overlay) return;

  // release focus trap first (stop intercepting Tab)
  _releaseFocusTrap();

  // attempt to restore previous focus if possible
  if (_previouslyFocused) {
    try {
      if (document.contains(_previouslyFocused) && _isVisible(_previouslyFocused)) {
        _previouslyFocused.focus();
      } else {
        // fallback targets (in order): bannerPlay, reset button, first .start-btn, then body
        const fallback = document.getElementById('bannerPlay')
                       || document.getElementById('resetBtn')
                       || document.querySelector('.start-btn')
                       || document.body;
        if (fallback && typeof fallback.focus === 'function') {
          try { fallback.focus(); } catch (_) { /* ignore */ }
        } else {
          try {
            if (document.body && typeof document.body.focus === 'function') document.body.focus();
            else if (document.documentElement && typeof document.documentElement.focus === 'function') document.documentElement.focus();
          } catch (_) { /* ignore */ }
        }
      }
    } catch (_) {
      try { if (document.body && typeof document.body.focus === 'function') document.body.focus(); } catch (_) { /* ignore */ }
    }
    _previouslyFocused = null;
  } else {
    // no previously focused element recorded — blur any focused element inside the overlay so aria-hidden can be applied safely
    try {
      const active = document.activeElement;
      if (overlay.contains(active) && active instanceof HTMLElement) active.blur();
    } catch (_) { /* ignore */ }
  }

  // now hide overlay and panels, set ARIA
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  Array.from(overlay.querySelectorAll('.overlay-content')).forEach(p => {
    p.classList.add('hidden');
    p.setAttribute('aria-hidden', 'true');
  });

  // release inert/aria-hidden on app regions (fallback)
  _appRegions().forEach(el => {
    try { _applyInert(el, false); } catch(_) { /* ignore */ }
  });

  // resume game if it was paused by modal
  _resumeGameFromModal();
}

// --- Tutorial modal wiring ---
const tutorialBtn = document.getElementById('tutorialBtn');
const tutorialPanel = document.getElementById('tutorialPanel');
const closeTutorialBtn = document.getElementById('closeTutorialBtn');

tutorialBtn?.addEventListener('click', (e) => {
  e?.preventDefault();
  const panel = document.getElementById('tutorialPanel');
  if (panel) {
    overlayShow(panel);
  }
});

// close tutorial button
closeTutorialBtn?.addEventListener('click', (e) => {
  e?.preventDefault();
  overlayHide();
});

// allow clicking outside the modal panel (on the overlay backdrop) to close it
overlay?.addEventListener('pointerdown', (e) => {
  if (e.target === overlay) overlayHide();
});

// allow Escape to close any open overlay panel
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
    overlayHide();
  }
});

// Ensure initial HUD reflects defaults
updateHUD();
