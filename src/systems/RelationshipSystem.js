
import { note } from './GameState.js'
import { clamp } from './IdentitySystem.js'

// Relationships are independent of supernatural identity.
// A friendly student can still be dangerous.

export function updateRelationship(s, dist, dt) {
  if (s.like === undefined) s.like = 50
  if (s.exp === undefined) s.exp = 0
  if (s.trust === undefined) s.trust = 50
  if (s.suspicion === undefined) s.suspicion = 0

  // --------------------------------
  // PLAYER PROXIMITY
  // --------------------------------

  if (dist < 2.2) {
    s.exp += dt

    if (s.dislike && s.exp < 18) {
      s.like -= 1.6 * dt
      s.trust -= 0.5 * dt
    } else {
      s.like += 1.4 * dt
      s.trust += 0.7 * dt
    }
  } else {
    s.like += (48 - s.like) * 0.01 * dt
  }

  // --------------------------------
  // SUPERNATURAL BEHAVIOUR
  // --------------------------------

  if (s.hostile) {
    s.like -= 3 * dt
    s.trust -= 4 * dt
    s.suspicion += 2 * dt
  }

  if (s.exposed) {
    s.suspicion = Math.max(0, s.suspicion - dt)
  }

  // --------------------------------
  // LIMIT VALUES
  // --------------------------------

  s.like = clamp(s.like, 0, 100)
  s.trust = clamp(s.trust, 0, 100)
  s.suspicion = clamp(s.suspicion, 0, 100)

  // --------------------------------
  // RELATIONSHIP STATES
  // --------------------------------

  let band = 'mid'

  if (s.like > 70) {
    band = 'warm'
  } else if (s.like < 30) {
    band = 'cold'
  }

  if (band !== s.band) {
    const old = s.band
    s.band = band

    if (band === 'warm') {
      note(
        s.dislike && old === 'mid'
          ? `${s.name} stops tensing when you sit nearby.`
          : `${s.name} relaxes around you.`
      )
    } else if (band === 'cold') {
      note(`${s.name} leans away from you.`)
    } else {
      note(`${s.name} seems more comfortable with you.`)
    }
  }

  return band
}

// ------------------------------------
// STUDENT DESCRIPTION
// ------------------------------------

export function lookDescription(s) {
  if (s.hostile) {
    return 'Hostile. Watching you with intent.'
  }

  if (s.exposed) {
    return 'Their secret is exposed. They are no longer pretending.'
  }

  if (s.suspicion >= 70) {
    return 'Suspicious. Something about them feels wrong.'
  }

  if (s.trust < 25) {
    return 'Distrustful. They avoid getting close to you.'
  }

  if (s.like > 70) {
    return 'Relaxed around you. Turns toward you often.'
  }

  if (s.like < 30) {
    return 'Tense. Leans away and avoids your eyes.'
  }

  return 'Keeps to themselves. Neutral.'
}
