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
const bannerCloseEl = document.getElementById('bannerClose');

const GAME_TIME = 30;
const WIN_THRESHOLD = 10;
const BAD_PENALTY = 2;

/* Re-introduce these minimal banner auto-hide vars so startBannerAutoHide()
   and hideBanner() can reference them without throwing. */
const BANNER_AUTO_HIDE_MS = 60 * 1000;
let bannerAutoHideTimer = null;

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
// replaced the old object map with an ordered array of milestone entries
const MILESTONES = [
  { score: 5,  msg: "Great start — 5 cans!" },
  { score: 10, msg: "Halfway there — 10 cans!" },
  { score: 15, msg: "Incredible — 15 cans!" }
];

// runtime set to avoid showing the same milestone multiple times during a session
let shownMilestones = new Set();

function _populateShownMilestonesFromScore() {
  shownMilestones.clear();
  for (const m of MILESTONES) {
    if (score >= m.score) shownMilestones.add(m.score);
  }
}

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

	// Use centralized Assets URIs (fallback to empty string if module not available)
	if (isBad) {
		can.style.backgroundImage = `url("${(window.Assets && Assets.DIRTY_CAN_URI) || ''}")`;
		can.innerHTML = '';
		can.classList.add('obstacle');
	} else {
		can.style.backgroundImage = `url("${(window.Assets && Assets.WATER_CAN_URI) || ''}")`;
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

		// clear milestone state for a fresh run
		shownMilestones.clear();

		// play start sound
		if (window.Assets && typeof Assets.playSound === 'function') Assets.playSound('start');

		// hide overlays/banners using centralized helpers so timers/inert states are handled
		if (overlay) overlay.classList.add('hidden');
		hideBanner();

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

function initEvents() {
  // replay / end-panel controls
  const replayBtnEl = document.getElementById('replayBtn');
  const closeEndBtn = document.getElementById('closeEndBtn');
  replayBtnEl?.addEventListener('click', () => {
    overlayHide();
    hideBanner();
    setTimeout(startGame, 140);
  });
  closeEndBtn?.addEventListener('click', (e) => { e?.preventDefault(); overlayHide(); });

  // keyboard: removed starting the game via Space to ensure timer only runs when PLAY clicked
  // (no global Space -> start handler here)

  // banner handlers
  bannerPlayEl?.addEventListener('click', (e) => { e?.preventDefault(); hideBanner(); startGame(); });
  bannerCloseEl?.addEventListener('click', (e) => { e?.preventDefault(); if (bannerWrapEl) bannerWrapEl.classList.add('hidden'); });

  // reset and difficulty select
  const resetBtn = document.getElementById('resetBtn');
  const difficultySelect = document.getElementById('difficultySelect');
  resetBtn?.addEventListener('click', () => {
    // clear timers/state first for cleanliness then reload
    try { stopConfetti(); } catch (_) {}
    try { clearTimeout(popTimer); popTimer = null; } catch (_) {}
    try { clearInterval(countdownTimer); countdownTimer = null; } catch (_) {}
    location.reload();
  });
  difficultySelect?.addEventListener('change', (e) => {
    const val = (e.target && e.target.value) || 'normal';
    setDifficulty(val);
    if (running) { clearTimeout(popTimer); popTimer = null; scheduleNextPop(); }
  });

  // overlay backdrop click to close
  overlay?.addEventListener('pointerdown', (e) => { if (e.target === overlay) overlayHide(); });

  // Escape handlers: close overlay or dismiss banner
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (overlay && !overlay.classList.contains('hidden')) { overlayHide(); return; }
      try { if (bannerWrapEl && !bannerWrapEl.classList.contains('hidden')) { hideBanner(); return; } } catch (_) {}
    }
  });
}

