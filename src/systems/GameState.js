
import { useSyncExternalStore } from 'react'
import { createStudents } from './IdentitySystem.js'
import { initAudio, startDrone, sfx } from './Audio.js'
import { revealAll } from './ExposureSystem.js'

// ------------------------------------
// INITIAL BLACKBOARD CONTENT
// ------------------------------------

const INITIAL_BOARD_SECTIONS = {
  rules: [
    'SURVIVE UNTIL THE FINAL BELL.',
    'OBSERVE YOUR CLASSMATES.',
    'DO NOT TRUST EVERYTHING WRITTEN HERE.',
    'A WRONG ACCUSATION HAS CONSEQUENCES.',
    'NEVER SIT IN AN EMPTY CHAIR.',
    'WATCH THE LIGHTS. THEY WARN YOU.'
  ],

  identities: [
    'VAMPIRE: CANNOT SEE ITS REFLECTION.',
    'WEREWOLF: REACTS TO THE MOON.',
    'GHOST: DOES NOT ALWAYS DISTURB OBJECTS.',
    'WITCH: LEAVES STRANGE SYMBOLS.',
    'SHAPESHIFTER: COPIES SOMEONE ELSE.',
    'DEMON: BEHAVES STRANGELY AROUND OTHERS.',
    'ZOMBIE: MAY FORGET TO BLINK.',
    'SIREN: ATTRACTS ATTENTION UNNATURALLY.'
  ],

  warnings: [
    'SOMEONE IN THIS ROOM IS ALREADY DEAD.',
    'THE CLASSROOM IS NOT WHAT IT SEEMS.',
    'DO NOT TRUST YOUR OWN REFLECTION.'
  ]
}

// ------------------------------------
// CREATE A FRESH GAME SESSION
// ------------------------------------

const fresh = (T) => {
  const boardSections = JSON.parse(
    JSON.stringify(INITIAL_BOARD_SECTIONS)
  )

  const initialBoardText = Object.values(boardSections)
    .flat()
    .join('\n')

  return {
    T,
    t: 0,
    anim: 0,
    secs: T,

    // Player condition
    hp: 100,
    fear: 0,
    sanity: 100,
    fearFlash: 0,
    damageFlash: 0,
    highFearTriggered: false,

    // Bells
    bells: [0.14, 0.28, 0.42, 0.58, 0.76].map(
      f => f * T
    ),
    nextBell: 0,
    bellCount: 0,
    ringing: 0,
    bellRinging: false,

    // Classroom state
    frozenUntil: 0,
    frozen: false,
    night: false,
    dark: false,
    darkEnd: 0,
    flick: 0,
    next: Infinity,

    // Supernatural effects
    clockRev: 0,
    clockOff: 0,
    reflect: 0,
    chairs: 0,
    objects: 0,
    objectSeats: [],
    sil: 0,
    silZ: -3,
    movers: [],

    // Horror escalation
    paranoiaTimer: undefined,
    hauntings: [],
    lastHaunting: 0,
    supernaturalLevel: 0,

    // Interface
    notes: [],
    message: null,
    focus: '',
    lookUntil: 0,

    // Blackboard
    boardSections,
    boardMessages: [],

    board: {
      text: initialBoardText,
      shown: Infinity,
      id: Math.random()
    },

    boardLog: [],

    // Event system
    queue: [],
    pending: null,
    phantom: 0,
    phantomSeat: -1,

    // Classroom rules
    rules: {
      emptyChair: false
    },
    chairT: 0,

    // Player position
    player: {
      x: 0,
      z: 4.2,
      yaw: 0,
      pitch: 0
    },

    paused: false
  }
}

// ------------------------------------
// MAIN GAME OBJECT
// ------------------------------------

export const game = {
  screen: 'menu',
  round: 0,
  won: false,
  bookOpen: false,
  students: [],

  refs: {
    chairs: [],
    books: []
  },

  ...fresh(1200)
}

// ------------------------------------
// GAME STATE SUBSCRIPTIONS
// ------------------------------------

let version = 0
const subs = new Set()

export const emit = () => {
  version++
  subs.forEach(fn => fn())
}

