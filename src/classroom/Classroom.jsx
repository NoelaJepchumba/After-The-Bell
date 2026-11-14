
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { game } from '../systems/GameState.js'
import { seatPos } from '../systems/IdentitySystem.js'

const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h

  draw(c.getContext('2d'), w, h)

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace

  return t
}

// ------------------------------------
// WALL CLOCK
// ------------------------------------


function Clock() {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace

    return { canvas, tex }
  }, [])

  useFrame(() => {
    const g = canvas.getContext('2d')

    const duration = Math.max(game.T, 1)

    // The clock advances 60 simulated minutes
    // during one complete game.
    const elapsedMinutes = (game.t / duration) * 60

    const totalMinutes =
      11 * 60 + 40 + elapsedMinutes + game.clockOff

    const minute = ((totalMinutes % 60) + 60) % 60
    const hour = ((totalMinutes % 720) + 720) % 720

    // Accelerated second hand.
    const totalSeconds =
      (game.t / duration) * 3600 +
      game.clockOff * 60

    const second = ((totalSeconds % 60) + 60) % 60

    g.clearRect(0, 0, 256, 256)

    // Clock face
    g.fillStyle = '#c9bda5'
    g.beginPath()
    g.arc(128, 128, 119, 0, Math.PI * 2)
    g.fill()

    // Outer frame
    g.strokeStyle = '#241c19'
    g.lineWidth = 9
    g.stroke()

    // Inner ring
    g.strokeStyle = '#69513b'
    g.lineWidth = 2
    g.beginPath()
    g.arc(128, 128, 105, 0, Math.PI * 2)
    g.stroke()

    // Clock markings
    for (let i = 0; i < 60; i++) {
      const a = i * Math.PI / 30

      const major = i % 5 === 0

      g.strokeStyle = '#29221d'
      g.lineWidth = major ? 4 : 1.5

      g.beginPath()

      g.moveTo(
        128 + Math.sin(a) * (major ? 91 : 98),
        128 - Math.cos(a) * (major ? 91 : 98)
      )

      g.lineTo(
        128 + Math.sin(a) * 105,
        128 - Math.cos(a) * 105
      )

      g.stroke()
    }

    // Clock numbers
    g.fillStyle = '#29221d'
    g.font = 'bold 21px Georgia'
    g.textAlign = 'center'
    g.textBaseline = 'middle'

    for (let i = 1; i <= 12; i++) {
      const a = i * Math.PI / 6

      g.fillText(
        String(i),
        128 + Math.sin(a) * 76,
        128 - Math.cos(a) * 76
      )
    }

    // Hand drawing
    const hand = (angle, length, width, color) => {
      g.strokeStyle = color
      g.lineWidth = width
      g.lineCap = 'round'

      g.beginPath()
      g.moveTo(128, 128)

      g.lineTo(
        128 + Math.sin(angle) * length,
        128 - Math.cos(angle) * length
      )

      g.stroke()
    }

    // Hour hand
    hand(
      hour / 720 * Math.PI * 2,
      52,
      8,
      '#211b18'
    )

    // Minute hand
    hand(
      minute / 60 * Math.PI * 2,
      83,
      5,
      '#211b18'
    )

    // Second hand
    hand(
      second / 60 * Math.PI * 2,
      96,
      2,
      '#a52c25'
    )

    // Centre pin
    g.fillStyle = '#a52c25'
    g.beginPath()
    g.arc(128, 128, 6, 0, Math.PI * 2)
    g.fill()

    tex.needsUpdate = true
  })

  return (
    <mesh position={[0, 2.97, -4.96]}>
      <circleGeometry args={[0.4, 32]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  )
}


// ------------------------------------
// BLACKBOARD
// ------------------------------------


