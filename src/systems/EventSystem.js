
import {
  game,
  note,
  say,
  emit,
  endGame,
  schedule,
  addFear,
  increaseHaunting
} from './GameState.js'

import { sfx } from './Audio.js'

import {
  CLUES,
  TELLS,
  IDENTITIES,
  DANGEROUS,
  seatPos,
  R,
  pick,
  shuffle
} from './IdentitySystem.js'

import { bellMessage, writeBoard } from './BoardSystem.js'

// ------------------------------------
// SUPERNATURAL MESSAGES
// ------------------------------------

const MESSAGES = [
  'DON’T TRUST THE PERSON BEHIND YOU.',
  'THE CLOCK IS LYING.',
  'SOMEONE HERE WAS NEVER ENROLLED.',
  'STAY AWAY FROM THE LAST DESK.',
  'SIT WHERE THE MOONLIGHT DOESN’T REACH.',
  'YOU WERE NOT INVITED.',
  'STOP COUNTING THE STUDENTS.',
  'ONE OF THEM IS WEARING SOMEONE ELSE’S FACE.',
  'DON’T LOOK UNDER YOUR DESK.',
  'THEY KNOW YOU ARE WATCHING.'
]

// ------------------------------------
// DAMAGE SYSTEM
// ------------------------------------

export function hurt(n, text) {
  if (game.screen !== 'play') return

  game.hp = Math.max(0, game.hp - n)

  addFear(Math.min(20, n * 0.5))

  note(text, 'bad')

  sfx.hit()

  emit()

  if (game.hp <= 0) {
    endGame(false)
  }
}

// ------------------------------------
// PROTECTION SYSTEM
// ------------------------------------

function hurtOrGuard(n, text) {
  const p = game.player

  const guard = game.students.find(s =>
    s.protector &&
    !s.hostile &&
    s.ref &&
    Math.hypot(
      s.ref.group.position.x - p.x,
      s.ref.group.position.z - p.z
    ) < 3.2
  )

  if (guard) {
    note(`${guard.name} pulls you out of harm’s way.`)
    addFear(5)
  } else {
    hurt(n, text)
  }
}

// ------------------------------------
// BELL SYSTEM
// ------------------------------------

export function ringBell(n) {
  game.ringing = n
  game.bellRinging = true

  game.frozenUntil = game.t + 9

  game.supernaturalLevel = Math.max(
    game.supernaturalLevel || 0,
    n
  )

  sfx.bellOne()

  note(
    n === 1
      ? 'The first bell rings. Everyone stops moving.'
      : `The ${['', 'first', 'second', 'third', 'fourth', 'fifth'][n]} bell rings. Something is changing.`,
    'bad'
  )

  addFear(n >= 3 ? 12 : 5)

  schedule(1.8, () => blackout(true))
}

// ------------------------------------
// BLACKOUT
// ------------------------------------

function blackout(bell = false) {
  const lv = bell ? game.ringing : game.bellCount

  game.dark = true

  game.darkEnd =
    game.t +
    (bell ? R(3.2, 4.2) : R(2, 3.5))

  game.flick = 0.9

  sfx.thud()

  addFear(lv >= 4 ? 12 : 6)

  if (bell) {
    schedule(0.9, () => sfx.strange())
  }

  // --------------------------------
  // STUDENTS MOVING IN DARKNESS
  // --------------------------------

  const seated = game.students.filter(s =>
    !s.hostile &&
    s.mode !== 'flee' &&
    !s.frozenUntil
  )

  if (lv >= 3) {
    const ghost = seated.find(
      s => s.identity === 'Ghost'
    )

    game.movers = shuffle(seated).slice(
      0,
      Math.random() < 0.5 ? 2 : 1
    )

    if (
      ghost &&
      Math.random() < 0.7 &&
      !game.movers.includes(ghost)
    ) {
      game.movers.push(ghost)
    }

    game.movers.forEach(s => {
      if (s.ref) s.ref.group.visible = false
    })
  }

  // --------------------------------
  // IDENTITY TELLS
  // --------------------------------

  if (lv >= 2) {
    shuffle(seated)
      .slice(0, 2)
      .forEach(s => {
        s.tell = {
          text: TELLS[s.identity],
          until: game.t + 45
        }
      })

    // One false observation.
    const decoy = pick(seated)

    if (decoy) {
      const falseIdentity = pick(
        IDENTITIES.filter(id => id !== decoy.identity)
      )

      decoy.tell = {
        text: TELLS[falseIdentity],
        until: game.t + 45
      }
    }
  }

  // --------------------------------
  // WRONG ACCUSATION HAUNTINGS
  // --------------------------------

  game.students.forEach(s => {
    if (!s.hostile || !s.ref) return

    if (Math.random() < 0.7) {
      note(
        `You hear ${s.name} moving somewhere in the darkness.`,
        'bad'
      )
    }
  })
}

// ------------------------------------
// RELIGHT THE CLASSROOM
// ------------------------------------

