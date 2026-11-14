

import { game, note, emit, addFear } from './GameState.js'
import { exposeStudent } from './ExposureSystem.js'
import { writeBoard } from './BoardSystem.js'

export const IDENTITIES = [
  'Vampire',
  'Werewolf',
  'Ghost',
  'Witch',
  'Shapeshifter',
  'Demon',
  'Zombie',
  'Siren'
]

export const DANGEROUS = [
  'Vampire',
  'Werewolf',
  'Demon',
  'Zombie'
]

export const NAMES = [
  'Sam',
  'Mira',
  'Theo',
  'Lena',
  'Jonah',
  'Ivy',
  'Caleb',
  'Nora'
]

// ------------------------------------
// CLASSROOM SEATING
// ------------------------------------

export const COLX = [-3, 0, 3]
export const ROWZ = [-3, -0.6, 1.8]

export const seatPos = (i) => ({
  x: COLX[i % 3],
  z: ROWZ[Math.floor(i / 3)] + 0.8
})

// ------------------------------------
// UTILITIES
// ------------------------------------

export const R = (a, b) =>
  a + Math.random() * (b - a)

export const pick = (a) =>
  a[Math.floor(Math.random() * a.length)]

export const clamp = (v, a, b) =>
  Math.max(a, Math.min(b, v))

export const wrap = (a) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export const shuffle = (a) => {
  a = a.slice()

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }

  return a
}

// ------------------------------------
// TRUE IDENTITY CLUES
// ------------------------------------

export const CLUES = {
  Vampire: [
    'Skin is ice-pale, and they keep well away from the moonlit windows.',
    'Their chest never seems to rise or fall.',
    'Flinches whenever light touches their face.'
  ],

  Werewolf: [
    'Fidgets and trembles, as if holding something back.',
    'Keeps staring at the moon through the glass.',
    'Nostrils flare whenever you walk past.'
  ],

  Ghost: [
    'Hovers a hand’s width above the chair and flickers.',
    'Seems to fade when you look away.',
    'The air around them is far colder than the room.'
  ],

  Witch: [
    'Fingers twitch while small objects drift nearby.',
    'Mutters under their breath, lips barely moving.',
    'Their book is open to a page that keeps changing.'
  ],

  Shapeshifter: [
    'Looks subtly different each time you look back.',
    'Their height and build seem to shift between glances.',
    'Copies the posture of whoever sits nearby.'
  ],

  Demon: [
    'Eyes catch the dark with a faint red glow.',
    'Smiles a fraction too long.',
    'Radiates heat; the desk under their hands is warm.'
  ],

  Zombie: [
    'Sways slowly with the head tilted at an odd angle.',
    'Slow to react, then far too fast.',
    'Smells faintly of wet earth.'
  ],

  Siren: [
    'Hums a tune and your head turns toward it.',
    'Always watching you, whoever else is in the room.',
    'You feel a pull to sit closer to them.'
  ]
}

// ------------------------------------
// BLACKOUT CLUES
// ------------------------------------

export const TELLS = {
  Vampire: 'Crossed the room in the dark without a single sound.',
  Werewolf: 'A low growl in the dark came from this seat.',
  Ghost: 'Their chair was empty in the blackout, then it wasn’t.',
  Witch: 'Chalk drifted away from their hand in the dark.',
  Shapeshifter: 'Came back from the dark looking slightly different.',
  Demon: 'Their eyes glowed red in the blackout.',
  Zombie: 'Dragging, shuffling steps came from them in the dark.',
  Siren: 'A soft humming in the dark pulled you toward them.'
}

// ------------------------------------
// MISLEADING CLUES
// ------------------------------------

export const FALSE_CLUES = [
  'Their eyes briefly reflected a strange red light.',
  'They went completely still when the bell rang.',
  'Their shadow seemed to move a moment too late.',
  'They were staring at the empty chair.',
  'Their reflection looked slightly unfamiliar.',
  'A strange noise came from their desk.',
  'They smiled when nobody else was looking.',
  'Their hands were unusually cold.'
]

// ------------------------------------
// PERSONALITIES
// ------------------------------------

const PERSONALITIES = [
  'quiet',
  'curious',
  'nervous',
  'playful',
  'observant',
  'restless',
  'cold',
  'friendly'
]

