import { game, note, emit, schedule } from './GameState.js'
import { sfx } from './Audio.js'
import { writeBoard } from './BoardSystem.js'
import { addClue } from './ClueSystem.js'
import { R } from './IdentitySystem.js'

// THE EXPOSURE: what happens when you name someone correctly.
export function exposeStudent(s) {
  s.status = 'Confirmed'
  game.flick = 1.4            // 1. the lights flicker
  s.frozenUntil = game.t + 7  // 2. the student stops moving
  game.lookUntil = game.t + 6 // 3. everyone else turns to look at you
  s.glitch = 1.6              // 4. their normal appearance glitches
  sfx.glitch()
  note(`${s.name} stops moving. Everyone turns to look at you.`, 'bad')
  schedule(1.6, () => revealEffect(s)) // 5. the true identity shows
  schedule(4.5, () => react(s))        // 6. and then the consequences
  emit()
}

export function revealEffect(s, quiet = false) {
  s.revealed = true; s.lvl = -1
  const say = (t) => !quiet && note(t, 'bad')
  switch (s.identity) {
    case 'Vampire': say(`${s.name}’s reflection disappears from the window. Their eyes turn red.`); break
    case 'Ghost': say(`${s.name}’s body turns transparent.`); break
    case 'Werewolf': say(`${s.name}’s shadow twists into a wolf.`); break
    case 'Witch': game.objects = 40; game.objectSeats = [0, 1, 2, 3, 4, 5, 6, 7, 8]; say('Everything in the classroom begins to float.'); break
    case 'Demon': say(`${s.name}’s shadow starts moving on its own.`); break
    case 'Shapeshifter': s.cycleUntil = game.anim + 3.5; say(`${s.name}’s face rapidly becomes every classmate in the room.`); break
    case 'Zombie': say(`${s.name}’s skin decays in front of you.`); break
    case 'Siren': if (!quiet) { sfx.melody(); game.lookUntil = game.t + 6 } say('Everyone hears a strange melody.'); break
  }
  if (!quiet) addClue(s, `Exposed. You watched them become a ${s.identity}.`)
}

// Not every exposed monster reacts the same way. Being right does not mean being safe.
function react(s) {
  const n = s.name
  if (s.reaction === 'friendly') {
    s.like = 95; s.protector = true
    note(`${n} nods at you. They may protect you now.`)
    writeBoard('SOMEONE OWES YOU A FAVOUR.', true)
  } else if (s.reaction === 'terrified') {
    s.like = 5; s.mode = 'flee'
    note(`${n} is terrified of you and backs away.`)
    writeBoard(`${n.toUpperCase()} IS AFRAID OF YOU NOW.`, true)
  } else if (s.reaction === 'hostile') {
    s.hostile = true; s.like = 0
    note(`${n} looks at you and smiles. It is not a friendly smile.`, 'bad')
    writeBoard('YOU SHOULD HAVE KEPT THAT TO YOURSELF.', true)
  } else {
    s.flipAt = game.t + R(20, 45)
    note(`${n} pretends nothing happened.`)
    writeBoard('NOT EVERYONE WHO SMILES IS GRATEFUL.', true)
  }
  emit()
}

// Final bell: everything that is left gets exposed.
export function revealAll() {
  game.students.forEach((s) => !s.revealed && revealEffect(s, true))
  writeBoard('ALL SECRETS ARE EXPOSED.', true, false)
}