function Board() {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 300

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace

    return { canvas, tex }
  }, [])

  const last = useRef('')

  const DEFAULT_SECTIONS = {
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

  useFrame(() => {
    const sections = game.boardSections || DEFAULT_SECTIONS

    const messages = game.boardMessages ||
      game.boardLog ||
      []

    const signature = JSON.stringify({
      sections,
      messages
    })

    if (last.current === signature) return
    last.current = signature

    const g = canvas.getContext('2d')

    // Blackboard background
    g.clearRect(0, 0, 1024, 300)
    g.fillStyle = '#172820'
    g.fillRect(0, 0, 1024, 300)

    // Chalkboard texture
    g.fillStyle = 'rgba(0,0,0,0.12)'

    for (let i = 0; i < 12; i++) {
      g.fillRect(
        (i * 137) % 1000,
        (i * 47) % 280,
        90,
        12
      )
    }

    // Main heading
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = '#d8d3bd'
    g.font = 'bold 23px Georgia'
    g.shadowColor = 'rgba(245,242,226,0.5)'
    g.shadowBlur = 3

    g.fillText('AFTER THE BELL', 512, 22)

    g.shadowBlur = 0

    // Section dividers
    g.strokeStyle = 'rgba(220,215,190,0.35)'
    g.lineWidth = 2

    ;[295, 755].forEach(x => {
      g.beginPath()
      g.moveTo(x, 43)
      g.lineTo(x, 286)
      g.stroke()
    })

    // Draw section headings
    const heading = (text, x, y) => {
      g.fillStyle = '#d8c99e'
      g.font = 'bold 16px Georgia'
      g.textAlign = 'left'
      g.fillText(text, x, y)
    }

    // Draw wrapped chalk text
    const drawText = (
      text,
      x,
      y,
      width,
      fontSize = 13,
      lineHeight = 19
    ) => {
      g.font = `${fontSize}px monospace`
      g.fillStyle = '#eeeadd'
      g.textAlign = 'left'

      const words = String(text).split(' ')
      let line = ''
      let currentY = y

      for (const word of words) {
        const test = line ? `${line} ${word}` : word

        if (g.measureText(test).width > width && line) {
          g.fillText(line, x, currentY)
          line = word
          currentY += lineHeight
        } else {
          line = test
        }
      }

      if (line) {
        g.fillText(line, x, currentY)
        currentY += lineHeight
      }

      return currentY + 3
    }

    // RULES COLUMN
    heading('CLASSROOM RULES', 20, 55)

    let ruleY = 82

    ;(sections.rules || []).forEach((rule, index) => {
      ruleY = drawText(
        `${index + 1}. ${rule}`,
        22,
        ruleY,
        255,
        12,
        16
      )
    })

    // IDENTITY CLUES COLUMN
    heading('IDENTITY CLUES', 315, 55)

    const identities = sections.identities || []

    identities.forEach((clue, index) => {
      const column = index < 4 ? 0 : 1
      const row = index % 4

      const x = column === 0 ? 315 : 540
      const y = 83 + row * 49

      drawText(
        clue,
        x,
        y,
        195,
        12,
        16
      )
    })

    // WARNINGS COLUMN
    heading('WARNINGS', 775, 55)

    let warningY = 82

    ;(sections.warnings || []).forEach(warning => {
      warningY = drawText(
        `! ${warning}`,
        775,
        warningY,
        225,
        11,
        15
      )
    })

    // NEW WRITING FROM THE BELLS
    if (messages.length > 0) {
      warningY += 5

      g.strokeStyle = 'rgba(220,215,190,0.3)'
      g.beginPath()
      g.moveTo(775, warningY)
      g.lineTo(1000, warningY)
      g.stroke()

      warningY += 17

      heading('NEW WRITING', 775, warningY)
      warningY += 22

      messages.slice(-5).forEach(message => {
        const messageText =
          typeof message === 'string'
            ? message
            : message.text

        if (messageText && warningY < 285) {
          warningY = drawText(
            messageText,
            775,
            warningY,
            225,
            10,
            13
          )
        }
      })
    }

    g.shadowBlur = 0
    tex.needsUpdate = true
  })

  return (
    <mesh position={[0, 1.75, -4.97]}>
      <planeGeometry args={[6, 1.75]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  )
}

// ------------------------------------
// THE NINTH STUDENT
// ------------------------------------

function Phantom() {
  const g = useRef()

  useFrame(() => {
    if (!g.current) return

    const on =
      game.phantom > 0 &&
      game.phantomSeat >= 0

    g.current.visible = on

    if (on) {
      const p = seatPos(game.phantomSeat)
      g.current.position.set(p.x, 0, p.z)
    }
  })

  const m = (
    <meshBasicMaterial color="#040407" />
  )

  return (
    <group ref={g} visible={false}>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.2, 0.26, 0.75, 10]} />
        {m}
      </mesh>

      <mesh position={[0, 0.55, -0.25]}>
        <boxGeometry args={[0.4, 0.12, 0.45]} />
        {m}
      </mesh>

      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.17, 12, 10]} />
        {m}
      </mesh>
    </group>
  )
}

// ------------------------------------
// CLASSROOM
// ------------------------------------

const DUSK = new THREE.Color('#59616d')
const NIGHT = new THREE.Color('#101521')

