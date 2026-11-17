
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { game, emit } from '../systems/GameState.js'
import { COLX, ROWZ, clamp } from '../systems/IdentitySystem.js'
import { observe } from '../systems/ClueSystem.js'

const DESKS = ROWZ.flatMap(z =>
  COLX.map(x => ({ x, z }))
)

const fwd = new THREE.Vector3()
const tmp = new THREE.Vector3()

function collide(x, z) {
  x = clamp(x, -5.6, 5.6)
  z = clamp(z, -4.5, 4.6)

  // Desk collision.
  for (const d of DESKS) {
    const dx = x - d.x
    const dz = z - d.z

    const ox = 0.95 - Math.abs(dx)
    const oz = 0.6 - Math.abs(dz)

    if (ox > 0 && oz > 0) {
      if (ox < oz) {
        x += Math.sign(dx || 1) * ox
      } else {
        z += Math.sign(dz || 1) * oz
      }
    }
  }

  // Student collision.
  for (const s of game.students) {
    if (s.hostile || !s.ref?.group.visible) continue

    const p = s.ref.group.position
    const dx = x - p.x
    const dz = z - p.z
    const dist = Math.hypot(dx, dz)

    if (dist < 0.55 && dist > 0) {
      x += (dx / dist) * (0.55 - dist)
      z += (dz / dist) * (0.55 - dist)
    }
  }

  return [
    clamp(x, -5.6, 5.6),
    clamp(z, -4.5, 4.6)
  ]
}

export default function Player() {
  const { camera, gl } = useThree()

  const keys = useRef({})
  const drag = useRef(false)

  useEffect(() => {
    const el = gl.domElement

    const lock = () => {
      try {
        el.requestPointerLock?.()
      } catch (e) {}
    }

    const down = () => {
      if (game.screen !== 'play' || game.bookOpen) return

      drag.current = true

      if (document.pointerLockElement !== el) {
        lock()
      }
    }

    const up = () => {
      drag.current = false
    }

    const move = e => {
      if (game.screen !== 'play' || game.bookOpen || game.paused) return

      if (
        document.pointerLockElement !== el &&
        !drag.current
      ) return

      const p = game.player

      p.yaw -= e.movementX * 0.0024

      p.pitch = clamp(
        p.pitch - e.movementY * 0.0024,
        -1.2,
        1.2
      )
    }

    const kd = e => {
      keys.current[e.code] = true
    }

    const ku = e => {
      keys.current[e.code] = false
    }

    const blur = () => {
      keys.current = {}
      drag.current = false
    }

    el.addEventListener('mousedown', down)
    window.addEventListener('mouseup', up)
    window.addEventListener('mousemove', move)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('blur', blur)

    return () => {
      el.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('blur', blur)
    }
  }, [gl])

  useFrame((_, d) => {
    const dt = Math.min(0.05, d)
    const p = game.player
    const k = keys.current

    if (
      game.screen === 'play' &&
      !game.bookOpen &&
      !game.paused &&
      game.t >= game.frozenUntil
    ) {
      const speed = (k.ShiftLeft ? 4.6 : 3) * dt

      const fw =
        (k.KeyW || k.ArrowUp ? 1 : 0) -
        (k.KeyS || k.ArrowDown ? 1 : 0)

      const sd =
        (k.KeyD || k.ArrowRight ? 1 : 0) -
        (k.KeyA || k.ArrowLeft ? 1 : 0)

      if (fw || sd) {
        const length = Math.hypot(fw, sd)

        const vx =
          (
            -Math.sin(p.yaw) * fw +
            Math.cos(p.yaw) * sd
          ) / length * speed

        const vz =
          (
            -Math.cos(p.yaw) * fw -
            Math.sin(p.yaw) * sd
          ) / length * speed

        ;[p.x, p.z] = collide(
          p.x + vx,
          p.z + vz
        )
      }
    }

    // First-person camera.
    camera.position.set(p.x, 1.6, p.z)
    camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ')

    if (game.screen !== 'play' || game.bookOpen) return

    // Detect which student the player is looking at.
    camera.getWorldDirection(fwd)

    let best = null
    let bestScore = 0.97

    for (const s of game.students) {
      const group = s.ref?.group

      if (!group || !group.visible) continue

      tmp.set(
        group.position.x,
        group.position.y + 1.3,
        group.position.z
      ).sub(camera.position)

      const dist = tmp.length()

      if (dist > 7.5) continue

      const score = tmp.normalize().dot(fwd)

      if (score > bestScore) {
        bestScore = score
        best = s
      }
    }

    game.students.forEach(s => {
      if (s !== best) {
        s.watch = Math.max(0, s.watch - dt)
      }
    })

    const name = best ? best.name : ''

    if (name !== game.focus) {
      game.focus = name
      emit()
    }

    if (best && !game.dark) {
      best.watch += dt

      if (best.watch >= 2.2) {
        best.watch = 0
        observe(best)
      }
    }
  })

  return null
}