export function relight() {
  game.dark = false
  game.flick = 0.7

  const occupied = new Set(
    game.students
      .filter(s =>
        !s.hostile &&
        s.mode !== 'flee' &&
        !game.movers.includes(s)
      )
      .map(s => s.seat)
  )

  game.movers.forEach(s => {
    if (s.hostile || !s.ref) return

    const free = [
      0, 1, 2, 3, 4, 5, 6, 7, 8
    ].filter(i =>
      !occupied.has(i) &&
      (
        s.identity !== 'Vampire' ||
        i % 3 > 0
      )
    )

    const newSeat = free.length
      ? pick(free)
      : s.seat

    s.seat = newSeat
    occupied.add(newSeat)

    const p = seatPos(newSeat)

    s.ref.group.position.set(
      p.x,
      0,
      p.z
    )

    s.ref.group.visible = true
  })

  const moved = game.movers.filter(
    s => !s.hostile
  )

  game.movers = []

  // --------------------------------
  // BELL CONSEQUENCES
  // --------------------------------

  if (game.bellRinging) {
    const n = game.ringing

    game.bellRinging = false
    game.bellCount = n
    game.night = true

    game.frozenUntil = game.t + 4

    if (n === 3) {
      game.pending = 'phantom'
    }

    if (n === 4) {
      game.rules.emptyChair = true

      note(
        'A new rule appears on the blackboard.',
        'bad'
      )
    }

    if (n >= 2) {
      game.next =
        game.t +
        R(12, 22) *
        Math.max(0.35, game.T / 1200)
    }

    note(
      'The lights return. It is dark outside now.',
      'bad'
    )

    if (n >= 3 && moved.length) {
      setTimeout(() => {
        note(
          'Someone is sitting in a different seat.',
          'bad'
        )
      }, 1800)
    }

    schedule(1.3, () => {
      const m = bellMessage(n)

      writeBoard(m.text, m.truth)

      game.frozenUntil =
        game.t + m.text.length / 7 + 1.5

      if (n === 1 && m.truth) {
        game.reflect = 90
      }
    })
  } else if (moved.length) {
    setTimeout(() => {
      note(
        moved[0].name + ' is sitting in a different seat.',
        'bad'
      )
    }, 1800)
  }

  // --------------------------------
  // DARKNESS ATTACKS
  // --------------------------------

  const p = game.player

  game.students.forEach(s => {
    if (!s.ref) return

    const d = Math.hypot(
      s.ref.group.position.x - p.x,
      s.ref.group.position.z - p.z
    )

    if (s.hostile && d < 2.2) {
      hurtOrGuard(
        25,
        `${s.name} reached you in the dark.`
      )

      increaseHaunting(s.name)
    } else if (
      !s.hostile &&
      DANGEROUS.includes(s.identity) &&
      game.bellCount >= 5 &&
      d < 1.9 &&
      Math.random() < 0.8
    ) {
      hurtOrGuard(
        20,
        'Something in the dark brushed past you.'
      )
    }
  })

  emit()
}

// ------------------------------------
// AMBIENT HORROR EVENTS
// ------------------------------------

const EVENTS = {
  blackout: () => blackout(false),

  clock() {
    game.clockRev = 22

    note(
      'The clock is running backwards.',
      'bad'
    )

    addFear(5)
  },

  sil() {
    game.sil = 6
    game.silZ = pick([-3, 0, 3])

    note(
      'Someone is standing outside the window.',
      'bad'
    )

    addFear(8)
  },

  chairs() {
    game.chairs = 9

    note(
      'Every chair turns to face the back of the room.',
      'bad'
    )

    addFear(7)
  },

  reflect() {
    game.reflect = 16

    note(
      'The windows are a mirror tonight. Look at someone’s reflection.',
      'bad'
    )

    addFear(5)
  },

  msg() {
    let text = pick(MESSAGES)

    if (Math.random() < 0.55) {
      const s = pick(game.students)

      if (!s) return

      const real = Math.random() < 0.6

      const id = real
        ? s.identity
        : pick(
            IDENTITIES.filter(
              x => x !== s.identity
            )
          )

      const clue = pick(CLUES[id])

      text =
        `${s.name.toUpperCase()}: ${clue.toUpperCase()}`

      s.tell = {
        text: clue,
        until: game.t + 60
      }
    }

    say(text)

    addFear(4)
  },

  objects() {
    game.objects = 11

    const witch = game.students.find(
      s => s.identity === 'Witch'
    )

    const candidates = game.students.filter(
      s => s !== witch && !s.hostile
    )

    const decoy = candidates.length
      ? pick(candidates)
      : null

    game.objectSeats = [
      witch,
      decoy
    ]
      .filter(s => s && !s.hostile)
      .map(s => s.seat)

    if (witch && !witch.hostile) {
      witch.tell = {
        text: 'The book on their desk floated and turned its own pages.',
        until: game.t + 40
      }
    }

    if (decoy) {
      decoy.tell = {
        text: 'Their book lifted off the desk too.',
        until: game.t + 40
      }
    }

    note(
      'Objects on the desks begin to move.',
      'bad'
    )

    addFear(6)
  },

  // A wrongly accused student appears somewhere impossible.
  haunting() {
    const targets = game.students.filter(
      s => s.hostile && s.status === 'Wrongly accused'
    )

    if (!targets.length) return

    const s = pick(targets)

    note(
      `You see ${s.name} standing where nobody was a moment ago.`,
      'bad'
    )

    increaseHaunting(s.name)
  }
}

// ------------------------------------
// SELECT AMBIENT EVENT
// ------------------------------------

export function fireAmbient() {
  const weights = [
    ['clock', 1],
    ['sil', 1],
    ['chairs', 1],
    ['msg', 2],
    ['objects', 1]
  ]

  if (game.bellCount >= 3) {
    weights.push(['reflect', 1])
  }

  if (game.bellCount >= 4) {
    weights.push(['haunting', 2])
  }

  if (game.bellCount >= 5) {
    weights.push(['blackout', 3])
  }

  const total = weights.reduce(
    (sum, item) => sum + item[1],
    0
  )

  let r = Math.random() * total

  for (const [key, weight] of weights) {
    r -= weight

    if (r < 0) {
      EVENTS[key]()
      return
    }
  }
}