export default function Classroom() {
  const winMat = useRef(
    useMemo(
      () => new THREE.MeshBasicMaterial({
        color: '#a4a9b8'
      }),
      []
    )
  )

  const moon = useRef()
  const sil = useRef()

  // --------------------------------
  // FLOOR TEXTURE
  // --------------------------------

  const floorTex = useMemo(() => {
    const t = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#594536'
      g.fillRect(0, 0, w, h)

      for (let i = 0; i < 8; i++) {
        g.fillStyle = `hsl(28,30%,${22 + Math.random() * 8}%)`
        g.fillRect(0, i * 32 + 1, w, 30)
      }
    })

    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(4, 4)

    return t
  }, [])

  // --------------------------------
  // ENVIRONMENT UPDATE
  // --------------------------------

  useFrame(() => {
    if (winMat.current) {
      winMat.current.color.lerp(
        game.night ? NIGHT : DUSK,
        0.03
      )
    }

    if (moon.current) {
      moon.current.visible = game.night
    }

    if (!sil.current) return

    sil.current.visible = game.sil > 0

    sil.current.position.set(
      -5.95,
      1.5 + Math.sin(game.sil * 2) * 0.05,
      game.silZ
    )
  })

  // --------------------------------
  // MATERIALS
  // --------------------------------

  const wall = (
    <meshStandardMaterial
      color="#68776a"
      roughness={0.9}
    />
  )

  const trim = (
    <meshStandardMaterial
      color="#3c2b20"
      roughness={0.8}
    />
  )

  return (
    <>
      {/* FLOOR */}

      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial
          map={floorTex}
          color="#b0a18e"
          roughness={0.85}
        />
      </mesh>

      {/* FRONT WALL */}

      <mesh position={[0, 1.7, -5.1]}>
        <boxGeometry args={[12, 3.4, 0.2]} />
        {wall}
      </mesh>

      {/* BACK WALL */}

      <mesh position={[0, 1.7, 5.1]}>
        <boxGeometry args={[12, 3.4, 0.2]} />
        {wall}
      </mesh>

      {/* LEFT WALL */}

      <mesh position={[-6.1, 1.7, 0]}>
        <boxGeometry args={[0.2, 3.4, 10]} />
        {wall}
      </mesh>

      {/* RIGHT WALL */}

      <mesh position={[6.1, 1.7, 0]}>
        <boxGeometry args={[0.2, 3.4, 10]} />
        {wall}
      </mesh>

      {/* CEILING */}

      <mesh position={[0, 3.4, 0]}>
        <boxGeometry args={[12.4, 0.2, 10.4]} />
        <meshStandardMaterial color="#454c47" />
      </mesh>

      {/* FRONT WALL TRIM */}

      <mesh position={[0, 0.45, -4.98]}>
        <boxGeometry args={[12, 0.9, 0.05]} />
        {trim}
      </mesh>

      {/* BLACKBOARD */}

      <Board />

      {/* PHANTOM */}

      <Phantom />

      {/* DOOR */}

      <mesh position={[4.5, 1.1, 4.98]}>
        <boxGeometry args={[1, 2.2, 0.1]} />
        <meshStandardMaterial color="#765033" />
      </mesh>

      {/* WINDOWS */}

      {[-3, 0, 3].map(z => (
        <group
          key={z}
          position={[-5.99, 1.9, z]}
        >
          <mesh
            rotation-y={Math.PI / 2}
            material={winMat.current}
          >
            <planeGeometry args={[1.7, 1.4]} />
          </mesh>

          {/* Window frame */}

          <mesh position={[0.02, 0, 0]}>
            <boxGeometry args={[0.06, 1.4, 0.06]} />
            <meshStandardMaterial color="#292b2a" />
          </mesh>

          <mesh position={[0.02, 0, 0]}>
            <boxGeometry args={[0.06, 0.06, 1.7]} />
            <meshStandardMaterial color="#292b2a" />
          </mesh>
        </group>
      ))}

      {/* MOON */}

      <mesh
        ref={moon}
        visible={false}
        position={[-5.97, 2.3, 0.45]}
        rotation-y={Math.PI / 2}
      >
        <circleGeometry args={[0.22, 20]} />
        <meshBasicMaterial color="#e8e8ff" />
      </mesh>

      {/* WINDOW SILHOUETTE */}

      <group ref={sil} visible={false}>
        <mesh>
          <boxGeometry args={[0.1, 0.9, 0.45]} />
          <meshBasicMaterial color="#000" />
        </mesh>

        <mesh position={[0, 0.65, 0]}>
          <sphereGeometry args={[0.22, 10, 8]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      </group>

      {/* CLOCK */}

      <Clock />
    </>
  )
}
