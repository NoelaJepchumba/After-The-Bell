# Requirements Document

## Introduction

After The Bell has a pause menu UI with Resume, Restart, and Main Menu buttons, and P/ESC keyboard shortcuts already in place. However the underlying game loop does not respect the paused state: the timer, scheduled events, ambient horror events, bell scheduling, student behaviours, classroom animations, and player controls all continue to run while the menu is visible.

This feature completes the pause/resume system so that toggling pause produces a true freeze of every game system, and resume restores the session from exactly the state it was in before pausing.

## Glossary

- **Game_Loop**: The `useFrame` callback inside `Simulation.js` that advances `game.t`, fires bells, processes the event queue, and triggers ambient horror events.
- **Student_Behaviour_Loop**: The `useFrame` callback inside `Students.jsx` that calls `updateStudent` and `animateBody` / `animateDeath` for each student each frame.
- **Player_Controller**: The `useFrame` callback inside `Player.jsx` that reads keyboard input, moves the player, and runs gaze detection.
- **Pause_Menu**: The overlay rendered by `GameInterface.jsx` when `game.paused` is `true`, containing Resume, Restart, and Main Menu buttons.
- **GameState**: The singleton `game` object in `GameState.js` together with its `emit` helper.
- **Event_Queue**: The `game.queue` array of time-stamped callbacks processed each frame by the Game_Loop.
- **Scheduled_Event**: Any entry added to the Event_Queue via the `schedule()` helper.
- **Ambient_Event**: A one-off horror effect fired by `fireAmbient()` in `EventSystem.js`.
- **Supernatural_Timer**: Any field in `game` that counts down each frame (`clockRev`, `reflect`, `chairs`, `objects`, `sil`, `flick`, `dark`/`darkEnd`, `frozenUntil`, `paranoiaTimer`, `next`).
- **Pointer_Lock**: The browser's pointer-lock API used to capture mouse movement for camera control.

---

## Requirements

### Requirement 1: Freeze the Game Loop While Paused

**User Story:** As a player, I want the game timer and all scheduled activity to stop when I pause, so that nothing changes in my absence.

#### Acceptance Criteria

1. WHEN `game.paused` is `true`, THE Game_Loop SHALL skip all timer advancement, bell scheduling, Event_Queue processing, and ambient horror event scheduling without altering any game state values.
2. WHEN `game.paused` is `true`, THE Game_Loop SHALL skip all Supernatural_Timer countdown updates so that active effects (darkness, reversed clock, chair rotation, etc.) do not expire or progress.
3. WHEN `game.paused` changes from `true` to `false`, THE Game_Loop SHALL resume advancing `game.t` and processing the Event_Queue from the exact values present at the moment of pause, with no more than one missed frame delta of drift (≤ 1 frame at 60 fps, i.e., ≤ 16.67 ms).
4. WHILE `game.paused` is `true`, THE Game_Loop SHALL continue to run its `useFrame` registration so that React Three Fiber does not unmount it.
5. IF `game.paused` toggles more than once within a single frame, THEN THE Game_Loop SHALL treat the final value of `game.paused` in that frame as the authoritative state and apply it without partial application of any skipped or resumed logic.
6. WHILE `game.paused` is `true`, THE Game_Loop SHALL not modify `game.t`, any Supernatural_Timer countdown value, any Event_Queue entry, or any ambient horror schedule counter by any amount, including zero-delta updates.

---

### Requirement 2: Freeze Student Behaviours While Paused

**User Story:** As a player, I want classmates to stop moving and animating when I pause, so that the scene is visually still and no clue-gathering or relationship changes occur.

#### Acceptance Criteria

1. WHILE `game.paused` is `true`, THE Student_Behaviour_Loop SHALL skip the `updateStudent` call (imported from `Behaviours.js`) for every student, leaving each student's position and rotation unchanged (delta of 0 units) from their values at the moment `game.paused` became `true`.
2. WHILE `game.paused` is `true`, THE Student_Behaviour_Loop SHALL skip all clue discovery, exposure, and relationship update calls for every student, leaving each student's clue, exposure, and relationship state unchanged from their values at the moment `game.paused` became `true`.
3. WHILE `game.paused` is `true`, THE Student_Behaviour_Loop SHALL skip the `animateBody` and `animateDeath` calls (both defined in `Students.jsx`) for every student, holding each student's skeletal and facial animation at the frame index active when `game.paused` became `true`.
4. THE Student_Behaviour_Loop SHALL add a `game.paused` guard to the existing early-return condition, so that the full condition reads: `if (game.screen === 'menu' || (game.screen === 'play' && game.bookOpen) || game.paused) return`, leaving the existing screen and `bookOpen` guards intact.
5. WHEN `game.paused` changes from `true` to `false`, THE Student_Behaviour_Loop SHALL resume each student's `updateStudent`, animation, clue, exposure, and relationship calls using the position, rotation, animation frame index, and state values frozen at pause time, with no reset or replay of any of those values.

---

### Requirement 3: Disable Player Movement and Camera Control While Paused

**User Story:** As a player, I want my character to be immobile and my camera to be locked when I pause, so that I cannot accidentally move or look around while the menu is open.

#### Acceptance Criteria

