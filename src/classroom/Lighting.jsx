
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { game } from '../systems/GameState.js'

const LAMP_Z = [-3, 0, 3]

export default function Lighting() {
  const amb = useRef()
  const lamps = useRef([])
  const fill = useRef()

  useFrame(() => {
    let v

    if (game.flick > 0) {
      v = Math.random() < 0.5
        ? (game.dark ? 0.55 : 0.8)
        : (game.dark ? 0.25 : 1)
    } else {
      v = game.dark ? 0.3 : 1
    }

   amb.current.intensity = game.dark ? 0.12 : 0.5

lamps.current.forEach(l => {
  if (l) l.intensity = (game.dark ? 0.08 : 0.9) * v
})

if (fill.current) {
  fill.current.intensity = game.dark ? 0.08 : 0.3
}
  })

  return (
    <>
      {/* General classroom illumination */}

      <ambientLight
        ref={amb}
        color="#aab9d5"
        intensity={0.5}
      />

      {/* Soft frontal fill light */}

      <directionalLight
        ref={fill}
        position={[0, 4, -5]}
        color="#dce7ff"
        intensity={0.3}
      />

      {/* Ceiling lights */}

      {LAMP_Z.map((z, i) => (
        <group key={z}>
          <pointLight
            ref={el => (lamps.current[i] = el)}
            color="#ffe6bd"
            intensity={0.9}
            distance={16}
            decay={1.2}
            position={[0, 3.1, z]}
          />

          <mesh position={[0, 3.35, z]}>
            <boxGeometry args={[0.3, 0.06, 2]} />
            <meshBasicMaterial color="#fff1d0" />
          </mesh>
        </group>
      ))}
    </>
  )
}
