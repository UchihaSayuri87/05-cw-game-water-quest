// Game configuration and state variables
const GOAL_CANS = 25;           // Total items needed to collect
const SCORE_PER_CAN = 1;        // Points gained per can
const PENALTY_SECONDS = 2;      // Seconds deducted when missing a can / clicking empty cell
const GAME_TIME = 30;           // Total game time in seconds
const SPAWN_INTERVAL_MS = 1000; // How often to spawn a can (ms)
const CAN_LIFETIME_MS = 1500;   // How long a can stays before it's considered missed (ms)

let currentCans = 0;            // Current number of items collected
let gameActive = false;         // Tracks if game is currently running
let spawnInterval = null;       // Holds the interval for spawning items
let timerInterval = null;       // Holds the game countdown interval
let canTimeout = null;          // Timeout for current can lifetime
let remainingTime = GAME_TIME;  // Remaining time tracking

// Creates the 3x3 game grid where items will appear
function createGrid() {
  const grid = document.querySelector('.game-grid');
  grid.innerHTML = ''; // Clear any existing grid cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell'; // Each cell represents a grid square
    grid.appendChild(cell);
  }
}

// Ensure the grid is created when the page loads
createGrid();

// Expose numeric settings to the UI so testing is clear
function initSettingsUI() {
  document.getElementById('goal-cans').textContent = GOAL_CANS;
  document.getElementById('points-per-can').textContent = SCORE_PER_CAN;
  document.getElementById('penalty-seconds').textContent = PENALTY_SECONDS;
}

// Centralized UI updates
function updateUI() {
  document.getElementById('current-cans').textContent = currentCans;
  document.getElementById('timer').textContent = Math.max(0, Math.floor(remainingTime));
  updateProgressBar();
}

// Show achievement/status text briefly
function showAchievement(text, timeout = 1800) {
  const el = document.getElementById('achievements');
  el.textContent = text;
  // clear after timeout unless it's final
  if (timeout > 0) {
    setTimeout(() => { if (el.textContent === text) el.textContent = ''; }, timeout);
  }
}

// Handle a miss (can expired or empty-cell click)
function handleMiss(reason = 'missed') {
  // Apply time penalty
  remainingTime -= PENALTY_SECONDS;
  if (remainingTime < 0) remainingTime = 0;
  updateUI();
  showAchievement(reason === 'click' ? `Miss! -${PENALTY_SECONDS}s` : `Can expired! -${PENALTY_SECONDS}s`);
  // Immediately spawn next can for continuous gameplay
  clearCurrentCan();
  spawnWaterCan();
  // If time depleted, end the game
  if (remainingTime <= 0) endGame(false);
}

// Remove current can and clear its timeout
function clearCurrentCan() {
  clearTimeout(canTimeout);
  canTimeout = null;
  document.querySelectorAll('.grid-cell').forEach(c => {
    const wrapper = c.querySelector('.water-can-wrapper');
    if (wrapper) wrapper.remove();
  });
}

// Spawns a new item in a random grid cell
function spawnWaterCan() {
  if (!gameActive) return; // Stop if the game is not active
  const cells = document.querySelectorAll('.grid-cell');
  
  // Clear all cells before spawning a new water can
  cells.forEach(cell => (cell.innerHTML = ''));

  // Select a random cell from the grid to place the water can
  const randomCell = cells[Math.floor(Math.random() * cells.length)];

  // Use a template literal to create the wrapper and water-can element
  randomCell.innerHTML = `
    <div class="water-can-wrapper">
      <div class="water-can" data-can="1"></div>
    </div>
  `;
  // Clear any existing can timeout and set a new one
  clearTimeout(canTimeout);
  canTimeout = setTimeout(() => {
    // If game still active and can still present -> treat as missed
    if (!gameActive) return;
    const wrapper = document.querySelector('.water-can-wrapper');
    if (wrapper) {
      // remove and count as miss
      wrapper.remove();
      handleMiss('expired');
    }
  }, CAN_LIFETIME_MS);
}

