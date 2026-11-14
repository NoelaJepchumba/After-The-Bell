# After the Bell

A first-person 3D supernatural classroom simulation for the browser.
React + Vite + Three.js + React Three Fiber.

## Run it
```bash
npm install
npm run dev        # open the printed localhost URL
npm run build      # production build in /dist
```
Controls: **WASD** move (Shift to sprint), **mouse** look (click the room to capture, or drag), **N** notebook, **Esc** release mouse.

## The bells, the blackboard, the Exposure
- **Before the first bell** the room is ordinary and everyone is friendly.
- **Each bell** freezes you in place, kills the lights for a few seconds, plays a strange sound, brings the lights back and has the blackboard write a new message, letter by letter. Roughly a third of the messages are lies.
- **The room gets worse with each bell:** 1 night falls and writing appears, 2 odd behaviour, 3 people move seats in the dark (and a ninth student sits in the empty chair), 4 traits show, 5 lights fail repeatedly and the dark is dangerous.
- **The Exposure:** name someone correctly and the lights flicker, they freeze, everyone stares, they glitch and their true nature shows. Then they react: friendly (protects you), terrified (flees), hostile (hunts you) or unpredictable (pretends nothing happened, then turns).
- **Final bell:** every remaining secret is exposed.

## How it plays
- Look at a classmate for ~2 seconds to notice something. It goes into the notebook.
- Some clues are lies (misleading events, decoy tells, whispered messages).
- Blackouts: students vanish and change seats. Stay away from dangerous classmates when the lights return.
- A wrong accusation turns that student hostile and they come after you.
- Survive until the bell. Identifying all eight is the bonus challenge.

## Structure
```
src/
  App.jsx, main.jsx, styles.css
  components/   MainMenu, GameInterface (HUD), Notebook, StudentProfile, EndScreen
  classroom/    Classroom (room, board, clock, windows), Lighting, Furniture, Player (movement + observing)
  characters/   Students (3D students), Behaviours (body language + identity quirks)
  systems/
    GameState.js         shared mutable state + tiny store for the UI
    Simulation.js        time, phases, event schedule
    EventSystem.js       blackouts, clock, silhouette, chairs, reflection, messages, floating books
    ClueSystem.js        what you notice when you watch someone
    RelationshipSystem.js  like/dislike (separate from identity)
    IdentitySystem.js    identities, clue text, random assignment, accusations
    BoardSystem.js       the blackboard: what it writes, when it lies
    ExposureSystem.js    correct-guess reveal effects and reactions
    Audio.js             WebAudio drone, thud, bell (no files needed)
public/models, textures, sounds   empty: drop real assets here (Stage 12 polish)
```

## Tweak
- Night length: `startGame(1200)` in `MainMenu.jsx` (seconds).
- Event pacing: `Simulation.js`. Event list and weights: `EventSystem.js`.
- Add clues/identities: `IdentitySystem.js`.
