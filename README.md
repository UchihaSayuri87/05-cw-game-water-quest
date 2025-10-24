# charity: water – Water Quest Game Starter

In this game, users tap charity: water’s signature yellow jerry cans as fast as they can to earn points. You’ll be working from a partially built version of the game. Some functionality is already provided, and your job is to complete the rest.

## What’s Already Done

The starter files already include:

- A **heading and tagline**
- A **start button**
- A **game container** displaying a grid
- A **placeholder timer and score** (not functional yet)
- A **logo image** from charity: water
- Working code that:
  - Starts the game when the start button is clicked  
  - Makes jerry cans pop up randomly

## What You Need to Add

Here’s what you're required to implement to bring the game to life:

### Game Functionality

- **Update the score**
  - +1 point for each can clicked  

- **Add a 30-second timer**
  - When the timer reaches 0, the game ends  

- **Display a message when the game ends**
  - If the player scores **10 or more points**, show a **winning** message  
  - If the player scores **less than 10 points**, show a **"try again"** message  
  - Create one array of possible winning messages and one array of losing messages  
  - Depending on whether the user wins or loses, randomly pick and display a message from the appropriate array  

### Visual Styling

- **Add charity: water branding**
  
  - Use the provided logo  
  - Use the [charity: water brand guidelines](https://drive.google.com/file/d/1ct4zYRIwHAtxoNQoeaVwWYPdnruSC6sr/view) to stay on-brand with colors and styling
  - Add styling rules to ensure your game layout adjusts well across different screen sizes

These are the minimum requirements, but if you'd like an additional challenge go ahead and give the LevelUps a shot! For example, you could add logic to decrease the user's score if they miss a jerry can. Have fun and make the game your own!

If you have any questions or need any assistance with your code, reach out to the HelpHub or attend a Drop-In Hour. You got this!!

## Notes about audio assets
- Place the game's audio files (pop.mp3, bad.mp3, start.mp3, win.mp3) in either a "sounds/" or "sound/" folder at the project root.
- The runtime loader (assets.js) will try absolute paths first (/sounds, /sound) and then relative folders (sounds, sound), so either layout will work.
- If you still see 404s in DevTools, confirm the exact filenames and folder and update AUDIO_FOLDERS in assets.js to include the correct folder name.

