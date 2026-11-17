
import { useFrame } from '@react-three/fiber'
import { game, emit, endGame, note, schedule } from './GameState.js'
import { fireAmbient, relight, ringBell, hurt } from './EventSystem.js'
import { writeBoard, boardDone } from './BoardSystem.js'
import { R, wrap, seatPos, emptySeat } from './IdentitySystem.js'

export const PHASES = [
  'Before the first bell',
  'After the first bell',
  'After the second bell',
  'After the third bell',
  'After the fourth bell',
  'After the fifth bell'
]

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

export default function Simulation() {
  useFrame((_, delta) => {
    if (game.screen !== 'play' || game.bookOpen || game.paused) return

    const dt = Math.min(0.05, delta)

    // MAIN GAME TIMER
    game.t += dt

    const secs = Math.max(0, Math.ceil(game.T - game.t))
    const frozen = game.t < game.frozenUntil

    if (secs !== game.secs || frozen !== game.frozen) {
      game.secs = secs
      game.frozen = frozen
      emit()
    }

    // BELL SYSTEM
    if (
      !game.bellRinging &&
      !game.dark &&
      game.nextBell < 5 &&
      game.t >= game.bells[game.nextBell]
    ) {
      game.nextBell++
      ringBell(game.nextBell)
    }

    // SCHEDULED EVENTS
    if (game.queue.length) {
      const due = game.queue.filter(q => game.t >= q.at)

      game.queue = game.queue.filter(q => game.t < q.at)

      due.forEach(q => q.fn())
    }

    // RESTORE LIGHTING
    if (game.dark && game.t >= game.darkEnd) {
      relight()
    }

    // HORROR ESCALATION
    if (
      !game.bellRinging &&
      !game.dark &&
      game.bellCount >= 2 &&
      game.t >= game.next
    ) {
      const intervals =
        game.bellCount <= 3
          ? [25, 40]
          : game.bellCount === 4
            ? [16, 26]
            : [8, 14]

      game.next =
        game.t +
        R(intervals[0], intervals[1]) *
        Math.max(0.35, game.T / 1200)

      fireAmbient()
    }

    // SUPERNATURAL EFFECT TIMERS
    for (const key of [
      'clockRev',
      'reflect',
      'chairs',
      'objects',
      'sil',
      'flick'
    ]) {
      game[key] = Math.max(0, (game[key] || 0) - dt)
    }

    // CLOCK REVERSE EFFECT
    if (game.clockRev > 0) {
      game.clockOff -= 2 * dt * (20 / game.T)
    }

    // PLAYER POSITION
    const p = game.player

    // PHANTOM STUDENT
    if (
      game.pending === 'phantom' &&
      !game.bellRinging &&
      !game.dark &&
      !frozen &&
      boardDone() &&
      Math.abs(wrap(p.yaw)) < 0.6 &&
      p.pitch > -0.4 &&
      p.z > -1
    ) {
      game.pending = null

      writeBoard('THERE ARE EIGHT OF THEM.', true)

      schedule(6, () => {
        game.phantomSeat = emptySeat()
        game.phantom = 8

        note(
          'Someone is sitting in the empty chair.',
          'bad'
        )
      })

      schedule(13, () => {
        game.phantom = 0

        writeBoard(
          'THERE HAVE ALWAYS BEEN EIGHT.',
          true
        )
      })
    }

    // EMPTY CHAIR CONSEQUENCES
    if (game.rules?.emptyChair) {
      const empty = emptySeat()
      const position = empty >= 0 ? seatPos(empty) : null

      if (
        position &&
        Math.hypot(
          p.x - position.x,
          p.z - position.z
        ) < 0.6
      ) {
        game.chairT += dt

        if (game.chairT > 1.2) {
          game.chairT = -8

          hurt(15, 'The empty chair was not empty.')

          note(
            'Something just sat beside you.',
            'bad'
          )
        }
      } else {
        game.chairT = Math.min(
          0,
          game.chairT + dt
        )
      }
    }

    // CLASSROOM PARANOIA
    if (
      game.bellCount >= 3 &&
      !game.dark &&
      !game.bellRinging
    ) {
      if (game.paranoiaTimer === undefined) {
        game.paranoiaTimer = game.t + R(35, 55)
      }

      if (game.t >= game.paranoiaTimer) {
        game.paranoiaTimer = game.t + R(35, 65)

        const events = [
          'Someone just whispered your name.',
          'You hear a chair moving behind you.',
          'The classroom suddenly feels colder.',
          'Someone is watching you.',
          'You hear footsteps, but nobody is moving.',
          'A student just stopped breathing.'
        ]

        note(
          events[Math.floor(Math.random() * events.length)],
          'bad'
        )
      }
    }

    // FINAL BELL
    if (game.t >= game.T) {
      endGame(true)
    }
  })

  return null
}
