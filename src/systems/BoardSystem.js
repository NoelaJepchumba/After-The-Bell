
import { game, emit } from './GameState.js'
import { pick } from './IdentitySystem.js'

// ------------------------------------
// BLACKBOARD SYSTEM
// ------------------------------------

const INITIAL_BOARD = {
  rules: [
    'SURVIVE UNTIL THE FINAL BELL.',
    'OBSERVE YOUR CLASSMATES CAREFULLY.',
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
// INITIALISE THE BOARD
// ------------------------------------

export function initialiseBoard() {
  game.boardSections = JSON.parse(JSON.stringify(INITIAL_BOARD))

  game.boardLog = []

  game.board = {
    text: Object.values(INITIAL_BOARD)
      .flat()
      .join('\n'),
    shown: Infinity,
    id: Math.random()
  }

  emit()
}

// ------------------------------------
// ADD A MESSAGE WITHOUT REPLACING OLD CLUES
// ------------------------------------

export function writeBoard(text, truth = null, log = true) {
  if (!text) return

  if (!Array.isArray(game.boardMessages)) {
    game.boardMessages = []
  }

  game.boardMessages.push({
    text,
    truth,
    bell: game.bellCount,
    time: game.t
  })

  if (!Array.isArray(game.boardLog)) {
    game.boardLog = []
  }

  if (log) {
    game.boardLog.push({
      text,
      truth,
      bell: game.bellCount,
      time: game.t
    })
  }

  game.board = {
    text: [
      ...Object.values(game.boardSections || INITIAL_BOARD).flat(),
      ...game.boardMessages.map(message => message.text)
    ].join('\n'),
    shown: Infinity,
    id: Math.random()
  }

  emit()
}

// ------------------------------------
// BOARD DISPLAY STATUS
// ------------------------------------

export const boardDone = () => true

// ------------------------------------
// IDENTITY HELPERS
// ------------------------------------

const NONBLINK = [
  'Vampire',
  'Ghost',
  'Zombie'
]

const up = s => s
  ? s.name.toUpperCase()
  : 'SOMEONE'

// ------------------------------------
// RANDOM BLACKBOARD MESSAGES
// ------------------------------------

const DISTURBING_MESSAGES = [
  'YOU ARE NOT SUPPOSED TO BE HERE.',
  'STOP LOOKING AT THE WINDOWS.',
  'YOUR CLASSMATES CAN HEAR YOU THINK.',
  'THERE IS SOMEONE UNDER THE FLOOR.',
  'THE LAST BELL IS NOT FOR YOU.',
  'DO NOT TRUST YOUR OWN REFLECTION.',
  'SOMEONE HAS ALREADY LEFT THIS CLASSROOM.',
  'YOU HAVE BEEN COUNTED TWICE.',
  'THE TEACHER IS STILL HERE.',
  'DO NOT TURN AROUND.',
  'ONE OF THEM IS WATCHING YOU.',
  'YOU ARE SITTING IN THE WRONG PLACE.'
]

export function randomBoardMessage() {
  return pick(DISTURBING_MESSAGES)
}

// ------------------------------------
// BELL MESSAGES
// ------------------------------------

export function bellMessage(n) {
  const students = game.students || []

  if (!students.length) {
    return {
      text: 'THE CLASS IS NOT COMPLETE.',
      truth: false
    }
  }

  const lie = Math.random() < 0.35

  const T = text => ({
    text,
    truth: true
  })

  const F = text => ({
    text,
    truth: false
  })

  // FIRST BELL
  if (n === 1) {
    return lie
      ? F('A VAMPIRE LOVES THE MOONLIGHT.')
      : T('A VAMPIRE CANNOT SEE ITS REFLECTION.')
  }

  // SECOND BELL
  if (n === 2) {
    const nonBlinking = students.filter(
      s => NONBLINK.includes(s.identity)
    )

    const blinking = students.filter(
      s => !NONBLINK.includes(s.identity)
    )

    const target = lie
      ? pick(blinking)
      : pick(nonBlinking)

    if (!target) {
      return T('SOMEONE IN THIS ROOM HAS FORGOTTEN HOW TO BLINK.')
    }

    return lie
      ? F(`${up(target)} HAS NOT BLINKED.`)
      : T(`${up(target)} HAS NOT BLINKED.`)
  }

  // THIRD BELL
  if (n === 3) {
    return lie
      ? F('NOBODY IN THIS ROOM HAS EVER DIED.')
      : T('ONE OF YOUR CLASSMATES IS ALREADY DEAD.')
  }

  // FOURTH BELL
  if (n === 4) {
    return lie
      ? F('THE EMPTY CHAIR IS SAFE. SIT DOWN.')
      : T('NEVER SIT IN AN EMPTY CHAIR.')
  }

  // FIFTH BELL
  const shapeshifter = students.find(
    s => s.identity === 'Shapeshifter'
  )

  const others = students.filter(
    s => s !== shapeshifter
  )

  if (!shapeshifter) {
    return T('SOMEONE IN THIS ROOM IS NOT WHO THEY CLAIM TO BE.')
  }

  if (lie) {
    const target = pick(others)

    return F(
      `SOMETHING IS PRETENDING TO BE ${up(target)}.`
    )
  }

  return T(
    `SOMETHING IS PRETENDING TO BE ${up(shapeshifter)}.`
  )
}