const HABITS = [
  'taps their fingers against the desk',
  'looks repeatedly toward the classroom door',
  'adjusts their sleeves',
  'tilts their head when observing you',
  'plays with a pencil',
  'stares at the clock',
  'occasionally looks behind them',
  'keeps their eyes on their notebook'
]

// ------------------------------------
// CREATE STUDENTS
// ------------------------------------

export function createStudents() {
  const ids = shuffle(IDENTITIES)
  const seats = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8])

  // Vampires cannot sit beside the windows.
  const vampSeat = seats.find(x => x % 3 > 0)
  const rest = seats.filter(x => x !== vampSeat)

  // Sam always starts uneasy.
  const dislikers = new Set([
    0,
    ...shuffle([1, 2, 3, 4, 5, 6, 7]).slice(0, 2)
  ])

  return NAMES.map((name, i) => {
    const identity = ids[i]
    const dislike = dislikers.has(i)

    const skinNormal =
      `hsl(25,40%,${45 + Math.random() * 30}%)`

    const seat =
      identity === 'Vampire'
        ? vampSeat
        : rest.shift()

    return {
      name,
      identity,
      seat,
      firstSeat: seat,
      dislike,

      // Relationships
      like: dislike ? 34 : 48,
      exp: 0,
      trust: 50,
      suspicion: 0,
      band: 'mid',

      // Personality
      personality: pick(PERSONALITIES),
      habit: pick(HABITS),
      reaction: pick([
        'friendly',
        'terrified',
        'hostile',
        'unpredictable'
      ]),

      // Behaviour
      hostile: false,
      watch: 0,
      glanceT: 0,
      glanceMode: 0,
      scale: 1,
      mode: '',
      protector: false,
      flipAt: 0,
      frozenUntil: 0,
      glitch: 0,

      // Evidence
      tell: null,
      clues: [],
      guess: '',
      status: 'Unknown',

      // Appearance
      lvl: -1,
      revealed: false,
      skinNormal,
      skin: identity === 'Vampire'
        ? '#dad9e2'
        : skinNormal,

      jacket: `hsl(${i * 45},25%,28%)`,
      hair: `hsl(${Math.random() * 50},40%,${5 + Math.random() * 25}%)`,

      // Animation
      hitCd: 0,
      refl: false,
      blinkT: R(1, 4),
      blink: 0,

      // Death
      dead: false,
      dying: false,
      deathProgress: 0,
      deathStartedAt: null,
      bloodVisible: false,

      // Haunting
      haunting: false,
      hauntCount: 0,
      hauntNext: 0,
      hauntUntil: 0,

      // Three.js reference
      ref: null
    }
  })
}

// ------------------------------------
// FIND AN EMPTY SEAT
// ------------------------------------

export function emptySeat() {
  const occupied = new Set(
    game.students
      .filter(s => !s.dead && !s.hostile && s.mode !== 'flee')
      .map(s => s.seat)
  )

  for (let i = 0; i < 9; i++) {
    if (!occupied.has(i)) return i
  }

  return -1
}

// ------------------------------------
// ACCUSATION SYSTEM
// ------------------------------------

export function accuse(s) {
  if (
    !s ||
    !s.guess ||
    s.dead ||
    s.hostile ||
    s.status === 'Confirmed' ||
    s.status === 'Wrongly accused'
  ) {
    return
  }

  // Correct accusation.
  if (s.guess === s.identity) {
    exposeStudent(s)

    note(
      `${s.name}'s secret has been uncovered.`,
      'good'
    )

    emit()
    return
  }

  // Wrong accusation: begin death sequence.
  s.status = 'Wrongly accused'
  s.hostile = true
  s.dead = true
  s.dying = true
  s.deathProgress = 0
  s.deathStartedAt = game.t
  s.bloodVisible = false

  s.haunting = false
  s.like = 0
  s.trust = 0
  s.suspicion = 100
  s.band = 'cold'

  // Increase the player's fear.
  addFear()

  note(
    `${s.name} freezes. Something is terribly wrong.`,
    'bad'
  )

  writeBoard(
    'THAT WAS A MISTAKE.',
    true
  )

  emit()
}
