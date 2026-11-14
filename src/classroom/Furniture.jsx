
import { useFrame } from '@react-three/fiber'
import { game } from '../systems/GameState.js'
import { COLX, ROWZ, seatPos, wrap } from '../systems/IdentitySystem.js'

const WOOD = '#795536'
const DARK_WOOD = '#493020'

function Desk({ i }) {
  const x = COLX[i % 3]
  const z = ROWZ[Math.floor(i / 3)]
  const p = seatPos(i)

  return (
    <>
      {/* DESK TOP */}
      <mesh position={[x, 0.75, z]}>
        <boxGeometry args={[1.4, 0.08, 0.75]} />
        <meshStandardMaterial
          color={WOOD}
          roughness={0.8}
        />
      </mesh>

      {/* DESK FRONT EDGE */}
      <mesh position={[x, 0.69, z - 0.34]}>
        <boxGeometry args={[1.35, 0.07, 0.04]} />
        <meshStandardMaterial color={DARK_WOOD} />
      </mesh>

      {/* DESK LEGS */}
      {[-0.62, 0.62].map(offset => (
        <mesh
          key={offset}
          position={[x + offset, 0.37, z]}
        >
          <boxGeometry args={[0.06, 0.7, 0.65]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
      ))}

      {/* BOOK */}
      <group
        ref={el => (game.refs.books[i] = el)}
        position={[x + 0.25, 0.8, z]}
      >
        <mesh>
          <boxGeometry args={[0.34, 0.045, 0.25]} />
          <meshStandardMaterial
            color={`hsl(${i * 40}, 35%, 38%)`}
            roughness={0.9}
          />
        </mesh>

        <mesh position={[0, 0.024, 0]}>
          <boxGeometry args={[0.3, 0.003, 0.21]} />
          <meshStandardMaterial color="#e5dcc5" />
        </mesh>
      </group>

      {/* PENCIL */}
      <mesh
        position={[x - 0.32, 0.81, z - 0.12]}
        rotation-y={0.3}
      >
        <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
        <meshStandardMaterial color="#d4a34d" />
      </mesh>

      {/* CHAIR */}
      <group
        ref={el => (game.refs.chairs[i] = el)}
        position={[p.x, 0, p.z]}
      >
        {/* Seat */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.5, 0.07, 0.5]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>

        {/* Backrest */}
        <mesh position={[0, 0.75, 0.25]}>
          <boxGeometry args={[0.5, 0.55, 0.07]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>

        {/* Chair legs */}
        {[-0.19, 0.19].flatMap(dx =>
          [-0.19, 0.19].map(dz => (
            <mesh
              key={`${dx}-${dz}`}
              position={[dx, 0.22, dz]}
            >
              <boxGeometry args={[0.055, 0.44, 0.055]} />
              <meshStandardMaterial color="#352419" />
            </mesh>
          ))
        )}
      </group>
    </>
  )
}

export default function Furniture() {
  useFrame((_, d) => {
    const dt = Math.min(0.05, d)

    // Chairs slowly turn during supernatural events.
    game.refs.chairs.forEach(c => {
      if (!c) return

      const target = game.chairs > 0 ? Math.PI : 0

      c.rotation.y +=
        wrap(target - c.rotation.y) *
        Math.min(1, dt * 3)
    })

    // Books float and rotate during object events.
    game.refs.books.forEach((b, i) => {
      if (!b) return

      const on =
        game.objects > 0 &&
        game.objectSeats.includes(i)

      const targetY = on
        ? 1.5 + Math.sin(game.t * 3 + i) * 0.1
        : 0.8

      b.position.y +=
        (targetY - b.position.y) *
        Math.min(1, dt * 4)

      if (on) {
        b.rotation.y += dt * 2
        b.rotation.z = Math.sin(game.t * 2 + i) * 0.08
      } else {
        b.rotation.y *= 0.9
        b.rotation.z *= 0.9
      }
    })
  })

  return (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <Desk key={i} i={i} />
      ))}
    </>
  )
}