// replace endGame to show overlay only for wins; hide overlay on loss and show brief achievement
function endGame() {
	// stop running state and timers
	running = false;
	clearTimeout(popTimer); popTimer = null;
	clearInterval(countdownTimer); countdownTimer = null;

	// clear visible pops
	clearAllPops();

	// update score in end panel (kept for reference)
	if (finalScore) finalScore.textContent = score;

	// choose message based on win/lose
	const isWin = score >= WIN_THRESHOLD;
	const pool = isWin ? winMessages : loseMessages;
	const msg = pool[Math.floor(Math.random() * pool.length)];
	if (resultTitle) resultTitle.textContent = isWin ? 'You win!' : '';
	if (resultMessage) resultMessage.textContent = msg;

	// play win sound for winners (non-blocking)
	if (isWin && window.Assets && typeof Assets.playSound === 'function') Assets.playSound('win');

	// show overlay end panel only for wins
	const endPanelEl = document.getElementById('endPanel');
	if (isWin) {
		if (endPanelEl) overlayShow(endPanelEl);
	} else {
		// on loss: ensure any overlay/backdrop is hidden and show a short achievement message
		try { overlayHide(); } catch (_) { /* ignore */ }
		showAchievement(msg, 1600);
		// keep end panel hidden for clarity
		if (endPanelEl) {
			endPanelEl.classList.add('hidden');
			endPanelEl.setAttribute('aria-hidden', 'true');
		}
	}

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
	// clear milestones when resetting
	shownMilestones.clear();
	updateHUD();
	if (overlay) overlay.classList.add('hidden');
	if (document.activeElement && document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function hideBanner() {
	// clear any pending auto-hide timer
	if (bannerAutoHideTimer) {
		clearTimeout(bannerAutoHideTimer);
		bannerAutoHideTimer = null;
	}

	// existing hideBanner logic
	if (!bannerWrapEl) return;
	const active = document.activeElement;
	if (active && bannerWrapEl.contains(active) && typeof active.blur === 'function') active.blur();
	bannerWrapEl.classList.add('hidden');
}

// helper to start/restart the banner auto-hide timer
function startBannerAutoHide() {
	if (bannerAutoHideTimer) clearTimeout(bannerAutoHideTimer);
	bannerAutoHideTimer = setTimeout(() => {
		try {
			if (bannerWrapEl && !bannerWrapEl.classList.contains('hidden')) hideBanner();
		} catch (_) { /* ignore */ }
		bannerAutoHideTimer = null;
	}, BANNER_AUTO_HIDE_MS);
}

// ensure the banner auto-hide begins when script initializes (page loaded)
startBannerAutoHide();

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

// --- remove local asset/sound definitions (replaced by Assets module) ---

// --- init: use Assets preload functions instead of local ones ---
function init() {
  try {
    // Ensure grid reference (in case script executed before DOM ready)
    if (!gridEl) gridEl = document.getElementById('gameGrid') || document.querySelector('.game-grid');

    // Start preloading brand assets + sounds (harmless if already started)
    try { if (window.Assets && typeof Assets.preloadBrandAssets === 'function') Assets.preloadBrandAssets(); } catch (_) {}
    try { if (window.Assets && typeof Assets.preloadSounds === 'function') Assets.preloadSounds(); } catch (_) {}

    // Wire HUD sound toggle to use Assets.toggleSound()
    try {
      const btn = document.getElementById('soundToggle');
      if (btn && !btn.__cw_wired) {
        const enabled = window.Assets ? Assets.soundEnabled : true;
        btn.setAttribute('aria-pressed', String(!enabled));
        btn.textContent = enabled ? '🔊' : '🔈';
        btn.addEventListener('click', (e) => {
          e?.preventDefault();
          const newState = window.Assets ? Assets.toggleSound() : true;
          btn.setAttribute('aria-pressed', String(!newState));
          btn.textContent = newState ? '🔊' : '🔈';
        });
        btn.__cw_wired = true;
      }
    } catch (_) { /* ignore */ }

    // Focus the Play button for keyboard users if present
    try {
      if (bannerPlayEl && typeof bannerPlayEl.focus === 'function') {
        bannerPlayEl.setAttribute('aria-label', bannerPlayEl.getAttribute('aria-label') || 'Play Water Quest');
        bannerPlayEl.focus();
      }
    } catch (_) { /* ignore */ }

    // Start banner auto-hide timer (safe to call even if already scheduled)
    try { startBannerAutoHide(); } catch (_) { /* ignore */ }

    // wire all UI events (replay, reset, difficulty, banner, overlay, keyboard)
    try { initEvents(); } catch (_) { /* ignore */ }

    // Update HUD to reflect current state
    try { updateHUD(); } catch (_) { /* ignore */ }
  } catch (_) { /* final defensive catch */ }
}

// Run init after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  // already ready
  init();
}

// Ensure initial HUD reflects defaults
updateHUD();