// Collect a can
function collectCan(canElement) {
  // remove can immediately to prevent double counting
  const wrapper = canElement.closest('.water-can-wrapper');
  if (wrapper) wrapper.remove();
  clearTimeout(canTimeout);
  canTimeout = null;

  currentCans += SCORE_PER_CAN;
  updateUI();

  // Feedback
  if (currentCans >= GOAL_CANS) {
    endGame(true);
    return;
  }
  if (currentCans === 5) showAchievement('Great start — 5 cans!');
  if (currentCans === 10) showAchievement('Awesome — 10 cans!', 1500);

  // Spawn next can for immediate feedback
  spawnWaterCan();
}

// Start the countdown timer
function startTimer() {
  remainingTime = GAME_TIME;
  updateUI();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remainingTime -= 1;
    updateUI();
    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      endGame(false);
    }
  }, 1000);
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return; // Prevent starting a new game if one is already active
  gameActive = true;
  currentCans = 0;
  remainingTime = GAME_TIME;
  updateUI();
  showAchievement('Game started — collect cans!', 1200);
  clearCurrentCan();
  createGrid();

  // Start spawning and timer
  spawnWaterCan();
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnWaterCan, SPAWN_INTERVAL_MS);
  startTimer();
}

// End the game, win indicates if player reached the goal
function endGame(won = true) {
  gameActive = false;
  clearInterval(spawnInterval); spawnInterval = null;
  clearInterval(timerInterval); timerInterval = null;
  clearTimeout(canTimeout); canTimeout = null;
  // clear board
  document.querySelectorAll('.grid-cell').forEach(c => (c.innerHTML = ''));
  if (won) {
    showAchievement(`You reached ${GOAL_CANS} cans! Well done!`, 0);
  } else {
    showAchievement(`Time's up — you collected ${currentCans}/${GOAL_CANS}.`, 0);
  }
  updateUI();
}

// Helper: show/hide start/end overlays
function showStartScreen() {
  const s = document.getElementById('start-screen');
  if (s) s.removeAttribute('hidden');
  const e = document.getElementById('end-screen');
  if (e) e.setAttribute('hidden', '');
}
function hideStartScreen() {
  const s = document.getElementById('start-screen');
  if (s) s.setAttribute('hidden', '');
}
function showEndScreen(message) {
  const e = document.getElementById('end-screen');
  const msg = document.getElementById('end-message');
  if (msg) msg.textContent = message;
  if (e) e.removeAttribute('hidden');
}

// Progress bar update
function updateProgressBar() {
  const fill = document.getElementById('progress-fill');
  if (!fill) return;
  const pct = Math.min(100, Math.round((currentCans / GOAL_CANS) * 100));
  fill.style.width = pct + '%';
}

// Wire overlay buttons (start + replay) to game flow
document.getElementById('start-overlay-btn')?.addEventListener('click', () => {
  hideStartScreen();
  startGame();
});
document.getElementById('replay-btn')?.addEventListener('click', () => {
  const endMsg = `You collected ${currentCans}/${GOAL_CANS}.`;
  showAchievement('Restarting…', 800);
  hideStartScreen();
  showStartScreen(); // quick reset to allow players to see start screen again if desired
  setTimeout(() => {
    hideStartScreen();
    startGame();
  }, 300);
});

// ensure start button (existing) hides overlay if pressed
document.getElementById('start-game')?.addEventListener('click', () => {
  hideStartScreen();
  startGame();
});

// show the start screen initially for clarity
showStartScreen();

// Handle collection via event delegation using pointer events (works for mouse/touch)
document.querySelector('.game-grid').addEventListener('pointerdown', (e) => {
  if (!gameActive) return;
  const can = e.target.closest('.water-can');
  const cell = e.target.closest('.grid-cell');
  if (can) {
    collectCan(can);
  } else if (cell) {
    // clicked an empty cell => apply miss penalty
    handleMiss('click');
  }
});

// Initialize UI and grid on load
initSettingsUI();
createGrid();
