# Bomb Battle Arena - 2 Player Local Browser Game

This is an original Bomberman-inspired 2-player browser game made for local play on the same PC.

## Features
- 2 players on the same keyboard
- Controller support for up to 2 controllers
- Full screen support
- Bomb placement and explosions
- Chain reactions
- Breakable crates
- Hidden power-ups under crates
- Score tracking and automatic next round
- Pause and restart
- Collapsible bottom info section
- Map selector with 4 arenas

## Maps
- Classic Ruins
- Crossfire Alleys
- Spiral Fortress
- Royal Vault

## Controls
### Keyboard
- Player 1: `W A S D` to move, `F` to place bomb
- Player 2: `Arrow Keys` to move, `Enter` to place bomb
- `P` = pause
- `R` = restart match
- `K` = enter / exit full screen

### Controllers
- Left stick or D-pad = move
- Cross / A / first action button = place bomb

## Power-ups
Per round spawn counts:
- Bigger bomb blast: up to 5
- Ghost: up to 3
- More bombs: up to 2
- More speed: up to 2
- Shield: up to 2
- Heart: up to 2

Ghost lasts 6 seconds. If it expires while a player is still inside crate tiles, the player can keep moving through crates until they reach open ground.

## Run locally
Open `index.html` in a browser.

## Upload to GitHub Pages
1. Create a new GitHub repository
2. Upload all files from this folder
3. In GitHub, open **Settings** -> **Pages**
4. Set the source to the main branch root
5. Save
6. GitHub will generate a public link for the game


Update: compacted the top HUD and fullscreen layout so the arena gets more visible space while still fitting the screen cleanly.
