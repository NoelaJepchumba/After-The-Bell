# Implementation Plan: Pause / Resume System

## Overview

Five targeted line-level edits wire up the existing `game.paused` flag to the three frame-driven subsystems and the pointer-lock call. No new files, no new dependencies.

## Tasks

- [x] 1. Initialise `paused` in `GameState.js`
  - In `fresh(T)`, add `paused: false` as the last field of the returned object (after the `player` block).
  - `startGame` merges `fresh()` via `Object.assign`, so the reset is automatic — no further change needed.
  - _Requirements: 1.1, 6.1_
  - [x] 1.1 Add `paused: false` to the object returned by `fresh(T)`
    - _Requirements: 1.1, 6.1_
  - [x] 1.2 Verify restart clears pause (manual check 7)
    - Console: set `game.paused = true`, call `startGame(game.T)`, assert `game.paused === false`.
    - _Requirements: 4.3_

- [x] 2. Freeze the Game Loop in `Simulation.js`
  - Extend the existing `useFrame` early-return guard with `|| game.paused`.
  - [x] 2.1 Change the guard from `if (game.screen !== 'play' || game.bookOpen) return` to `if (game.screen !== 'play' || game.bookOpen || game.paused) return`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 6.1, 6.4_
  - [x] 2.2 Verify simulation freeze (manual check 1)
    - Console: set `game.paused = true`, tick `useFrame` with `delta = 0.016`, assert `game.t` and all Supernatural_Timer fields are unchanged.
    - _Requirements: 1.1, 1.2_

- [x] 3. Freeze student behaviours in `Students.jsx`
  - Extend the existing `useFrame` early-return guard with `|| game.paused`.
  - [x] 3.1 Change the guard from `if (game.screen === 'menu' || (game.screen === 'play' && game.bookOpen)) return` to `if (game.screen === 'menu' || (game.screen === 'play' && game.bookOpen) || game.paused) return`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 3.2 Verify student freeze (manual check 2)
    - Console: snapshot each student's `x`, `z`, `yaw`, and animation fields, set `game.paused = true`, tick `useFrame`, assert all values are bitwise-identical to the snapshot.
    - _Requirements: 2.1, 2.3_

- [x] 4. Disable player input in `Player.jsx`
  - Two guard changes in the same file; both touch adjacent lines.
  - [x] 4.1 Extend the movement if-block condition: add `&& !game.paused` so it reads `if (game.screen === 'play' && !game.bookOpen && !game.paused && game.t >= game.frozenUntil)`
    - _Requirements: 3.1_
  - [x] 4.2 Extend the `mousemove` handler early-return: add `|| game.paused` so it reads `if (game.screen !== 'play' || game.bookOpen || game.paused) return`
    - _Requirements: 3.2_
  - [x] 4.3 Verify movement and mouse freeze (manual checks 3 and 4)
    - Check 3: set `game.paused = true`, populate `keys.current = { KeyW: true }`, tick `useFrame`, assert `game.player.x` and `game.player.z` unchanged.
    - Check 4: set `game.paused = true`, dispatch `mousemove` with `movementX: 50, movementY: 50`, assert `game.player.yaw` and `game.player.pitch` unchanged.
    - _Requirements: 3.1, 3.2_

- [x] 5. Release pointer lock on pause in `GameInterface.jsx`
  - Inside `pauseGame`, after `game.paused = !game.paused`, add `if (game.paused) document.exitPointerLock?.()`.
  - [x] 5.1 Add the `document.exitPointerLock?.()` call inside `pauseGame`
    - _Requirements: 3.3_
  - [x] 5.2 Verify pointer lock release and keyboard toggle (manual checks 5 and 6)
    - Check 5: replace `document.exitPointerLock` with a spy, call `pauseGame()` with `game.screen === 'play'` and `game.bookOpen === false`, assert spy was called.
    - Check 6: dispatch `keydown` for `KeyP` → assert `game.paused` toggles; dispatch again with `repeat: true` → assert no second toggle.
    - _Requirements: 3.3, 5.1, 5.2_

- [x] 6. Checkpoint — verify all five changes together
  - Ensure all manual checks pass end-to-end in the browser. Ask the user if any behaviour is unexpected.

## Notes

- Tasks marked with `*` are optional verification steps that can be skipped for a faster merge.
- Each sub-task references the specific requirements clause it satisfies for traceability.
- No new files, test runners, or dependencies are introduced — all verification is done via the browser console as described in the design's Testing Strategy section.
- The camera update block in `Player.jsx` is intentionally left unconditional; the frozen scene must continue rendering behind the pause overlay (Requirement 3.5).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "4.2", "5.1"] },
    { "id": 2, "tasks": ["1.2", "2.2", "3.2", "4.3", "5.2"] }
  ]
}
```
