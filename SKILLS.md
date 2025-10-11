# Project Skills & Areas to Practice

Summary
- Beginner-friendly project that covers core front-end topics. Focus on DOM, events, timers, layout, and simple animations.

JavaScript (core)
- DOM selection and manipulation (querySelector, innerHTML, appendChild, classList).
- Event handling (addEventListener for clicks and touch events).
- State management (tracking currentCans, gameActive, timers).
- Timers (setInterval, clearInterval, setTimeout).
- Randomization (Math.random for spawn positions).
- Updating the UI (textContent/innerText for counters and timer).
- Basic game logic (start/end game, win/lose conditions, scoring).
- Defensive coding (prevent duplicate event handlers, guard clauses).
- Debugging basics (console.log, breakpoint debugging in DevTools).

JavaScript (optional/advanced)
- Modular code structure (IIFE or ES modules) to keep global scope clean.
- Debouncing/throttling clicks if needed.
- Preloading assets (Image objects or CSS sprites).
- Touch event handling for mobile (touchstart/touchend).
- Accessibility scripting (keyboard controls, ARIA updates).

CSS
- Layout with CSS Grid for the 3x3 grid and responsive sizing.
- Positioning (relative/absolute) for pop-up items inside grid cells.
- Transitions and animations (keyframes, transform, opacity).
- Responsive design (media queries, flexible sizes).
- Asset usage (background-image, background-size).
- Visual feedback (hover, active, focus states).
- Performance considerations (use transform/opacity for animations to avoid layout thrashing).

HTML
- Semantic structure (buttons, headings, sections).
- Using images and assets with correct paths.
- Accessible controls (button elements, ARIA-live for dynamic content).
- Minimal, clear DOM structure for easy scripting.

Trickier elements (things that may require extra practice)
- Synchronizing timers and UI: ensuring the timer stops at game end and intervals are cleared to avoid memory leaks or duplicated intervals.
- Click/tap handling across devices: differences between mouse and touch events and preventing double counts on mobile.
- Preventing race conditions: e.g., clicking a can just as spawn/clear runs; ensure atomic state updates.
- Smooth animations that don't trigger layout recalculation: prefer transform and opacity.
- Asset loading and missing images: handle fallback if water-can image not loaded.
- Game state persistence (optional): saving high score to localStorage.
- Accessibility: making the game playable via keyboard and screen readers requires deliberate ARIA updates and focus management.

Suggested learning plan for 2 weeks
- Days 1–2: DOM basics and event handling; build simple UI updates.
- Days 3–4: Timers, randomization, and simple game loop.
- Days 5–7: CSS Grid, animations, responsive layout.
- Days 8–10: Polish interactions (touch support, prevent double clicks), add sounds if desired.
- Days 11–14: Accessibility, testing on mobile, bug fixing, and optional features (high scores, levels).

Resources
- MDN Web Docs: DOM, Events, CSS Grid, Animations.
- FreeCodeCamp / Codecademy modules for JS and CSS fundamentals.
- Chrome DevTools walkthroughs for debugging and performance.

# Skills & Notes

- JavaScript: DOM selection/manipulation, events (pointer events), setInterval/clearInterval, state management.
- CSS: Grid layout, responsive sizing, transitions/animations, theming with brand colors.
- HTML: semantic elements, ARIA live regions for dynamic messages.

Branding: this project uses charity: water's color palette for visual reference — students should cite the charity's mission when describing the project.

Good luck — focus on the basics first (DOM, events, timers) and add polish once core mechanics are solid.
