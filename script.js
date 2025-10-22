"use strict";

// Whack-a-mole style game with jerry cans and obstacles.

const replayBtn = document.getElementById('replayBtn');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
// cache the grid element once (assume static 3x3 markup in index.html)
let gridEl = document.getElementById('gameGrid');
const achievementEl = document.getElementById('achievement');
const progressFill = document.getElementById('progress-fill');
const overlay = document.getElementById('overlay');
const finalScore = document.getElementById('finalScore');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
// cache banner elements used by UI wiring
const bannerWrapEl = document.querySelector('.banner-wrapper');
const bannerPlayEl = document.getElementById('bannerPlay');
const topBannerEl = document.getElementById('topBanner');

const GAME_TIME = 30;
const POP_INTERVAL_MIN = 600;
const POP_INTERVAL_MAX = 1000;
const POP_VISIBLE_MS = 900;
const BAD_CHANCE = 0.18; // chance a popped can is a dirty/obstacle can
const WIN_THRESHOLD = 10;
const BAD_PENALTY = 2; // <-- new: points deducted for clicking a dirty jerry can

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
let scorePulseTimer = null; // <-- added: timer for score pulse
let peakScore = 0; // <-- added: track highest score achieved during a run

// helpers
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rand(min, max) { return Math.random() * (max - min) + min; }

// ensure grid reference (one-time fallback)
if (!gridEl) {
  const fallback = document.querySelector('.game-grid');
  if (fallback) gridEl = fallback;
}

