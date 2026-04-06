# Rhythm Blast - OTB Games

## What It Does
Rhythm/music educational game for ages 5-8. Notes fall down neon lanes. Each note carries math or reading content. Player taps the correct lane on the beat. Education IS the gameplay, no pauses or overlays.

## Tech Stack
- Vanilla HTML5/CSS/JS, Canvas 2D (no frameworks, no build step)
- Web Audio API for synthesized music and SFX
- PWA with service worker for offline play
- Part of OTB Games product line (shared design system, ecosystem.js)

## Dev Server
- Port: 8083
- Command: `node node_modules/serve/build/main.js -l 8083 -s .`

## Key Files
- `js/game.js` - Core rhythm engine (note falling, hit detection, scoring, canvas rendering)
- `js/audio.js` - Web Audio synthesized music, beat scheduling, SFX
- `js/song-data.js` - Song definitions (BPM, melodies, note charts)
- `js/note-generator.js` - Converts MathData/ReadingData questions into note patterns
- `js/main.js` - App controller, screen routing, UI wiring
- `js/progress.js` - LocalStorage save/load, star tracking
- `js/ecosystem.js` - OTB cross-game profile (shared)
- `js/math-data.js` / `js/reading-data.js` - Question generators (shared from ThinkFast)

## Game Accent Color
- Purple: `--game-accent: #a855f7` (distinct from ThinkFast pink #e94560 and Word Mine green #4a8f3f)

## DO NOT Change
- Port 8083
- Shared design system CSS
- Game accent purple (brand differentiation)
- Lane count: 3 lanes for MVP
