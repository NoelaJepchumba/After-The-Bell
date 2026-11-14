
import { game, note, emit, addFear } from './GameState.js'
import { sfx } from './Audio.js'
import {
  CLUES,
  IDENTITIES,
  pick
} from './IdentitySystem.js'

// ------------------------------------
// ADD CLUE TO NOTEBOOK
// ------------------------------------

export function addClue(s, text) {
  if (!s || !text) return false

  if (!Array.isArray(s.clues)) {
    s.clues = []
  }

  if (s.clues.includes(text)) return false

  s.clues.push(text)

  note(
    'Notebook updated: ' + s.name,
    'clue'
  )

  sfx.click()

  emit()

  return true
}

// ------------------------------------
// OBSERVE A STUDENT
// ------------------------------------

export function observe(s) {
  if (!s || game.screen !== 'play') return

  // --------------------------------
  // BEFORE THE SECOND BELL
  // --------------------------------

  if (game.bellCount < 2) {
    if (s.calm !== game.bellCount + 1) {
      s.calm = game.bellCount + 1

      note(
        game.bellCount === 0
          ? `${s.name} seems perfectly ordinary.`
          : `${s.name} still seems ordinary... for now.`
      )
    }

    return
  }

  // --------------------------------
  // EXPOSED STUDENTS
  // --------------------------------

  if (s.exposed || s.status === 'Confirmed') {
    note(
      `${s.name} has already revealed their identity.`
    )

    return
  }

  // --------------------------------
  // EXPIRED CLUES
  // --------------------------------

  if (s.tell && s.tell.until <= game.t) {
    s.tell = null
  }

  // --------------------------------
  // SPECIAL SUPERNATURAL TELLS
  // --------------------------------

  if (s.tell && s.tell.until > game.t) {
    addClue(s, s.tell.text)

    s.tell = null

    addFear(2)

    return
  }

  // --------------------------------
  // REFLECTION OBSERVATION
  // --------------------------------

  if (game.reflect > 0 && !s.refl) {
    s.refl = true

    addClue(
      s,
      s.identity === 'Vampire'
        ? 'Casts no reflection in the window.'
        : 'Their reflection in the glass looks perfectly normal.'
    )

    if (s.identity === 'Vampire') {
      addFear(5)
    }

    return
  }

  // --------------------------------
  // FALSE CLUES
  // --------------------------------

  // Some observations are misleading.
  if (Math.random() < 0.2) {
    const otherIdentities = IDENTITIES.filter(
      id => id !== s.identity
    )

    const otherClues = otherIdentities.flatMap(
      id => CLUES[id]
    )

    const availableFalseClues = otherClues.filter(
      clue => !s.clues.includes(clue)
    )

    if (availableFalseClues.length) {
      addClue(
        s,
        pick(availableFalseClues)
      )

      return
    }
  }

  // --------------------------------
  // TRUE IDENTITY CLUES
  // --------------------------------

  const trueClues = CLUES[s.identity] || []

  const availableClues = trueClues.filter(
    clue => !s.clues.includes(clue)
  )

  if (availableClues.length) {
    addClue(
      s,
      pick(availableClues)
    )

    return
  }

  // --------------------------------
  // NO NEW CLUE
  // --------------------------------

  note(
    `${s.name} doesn't reveal anything new.`
  )
}