1. WHILE `game.paused` is `true`, THE Player_Controller SHALL skip movement input processing inside the `useFrame` callback — the existing guard `game.screen === 'play' && !game.bookOpen && game.t >= game.frozenUntil` SHALL be extended to also require `!game.paused` — so that WASD and arrow keys do not change `game.player.x` or `game.player.z`, and any movement inputs received during this state SHALL be discarded and not replayed when `game.paused` becomes `false`.
2. WHILE `game.paused` is `true`, THE Player_Controller SHALL skip mouse-movement processing — the existing `mousemove` handler guard `game.screen !== 'play' || game.bookOpen` SHALL be extended to also return early when `game.paused` is `true` — so that mouse movement does not change `game.player.yaw` or `game.player.pitch`.
3. WHEN `game.paused` becomes `true`, THE Player_Controller SHALL call `document.exitPointerLock?.()` to release Pointer_Lock so that the cursor is visible and the browser can receive click events on the Pause_Menu.
4. WHEN `game.paused` changes from `true` to `false`, THE Player_Controller SHALL continue from the player's current position and camera angle without resetting or snapping, and SHALL call `gl.domElement.requestPointerLock?.()` to re-acquire Pointer_Lock so that subsequent mouse movement resumes camera control.
5. WHILE `game.paused` is `true`, THE Player_Controller SHALL update the Three.js camera position and rotation from the stored `game.player` values each frame so that the frozen scene renders correctly behind the Pause_Menu overlay.

---

### Requirement 4: Keep the Pause Menu Visible and Functional While Paused

**User Story:** As a player, I want the pause menu to remain on screen and responsive throughout the pause, so that I can choose Resume, Restart, or Main Menu without interference from the game.

#### Acceptance Criteria

1. WHILE `game.paused` is `true`, THE Pause_Menu SHALL remain rendered on top of the 3D scene, with student movement, game timer countdown, and AI behaviour halted.
2. WHEN the Resume button is clicked, THE Pause_Menu SHALL set `game.paused` to `false`, closing the pause menu and re-enabling student movement, AI behaviour, and the game timer countdown.
3. WHEN the Restart button is clicked, THE Pause_Menu SHALL call `startGame(game.T)` to start a new session with the same game-mode duration, resetting all game state via the existing `startGame` function.
4. WHEN the Main Menu button is clicked, THE Pause_Menu SHALL set `game.screen` to `'menu'` and set `game.paused` to `false`, closing the pause menu and returning the player to the main menu screen.
5. IF `game.bookOpen` is `true` and a pause toggle is attempted, THEN THE Pause_Menu SHALL remain hidden and `game.paused` SHALL remain `false`, so that the notebook and pause menu do not overlap.

---

### Requirement 5: Toggle Pause with Keyboard Shortcuts

**User Story:** As a player, I want to press P or ESC to pause and resume without reaching for the mouse, so that I can react quickly during play.

#### Acceptance Criteria

1. WHEN the player presses P or ESC and `game.screen` is `'play'` and `game.bookOpen` is `false`, THE `GameInterface.jsx` keyboard handler SHALL toggle `game.paused` and call `emit()` to notify subscribers.
2. IF a key-down event for P or ESC has `e.repeat` equal to `true`, THEN THE `GameInterface.jsx` keyboard handler SHALL ignore the event so that holding the key does not rapidly toggle the pause state.
3. WHEN `game.screen` is `'play'` and the player presses P or ESC, THE `GameInterface.jsx` keyboard handler SHALL call `preventDefault()` on the key event so that the browser does not capture those keystrokes for its own purposes.
4. THE `GameInterface.jsx` keyboard handler SHALL be registered as a persistent global `keydown` listener via the component's `useEffect` hook, using a runtime guard (`game.screen === 'play' && !game.bookOpen`) to suppress the shortcut outside of active gameplay, rather than adding and removing the listener as the screen value changes.

---

### Requirement 6: Resume Restores the Session Exactly

**User Story:** As a player, I want resuming to put me back in the exact situation I paused in, so that pausing has no effect on game progress or difficulty.

#### Acceptance Criteria

1. WHEN `game.paused` changes from `true` to `false`, THE Game_Loop SHALL advance `game.t` on the first resumed frame using only that frame's render delta, discarding any wall-clock time that elapsed during the pause interval, so that `game.t` continues from its value at the moment of pause.
2. WHEN `game.paused` changes from `true` to `false` and `game.nextBell` holds a scheduled bell threshold that has not yet been reached, THE Game_Loop SHALL fire the bell at that original `game.nextBell` threshold without recalculating or resetting it.
3. WHEN `game.paused` changes from `true` to `false`, THE Game_Loop SHALL resume all Supernatural_Timer countdown fields (`clockRev`, `reflect`, `chairs`, `objects`, `sil`, `flick`, `dark`, `darkEnd`, `frozenUntil`, `paranoiaTimer`, `next`) from the values those fields held at the moment of pause, so that in-progress effects continue for their remaining duration.
4. THE Game_Loop SHALL maintain `game.t` such that, across any game session that includes at least one pause and resume, the value of `game.t` equals the sum of all per-frame render deltas received while `game.paused` was `false`, within a tolerance of 1 ms.
