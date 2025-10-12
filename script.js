// Whack-a-mole style game with jerry cans and obstacles.

const startBtn = document.getElementById('startBtn');
const replayBtn = document.getElementById('replayBtn');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const grid = document.getElementById('gameGrid');
const achievementEl = document.getElementById('achievement');
const progressFill = document.getElementById('progress-fill');
const overlay = document.getElementById('overlay');
const finalScore = document.getElementById('finalScore');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');

const GAME_TIME = 30;
const POP_INTERVAL_MIN = 600;
const POP_INTERVAL_MAX = 1000;
const POP_VISIBLE_MS = 900;
const BAD_CHANCE = 0.18; // chance a popped can is a dirty/obstacle can
const WIN_THRESHOLD = 20;

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
	const can = document.createElement('div');
	can.className = 'water-can';
	if (isBad) can.classList.add('obstacle');
	wrapper.appendChild(can);
	return { wrapper, can };
}

// pop a random cell
function popRandom() {
	if (!running) return;
	const cells = Array.from(grid.querySelectorAll('.grid-cell'));
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
	// allow pointer events on the can itself
	cell.classList.add('pop');

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
			score = Math.max(0, score - 1);
			showAchievement('-1 (dirty can)');
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
	startCountdown();
	clearTimeout(popTimer);
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

/* Check if branding assets exist; if not, enable CSS fallbacks.
   - If img/water-can.png fails to load, add class 'use-inline-can' to <html>.
   (The logo image uses an onerror inline handler to toggle .logo-broken.) */
(function checkBrandImages() {
  try {
    const testImg = new Image();
    testImg.onload = () => { /* exists: nothing to do */ };
    testImg.onerror = () => {
      document.documentElement.classList.add('use-inline-can');
    };
    testImg.src = 'img/water-can.png';
    // Also quickly ensure logo state if img element missing or broken (defensive)
    const logoEl = document.getElementById('logoImg');
    if (logoEl) {
      logoEl.addEventListener('error', () => {
        document.documentElement.classList.add('logo-broken');
      });
    } else {
      // no <img> present — show inline logo
      document.documentElement.classList.add('logo-broken');
    }
  } catch (e) {
    // ignore errors — not critical
  }
})();

// wire UI
startBtn?.addEventListener('click', startGame);
replayBtn?.addEventListener('click', () => {
	overlay.classList.add('hidden');
	setTimeout(startGame, 180);
});
document.addEventListener('keydown', (e) => {
	if (e.code === 'Space' && !running) {
		e.preventDefault();
		startGame();
	}
});

// initial UI
updateHUD();
clearAllPops();
