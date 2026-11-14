import { game, note } from '../systems/GameState.js'
import { hurt } from '../systems/EventSystem.js'
import { updateRelationship } from '../systems/RelationshipSystem.js'
import { wrap, R, clamp, pick } from '../systems/IdentitySystem.js'

const NONBLINK = ['Vampire', 'Ghost', 'Zombie'] // they never blink: the board may tell you so
const skinNow = (s, L) => (s.revealed && s.identity === 'Zombie' ? '#6f7f5a' : L >= 2 ? s.skin : s.skinNormal)

// The classroom gets worse with every bell:
//  0 normal, friendly  1 night falls  2 strange behaviour  3 seats change  4 traits show  5 hostile
export function updateStudent(s, dt, t) {
  const r = s.ref
  if (!r) return
  const g = r.group, m = r.mats, p = game.player
  const L = game.bellCount, lv = Math.max(L, game.ringing)
  const dx = p.x - g.position.x, dz = p.z - g.position.z, dist = Math.hypot(dx, dz) || 0.01
  const dark = game.dark && game.flick <= 0
  const ease = (k) => Math.min(1, dt * k)
  const toP = () => wrap(Math.atan2(-dx, -dz) - g.rotation.y)

  /* appearance that depends on how far into the night we are */
  if (s.lvl !== L) { s.lvl = L; m.skin.color.set(skinNow(s, L)) }
  if (s.identity === 'Ghost') {
    const op = L < 2 ? 1 : s.revealed ? 0.25 + Math.random() * 0.1 : L >= 4 && Math.random() < 0.02 ? 0.25 : 0.78
    for (const mt of m.fade) mt.opacity = op // fade every material so the whole body is a ghost
  }
  let em = '#000000'
  if (s.identity === 'Demon' && (s.revealed || L >= 4 || (game.dark && lv >= 2))) em = game.dark || s.revealed ? '#ff2010' : '#661000'
  if (s.identity === 'Vampire' && s.revealed) em = '#ff1a1a'
  m.eye[0].emissive.set(em); m.eye[1].emissive.set(em)

  /* shadow: normal for everyone, until a werewolf or demon is exposed. Ghosts have none. */
  const wolf = s.revealed && s.identity === 'Werewolf', dem = s.revealed && s.identity === 'Demon'
  let ox = 0, oz = 0
  r.shN.visible = !wolf; r.shW.visible = wolf
  if (dem) { ox = Math.sin(t * 1.3) * 0.8; oz = Math.cos(t * 0.9) * 0.8; r.shN.scale.set(0.55 + Math.sin(t * 3) * 0.15, 0.4 + Math.cos(t * 2) * 0.2, 1) }
  r.shadow.position.set(g.position.x + ox, 0.02, g.position.z + oz)
  r.shadow.visible = g.visible && !(s.identity === 'Ghost' && L >= 2)

  /* Exposure effects: glitch, and the shapeshifter's rapidly changing face */
  if (s.glitch > 0) {
    s.glitch -= dt; g.scale.x = 1 + (Math.random() - 0.5) * 0.3; m.skin.color.setHSL(Math.random(), 0.6, 0.5)
    if (s.glitch <= 0) { g.scale.x = 1; m.skin.color.set(skinNow(s, L)) }
  }
  if (s.cycleUntil > t) {
    s.cycling = true
    if (t > (s.cycT || 0)) { s.cycT = t + 0.09; const o = pick(game.students.filter((x) => x !== s)); m.skin.color.set(o.skin); m.hair.color.set(o.hair); m.jacket.color.set(o.jacket) }
  } else if (s.cycling) { s.cycling = false; m.skin.color.set(skinNow(s, L)); m.hair.color.set(s.hair); m.jacket.color.set(s.jacket) }

  /* "Unpredictable" classmates pretend nothing happened, then change */
  if (s.flipAt && game.t >= s.flipAt) {
    s.flipAt = 0
    if (Math.random() < 0.5) { s.hostile = true; s.like = 0; note(`${s.name} stops pretending.`, 'bad') }
    else { s.like = 90; s.protector = true; note(`${s.name} gives you a quiet nod.`) }
  }

  /* just exposed: frozen in place, staring at you */
  if (s.frozenUntil > game.t) {
    g.rotation.y += wrap(0 - g.rotation.y) * ease(3); g.rotation.z *= 0.9
    r.head.rotation.y += (clamp(toP(), -1.1, 1.1) - r.head.rotation.y) * ease(4)
    r.eyes.forEach((e) => (e.scale.y = 1)); r.brows[0].rotation.z = r.brows[1].rotation.z = 0
    return
  }

  /* terrified: stands up and backs away from you */
  if (s.mode === 'flee') {
    g.position.x = clamp(g.position.x - (dx / dist) * 1.1 * dt, -5.5, 5.5)
    g.position.z = clamp(g.position.z - (dz / dist) * 1.1 * dt, -4.4, 4.4)
    g.position.y = 0.35
    g.rotation.y += wrap(Math.atan2(dx, dz) - g.rotation.y) * ease(5)
    g.rotation.z = (Math.random() - 0.5) * 0.08
    r.brows[0].rotation.z = 0.4; r.brows[1].rotation.z = -0.4
    return
  }

  /* hostile (wrongly accused, or an exposed monster that turned on you): comes for you */
  if (s.hostile) {
    const sp = dark ? 2.6 : 0.9
    if (dist > 1.1) { g.position.x += (dx / dist) * sp * dt; g.position.z += (dz / dist) * sp * dt }
    g.position.y = 0.35
    g.rotation.y += wrap(Math.atan2(-dx, -dz) - g.rotation.y) * ease(6)
    g.rotation.x = -0.12
    s.hitCd -= dt
    if (dist < 1.3 && s.hitCd <= 0 && !dark) { s.hitCd = 2; hurt(10, s.name + ' lashes out at you.') }
    r.brows[0].rotation.z = -0.5; r.brows[1].rotation.z = 0.5
    return
  }

  g.rotation.y += wrap((game.chairs > 0 ? Math.PI : 0) - g.rotation.y) * ease(3)
  const band = updateRelationship(s, dist, dt)
  const lookAll = game.t < game.lookUntil // everyone turns to stare after an Exposure

  /* glances: toward the board, toward you, or away */
  s.glanceT -= dt
  if (s.glanceT <= 0) {
    s.glanceT = R(3, 7)
    const x = Math.random()
    s.glanceMode = s.identity === 'Siren' && L >= 2 ? 1
      : band === 'warm' ? (x < 0.6 ? 1 : 0) : band === 'cold' ? (x < 0.7 ? 2 : 0) : x < 0.25 ? 1 : x < 0.5 ? 2 : 0
  }
  let ty = lookAll || s.glanceMode === 1 ? clamp(toP(), -1.1, 1.1) : s.glanceMode === 2 ? (s.seat % 2 ? 0.9 : -0.9) : 0
  if (s.identity === 'Werewolf' && s.glanceMode === 2 && L >= 2) ty = -1 // stares at the moon
  r.head.rotation.y += (ty - r.head.rotation.y) * ease(4)

  /* body language */
  const side = Math.sign(dx) || 1
  let tz = dist < 3 ? (band === 'cold' ? 0.12 * side : band === 'warm' ? -0.05 * side : 0) : 0
  let tilt = 0
  if (L >= 2 && s.identity === 'Zombie') { tz += Math.sin(t * 0.7) * 0.07; tilt = 0.35 }
  if (L >= 2 && s.identity === 'Werewolf') tz += (Math.random() - 0.5) * 0.05
  g.rotation.z += (tz - g.rotation.z) * ease(4)
  r.head.rotation.z += (tilt - r.head.rotation.z) * ease(3)
  g.position.y = L >= 2 && s.identity === 'Ghost' ? (s.revealed ? 0.5 : 0.22) + Math.sin(t * 2 + s.seat) * 0.05 : 0
  g.scale.y = s.scale

  /* faces: friendly before the first bell, then they follow the relationship */
  let ang = band === 'cold' ? 0.3 : band === 'warm' ? -0.15 : L === 0 ? -0.08 : 0
  if (lookAll) ang = 0.2
  r.brows[0].rotation.z = -ang; r.brows[1].rotation.z = ang
  if (L >= 3 && s.identity === 'Demon' && Math.sin(t * 0.4 + s.seat) > 0.9) { r.brows[0].rotation.z = -0.4; r.brows[1].rotation.z = 0.4 }
  // blinking: vampires, ghosts and zombies never do
  s.blinkT -= dt
  if (s.blinkT <= 0) { s.blinkT = R(2, 5); s.blink = 0.14 }
  s.blink = Math.max(0, s.blink - dt)
  const blinks = !NONBLINK.includes(s.identity) && s.blink > 0
  r.eyes.forEach((e) => (e.scale.y = blinks ? 0.1 : band === 'warm' || L === 0 ? 0.8 : 1))
}