function updateHUD() {
	scoreEl.textContent = score;
	timeEl.textContent = Math.max(0, Math.floor(timeLeft));
	// progress toward WIN_THRESHOLD
	const pct = Math.min(100, Math.round((score / WIN_THRESHOLD) * 100));
	if (progressFill) progressFill.style.width = pct + '%';

	// update accessible progress attributes and visible percent
	const progressRoot = document.getElementById('goalProgress');
	const percentEl = document.getElementById('progressPercent');
	if (progressRoot) progressRoot.setAttribute('aria-valuenow', String(pct));
	if (percentEl) percentEl.textContent = `${pct}%`;

	// toggle complete styling when goal reached
	if (progressRoot) {
		if (pct >= 100) progressRoot.classList.add('complete');
		else progressRoot.classList.remove('complete');
	}

	// pulse the score when it changes
	if (scoreEl) {
		scoreEl.classList.add('updated');
		clearTimeout(scorePulseTimer);
		scorePulseTimer = setTimeout(() => {
			scoreEl.classList.remove('updated');
		}, 360);
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

// create a can element (wrapped)
function createCan(isBad) {
	const wrapper = document.createElement('div');
	wrapper.className = 'water-can-wrapper';
	// removed development-only inline positioning / sizing here; CSS handles layout

	const can = document.createElement('div');
	can.className = 'water-can';
	// removed development-only inline sizing/visual styles here; CSS handles sizing

	// mark whether this can is "bad" using a data attribute (used by delegated handler)
	can.dataset.bad = isBad ? '1' : '0';

	// prefer external branded assets if present; fall back to inline SVG
	const html = document.documentElement;
	const hasWaterImg = !html.classList.contains('no-water-can');
	const hasDirtyImg = !html.classList.contains('no-dirty-can');

	if (isBad) {
		if (hasDirtyImg) {
			// assign only the background image; sizing/position handled by CSS
			can.style.backgroundImage = 'url("img/dirty-can.png")';
			can.innerHTML = '';
		} else {
			// inline dirty fallback
			can.innerHTML = `
				<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
					<rect x="8" y="16" width="40" height="32" rx="6" fill="#2b2b2b"></rect>
					<rect x="10" y="8" width="8" height="10" rx="2" fill="#111"></rect>
					<circle cx="46" cy="14" r="5" fill="#111"></circle>
				</svg>
			`;
			can.style.backgroundImage = '';
		}
	} else {
		if (hasWaterImg) {
			can.style.backgroundImage = 'url("img/water-can.png")';
			can.innerHTML = '';
		} else {
			// inline clean fallback
			can.innerHTML = `
				<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
					<rect x="8" y="16" width="40" height="32" rx="6" fill="#FFC907"></rect>
					<rect x="10" y="8" width="8" height="10" rx="2" fill="#072b3a"></rect>
					<circle cx="46" cy="14" r="5" fill="#072b3a"></circle>
				</svg>
			`;
			can.style.backgroundImage = '';
		}
	}

	if (isBad) can.classList.add('obstacle');
	wrapper.appendChild(can);
	return { wrapper, can };
}

// pop a random cell
function popRandom() {
	if (!running) return;
	if (!gridEl) return;
	const cells = Array.from(gridEl.querySelectorAll('.grid-cell'));
	if (!cells.length) return;

	// pick an index different from lastIndex to avoid same cell twice
	let idx = randInt(0, cells.length - 1);
	if (cells.length > 1 && idx === lastIndex) idx = (idx + 1) % cells.length;
	lastIndex = idx;
	const cell = cells[idx];
	const isBad = Math.random() < BAD_CHANCE;

	// ensure cell is cleared
	cell.innerHTML = '';
	const { wrapper, can } = createCan(isBad);
	cell.appendChild(wrapper);

	// force visible state quickly (guard against missing CSS)
	requestAnimationFrame(() => {
		wrapper.style.opacity = '1';
		wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
		cell.classList.add('pop');
		const svg = can.querySelector('svg');
		if (svg) { svg.style.width = '100%'; svg.style.height = '100%'; }
	});

	// NOTE: per-can pointerdown listener removed in favor of a delegated handler on gridEl
	// auto-hide after POP_VISIBLE_MS if not tapped
	setTimeout(() => {
		if (!cell) return;
		cell.classList.remove('pop');
		if (wrapper && wrapper.parentNode) wrapper.remove();
	}, POP_VISIBLE_MS);
}

// spawn loop that schedules next pop
function scheduleNextPop() {
	if (!running) return;
	popRandom();
	const next = randInt(POP_INTERVAL_MIN, POP_INTERVAL_MAX);
	popTimer = setTimeout(scheduleNextPop, next);
}

function startCountdown() {
	timeLeft = GAME_TIME;
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
	achievementEl.textContent = text;
	if (ms > 0) setTimeout(() => {
		if (achievementEl.textContent === text) achievementEl.textContent = '';
	}, ms);
}

function startGame() {
	if (running) return;
	try {
		// stop visual effects
		stopConfetti();

		// clear any scheduled pops/countdowns
		clearTimeout(popTimer); popTimer = null;
		clearInterval(countdownTimer); countdownTimer = null;

		// reset state
		score = 0;
		timeLeft = GAME_TIME;
		running = true;

		// reset peak score tracker
		peakScore = 0;

		// hide overlay/banner and reset UI
		overlay.classList.add('hidden');
		if (bannerWrapEl) bannerWrapEl.classList.add('hidden');

		updateHUD();
		clearAllPops();

		// gridEl is expected to exist in the HTML (static 3x3). If it's missing, abort start.
		if (!gridEl) { running = false; return; }

		// start timers and first pop
		startCountdown();
		popRandom();
		scheduleNextPop();
		showAchievement('Game started — tap the yellow cans!', 1000);
	} catch (err) {
		// avoid logging to console in production; fail silently but reset running flag
		running = false;
	}
}

// --- Unified endGame (no leaderboard side-effects here) ---
function endGame() {
	// stop running state and timers
	running = false;
	clearTimeout(popTimer); popTimer = null;
	clearInterval(countdownTimer); countdownTimer = null;

	// clear visible pops
	clearAllPops();

	// show results
	finalScore.textContent = score;
	const isWin = score >= WIN_THRESHOLD;
	const pool = isWin ? winMessages : loseMessages;
	const msg = pool[Math.floor(Math.random() * pool.length)];
	resultTitle.textContent = isWin ? 'You win!' : 'Try again';
	resultMessage.textContent = msg;
	overlay.classList.remove('hidden');

	// confetti for notable achievements:
	// only launch if player reached at least 10 during play (peakScore) AND still has >=10 final points
	if (peakScore >= 10 && score >= 10) {
		setTimeout(() => launchConfettiBurst(140), 220);
	}
}

// --- Added reset helper (was missing) ---
function resetGame() {
	// stop timers and scheduled pops
	clearTimeout(popTimer); popTimer = null;
	clearInterval(countdownTimer); countdownTimer = null;

	// stop confetti
	try { stopConfetti(); } catch (e) { /* ignore */ }

	// mark not running
	running = false;

	// clear visible cans and reset HUD
	try { clearAllPops(); } catch (e) { /* ignore */ }
	score = 0;
	timeLeft = GAME_TIME;
	updateHUD();

	// hide overlay if visible
	if (overlay) overlay.classList.add('hidden');

	// remove focus from any interactive banner/button so hiding won't trap focus
	if (document.activeElement && document.activeElement instanceof HTMLElement) {
		document.activeElement.blur();
	}
}

// --- Improved hideBanner: blur focused element inside banner before hiding (fixes aria-hidden+focus) ---
function hideBanner() {
	if (!bannerWrapEl) return;
	// if focus is inside the banner, blur it first to avoid aria-hidden/focus conflicts
	const active = document.activeElement;
	if (active && bannerWrapEl.contains(active) && typeof active.blur === 'function') {
		active.blur();
	}
	bannerWrapEl.classList.add('hidden');
}

// --- Consolidated UI wiring (single listeners, no duplicates) ---
// replay: hide overlay and start
replayBtn?.addEventListener('click', () => {
	overlay.classList.add('hidden');
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

// banner fallback PLAY button and banner image both start the game (use cached refs)
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

// --- Full confetti implementation (replaces stubs) ---
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
		p.vy += 0.09; // gravity
		p.rot += p.vrot;
		p.ttl--;
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.rotate(p.rot);
		ctx.fillStyle = p.color;
		ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
		ctx.restore();
		if (p.y > canvas.height + 60 || p.ttl <= 0) {
			_confettiParticles.splice(i, 1);
		}
	}
	if (_confettiParticles.length === 0) {
		// stop animation and remove canvas shortly
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

function launchConfettiBurst(count = 100) {
	_spawnConfetti(count);
}

// stop and clear any running confetti immediately
function stopConfetti() {
	if (_confettiAnim) cancelAnimationFrame(_confettiAnim);
	_confettiAnim = null;
	_confettiParticles.length = 0;
	if (_confettiCanvas) {
		_confettiCanvas.remove();
		_confettiCanvas = null;
		_confettiCtx = null;
	}
}

// initial UI
updateHUD();
clearAllPops();

// --- Extracted tap handling so keyboard and pointer share logic ---
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
		// show silhouette then remove
		can.classList.add('silhouette');
		setTimeout(() => {
			if (cell) cell.classList.remove('pop');
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
		// if a can exists in the cell, trigger the same logic
		const can = focused.querySelector('.water-can');
		if (!can) return;
		e.preventDefault();
		handleCanTap(can);
	});
}

// ---