export const useGame = () => {
  useSyncExternalStore(
    cb => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => version
  )

  return game
}

// ------------------------------------
// SCHEDULED EVENTS
// ------------------------------------

export const schedule = (delay, fn) => {
  game.queue.push({
    at: game.t + delay,
    fn
  })
}

// ------------------------------------
// PLAYER NOTIFICATIONS
// ------------------------------------

export function note(text, kind = '') {
  const n = {
    id: Math.random(),
    text,
    kind
  }

  game.notes = [...game.notes.slice(-3), n]

  emit()

  setTimeout(() => {
    game.notes = game.notes.filter(x => x !== n)
    emit()
  }, 5000)
}

export function say(text) {
  game.message = {
    text,
    id: Math.random()
  }

  emit()
}

// ------------------------------------
// FEAR SYSTEM
// ------------------------------------

export function addFear(amount, reason = '') {
  if (game.screen !== 'play') return

  game.fear = Math.min(100, game.fear + amount)
  game.sanity = Math.max(0, 100 - game.fear)

  game.fearFlash = 0.5

  if (reason) {
    note(reason, 'bad')
  }

  if (game.fear >= 80 && !game.highFearTriggered) {
    game.highFearTriggered = true

    note(
      'Your hands are shaking. Something is very close.',
      'bad'
    )
  }

  if (game.fear < 80) {
    game.highFearTriggered = false
  }

  emit()
}

export function reduceFear(amount) {
  game.fear = Math.max(0, game.fear - amount)
  game.sanity = Math.max(0, 100 - game.fear)

  emit()
}

// ------------------------------------
// HAUNTING SYSTEM
// ------------------------------------

export function registerHaunting(studentId) {
  const existing = game.hauntings.find(
    h => h.studentId === studentId
  )

  if (existing) return

  game.hauntings.push({
    studentId,
    intensity: 1,
    active: true,
    lastAppearance: 0,
    appearances: 0
  })

  game.lastHaunting = game.t

  addFear(
    15,
    'You should not have accused them.'
  )

  emit()
}

export function increaseHaunting(studentId) {
  const haunting = game.hauntings.find(
    h => h.studentId === studentId
  )

  if (!haunting) return

  haunting.intensity = Math.min(
    5,
    haunting.intensity + 1
  )

  addFear(10)

  emit()
}

export function clearHaunting(studentId) {
  game.hauntings = game.hauntings.filter(
    h => h.studentId !== studentId
  )

  emit()
}

// ------------------------------------
// GAME START
// ------------------------------------

export function startGame(T = 1200) {
  // Only allow the two supported game modes.
  const duration = T === 300 ? 300 : 1200

  initAudio()
  startDrone()

  Object.assign(
    game,
    fresh(duration),
    {
      screen: 'play',
      round: game.round + 1,
      won: false,
      bookOpen: false,
      students: [],
      refs: {
        chairs: [],
        books: []
      }
    }
  )

  // Create a new set of classmates.
  game.students = createStudents()

  emit()

  note(
    'You take the empty seat. Everything seems perfectly normal. Watch how everyone behaves.'
  )
}

// ------------------------------------
// GAME END
// ------------------------------------

export function endGame(won) {
  if (game.screen !== 'play') return

  game.won = won
  game.bookOpen = false
  game.dark = false
  game.flick = 0

  document.exitPointerLock?.()

  if (won) {
    game.flick = 1.5
    sfx.bell()
    revealAll()
  }

  game.screen = 'ending'

  emit()

  setTimeout(() => {
    game.screen = 'end'
    emit()
  }, won ? 4500 : 800)
}

// ------------------------------------
// NOTEBOOK
// ------------------------------------

export function toggleBook(on) {
  if (
    game.screen !== 'play' ||
    (on !== false && game.t < game.frozenUntil)
  ) {
    return
  }

  game.bookOpen =
    on === undefined
      ? !game.bookOpen
      : on

  if (game.bookOpen) {
    document.exitPointerLock?.()
  } else {
    try {
      document
        .querySelector('canvas')
        ?.requestPointerLock?.()
        ?.catch?.(() => {})
    } catch (e) {}
  }

  emit()
}
