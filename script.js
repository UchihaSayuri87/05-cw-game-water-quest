// Whack-a-mole style game with jerry cans and obstacles.

const replayBtn = document.getElementById('replayBtn');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
let grid = document.getElementById('gameGrid');
const achievementEl = document.getElementById('achievement');
const progressFill = document.getElementById('progress-fill');
const overlay = document.getElementById('overlay');
const finalScore = document.getElementById('finalScore');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const resetBtn = document.getElementById('resetBtn'); // new

const GAME_TIME = 30;
const POP_INTERVAL_MIN = 600;
const POP_INTERVAL_MAX = 1000;
const POP_VISIBLE_MS = 900;
const BAD_CHANCE = 0.18; // chance a popped can is a dirty/obstacle can
const WIN_THRESHOLD = 20;
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

// helpers
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rand(min, max) { return Math.random() * (max - min) + min; }

// ensure grid reference (defensive if DOM changed)
if (!grid) {
  const fallback = document.getElementById('gameGrid') || document.querySelector('.game-grid');
  if (fallback) {
    // assign to the local grid variable so the rest of the script uses it
    grid = fallback;
  }
}

function updateHUD() {
	scoreEl.textContent = score;
	timeEl.textContent = Math.max(0, Math.floor(timeLeft));
	// progress toward WIN_THRESHOLD
	const pct = Math.min(100, Math.round((score / WIN_THRESHOLD) * 100));
	if (progressFill) progressFill.style.width = pct + '%';
}

function clearAllPops() {
	grid.querySelectorAll('.grid-cell').forEach(cell => {
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
	// defensive: ensure grid reference
	const cells = Array.from((grid || document.getElementById('gameGrid') || document.querySelector('.game-grid')).querySelectorAll('.grid-cell'));
	if (!cells.length) {
		console.warn('popRandom: no grid cells found');
		return;
	}
	// pick an index different from lastIndex to avoid same cell twice
	let idx = randInt(0, cells.length - 1);
	if (cells.length > 1 && idx === lastIndex) idx = (idx + 1) % cells.length;
	lastIndex = idx;
	const cell = cells[idx];
	const isBad = Math.random() < BAD_CHANCE;

	// removed debug console.log

	// ensure cell is cleared
	cell.innerHTML = '';
	const { wrapper, can } = createCan(isBad);
	cell.appendChild(wrapper);

	// force visible state quickly (guard against missing CSS)
	requestAnimationFrame(() => {
		// explicit inline styles only for the transient show/hide (keeps animation reliable)
		wrapper.style.opacity = '1';
		wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
		cell.classList.add('pop');
		// ensure SVG inside can is visible (defensive)
		const svg = can.querySelector('svg');
		if (svg) { svg.style.width = '100%'; svg.style.height = '100%'; }
	});

	// click handler
	const tapped = (e) => {
		e.stopPropagation();
		// visual tap
		can.classList.add('tap-effect');

		if (isBad) {
			// show black silhouette for dirty can before removing
			can.classList.add('silhouette');
			setTimeout(() => {
				if (cell) cell.classList.remove('pop');
				if (wrapper) wrapper.remove();
			}, 220); // slightly longer so silhouette is visible

			// apply penalty
			score = Math.max(0, score - BAD_PENALTY);
			showAchievement(`-${BAD_PENALTY} (dirty can)`);
		} else {
			setTimeout(() => {
				if (cell) cell.classList.remove('pop');
				if (wrapper) wrapper.remove();
			}, 120);
			score += 1;
			// milestone feedback
			if (milestones[score]) showAchievement(milestones[score]);
			else showAchievement('+1');
		}
		updateHUD();
	};
	can.addEventListener('pointerdown', tapped, { once: true });

	// auto-hide after POP_VISIBLE_MS if not tapped
	setTimeout(() => {
		if (!cell) return;
		// if still present, remove
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
	// reset
	score = 0;
	timeLeft = GAME_TIME;
	running = true;
	overlay.classList.add('hidden');
	updateHUD();
	clearAllPops();

	// defensive: if grid cells are missing, create them
	const gridEl = grid || document.getElementById('gameGrid') || document.querySelector('.game-grid');
	if (gridEl && gridEl.querySelectorAll('.grid-cell').length === 0) {
		for (let i = 0; i < 9; i++) {
			const cell = document.createElement('div');
			cell.className = 'grid-cell';
			cell.dataset.index = i;
			gridEl.appendChild(cell);
		}
	}

	startCountdown();
	clearTimeout(popTimer);

	// immediate pop so player sees a can right after pressing Start
	popRandom();

	// then continue scheduling
	scheduleNextPop();
	showAchievement('Game started — tap the yellow cans!', 1000);
}

function endGame() {
	if (!running) return;
	running = false;
	clearTimeout(popTimer); popTimer = null;
	clearInterval(countdownTimer); countdownTimer = null;
	clearAllPops();
	finalScore.textContent = score;
	const isWin = score >= WIN_THRESHOLD;
	const pool = isWin ? winMessages : loseMessages;
	const msg = pool[Math.floor(Math.random() * pool.length)];
	resultTitle.textContent = isWin ? 'You win!' : 'Try again';
	resultMessage.textContent = msg;
	overlay.classList.remove('hidden');
}

function resetGame() {
	// stop timers and scheduled pops
	clearTimeout(popTimer); popTimer = null;
	clearInterval(countdownTimer); countdownTimer = null;

	// mark not running
	running = false;

	// clear any visible cans and reset HUD
	clearAllPops();
	score = 0;
	timeLeft = GAME_TIME;
	updateHUD();

	// hide overlay if visible
	overlay.classList.add('hidden');

	// brief feedback
	showAchievement('Game reset', 1000);
}

// /* Check if branding assets exist; if not, enable CSS fallbacks.
   // detect both img/water-can.png and img/dirty-can.png and add classes:
	 // - no-water-can (missing water-can)
	 // - no-dirty-can (missing dirty-can)
   // (logo image still uses inline onerror handler)
// */
(function checkBrandImages() {
  try {
    const html = document.documentElement;

    const testOne = (src, className) => {
      const img = new Image();
      img.onload = () => { /* exists */ };
      img.onerror = () => { html.classList.add(className); };
      img.src = src;
    };

    testOne('img/water-can.png', 'no-water-can');
    testOne('img/dirty-can.png', 'no-dirty-can');

    // defensive logo handling (keeps previous behavior)
    const logoEl = document.getElementById('logoImg');
    if (!logoEl) {
      html.classList.add('logo-broken');
    } else {
      logoEl.addEventListener('error', () => html.classList.add('logo-broken'));
    }
  } catch (e) {
    // ignore
  }
})();

// wire UI
// (startBtn listener removed — hero PLAY triggers startGame)
replayBtn?.addEventListener('click', () => {
	overlay.classList.add('hidden');
	setTimeout(startGame, 180);
});
resetBtn?.addEventListener('click', resetGame);
document.addEventListener('keydown', (e) => {
	if (e.code === 'Space' && !running) {
		e.preventDefault();
		startGame();
	}
});

// banner Play button starts the game (already wired)
document.getElementById('bannerPlay')?.addEventListener('click', () => {
  document.querySelector('.banner-wrapper')?.classList.add('hidden');
  startGame();
});

// initial UI
updateHUD();
clearAllPops();
