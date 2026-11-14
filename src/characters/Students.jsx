import { memo, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { game, useGame } from '../systems/GameState.js'
import { seatPos } from '../systems/IdentitySystem.js'
import { updateStudent } from './Behaviours.js'

/* ====================================================================
   WHAT'S NEW
   - Real proportions: seated height, head ~1/7 of body, shoulders, neck, jaw, cheekbones.
   - School uniform: blazer with lapels, shirt, collar, tie, crest, buttons, skirt or trousers.
   - Seated pose: thighs on the chair, shins down, shoes on the floor, forearms resting on the desk.
   - Detailed face: eyeballs with textured irises, glossy corneas, lids, brows, nose, lips,
     cheeks, ears. The mouth changes with how the student feels (smile / neutral / frown).
   - Hair styles with a proper hairline (short, long, curly).
   - Per-student variation (build, head size, eye colour). Fabric/hair/skin bump textures.
   - Standing pose (for hostile / fleeing students), vampire fangs once exposed.
   - Death: slumps out of the chair, head lolls, skin pales, irregular blood pools and a wound.
   - Everything Behaviours.js expects is still in s.ref (see the list in the effect below).
   ==================================================================== */

const FEMALE = new Set(['Mira', 'Lena', 'Ivy', 'Nora'])
const NAMES_STYLE = { Sam: 'short', Mira: 'long', Theo: 'curly', Lena: 'long', Jonah: 'short', Ivy: 'curly', Caleb: 'short', Nora: 'long' }
const EYE_COLOURS = ['#5a3a22', '#3b6a8c', '#4f7a4a', '#2e2a28', '#7a5a2a', '#6a7a8a']

const hash = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10000) / 10000
}
const rnd = (seed, i) => { const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x) }

/* ---------- shared procedural textures (created once) ---------- */

const texCache = {}
function canvasTex(key, size, draw, repeat = 1) {
  if (texCache[key]) return texCache[key]
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  return (texCache[key] = t)
}
const noiseTex = () => canvasTex('noise', 128, (g, n) => {
  const img = g.createImageData(n, n)
  for (let i = 0; i < n * n; i++) { const v = 128 + (Math.random() - 0.5) * 70; img.data.set([v, v, v, 255], i * 4) }
  g.putImageData(img, 0, 0)
}, 3)
const weaveTex = () => canvasTex('weave', 64, (g, n) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, n, n)
  g.strokeStyle = '#b0b0b0'; g.lineWidth = 2
  for (let i = -n; i < n * 2; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + n, n); g.stroke() }
}, 10)
function irisTex(hex) {
  return canvasTex('iris' + hex, 64, (g, n) => {
    const c = n / 2
    const grad = g.createRadialGradient(c, c, n * 0.1, c, c, c)
    grad.addColorStop(0, new THREE.Color(hex).multiplyScalar(1.5).getStyle())
    grad.addColorStop(0.7, hex)
    grad.addColorStop(1, new THREE.Color(hex).multiplyScalar(0.35).getStyle())
    g.fillStyle = grad; g.fillRect(0, 0, n, n)
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1
    for (let i = 0; i < 36; i++) { // radial fibres
      const a = (i / 36) * Math.PI * 2
      g.beginPath(); g.moveTo(c + Math.cos(a) * n * 0.16, c + Math.sin(a) * n * 0.16); g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke()
    }
    g.fillStyle = '#050505'; g.beginPath(); g.arc(c, c, n * 0.15, 0, Math.PI * 2); g.fill() // pupil
  })
}

/* ---------- shared geometry helpers ---------- */

// Front surface (most negative z) of the face at (x, y), in head-centre coordinates.
const front = (cy, cz, rx, ry, rz, x, y) => {
  const u = (y - cy) / ry, v = x / rx, q = 1 - u * u - v * v
  return q > 0 ? cz - rz * Math.sqrt(q) : Infinity
}
const faceZ = (x, y) => Math.min(front(0.012, 0.004, 0.082, 0.108, 0.1, x, y), front(-0.062, -0.012, 0.06, 0.06, 0.072, x, y))

const TORSO_PROFILE = [[0.14, 0], [0.138, 0.07], [0.145, 0.14], [0.16, 0.23], [0.178, 0.33], [0.188, 0.40], [0.182, 0.45], [0.14, 0.49], [0.075, 0.52]]
  .map(([r, y]) => new THREE.Vector2(r, y))

const polyShape = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); return s }
const SHAPES = {
  shirt: polyShape([[-0.06, 0], [0.06, 0], [0.015, -0.27], [-0.015, -0.27]]),
  lapel: polyShape([[-0.06, 0], [-0.12, 0.01], [-0.15, -0.06], [-0.085, -0.17], [-0.035, -0.27], [-0.015, -0.27]]),
  tie: polyShape([[-0.014, -0.035], [0.014, -0.035], [0.024, -0.2], [0, -0.235], [-0.024, -0.2]]),
}

// Irregular blood pool outline.
function splatGeometry(seed, radius) {
  const pts = []
  const n = 22
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = radius * (0.7 + 0.45 * rnd(seed, i) + 0.15 * Math.sin(a * 3 + seed))
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  return new THREE.ShapeGeometry(polyShape(pts))
}

/* ====================================================================
   SMALL BODY-PART COMPONENTS
   ==================================================================== */

function Shoe({ mats, position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.022, 0]} material={mats.sole}><boxGeometry args={[0.105, 0.024, 0.27]} /></mesh>
      <mesh position={[0, 0.058, 0.01]} scale={[1, 0.62, 1.85]} material={mats.shoe}><sphereGeometry args={[0.058, 20, 14]} /></mesh>
      <mesh position={[0, 0.045, -0.085]} scale={[1.05, 0.7, 1.3]} material={mats.shoe}><sphereGeometry args={[0.052, 16, 12]} /></mesh>
      <mesh position={[0, 0.097, -0.01]} rotation-x={0.25} material={mats.white}><boxGeometry args={[0.04, 0.004, 0.07]} /></mesh>
    </group>
  )
}

function Hand({ mats, side }) {
  const lengths = [0.036, 0.046, 0.048, 0.04]
  return (
    <group>
      <mesh position={[0, -0.045, 0]} material={mats.skin}><boxGeometry args={[0.07, 0.085, 0.026]} /></mesh>
      {[-0.024, -0.008, 0.008, 0.024].map((x, i) => (
        <mesh key={i} position={[x, -0.088 - lengths[i] / 2, 0]} rotation-x={0.1} material={mats.skin}>
          <capsuleGeometry args={[0.0085, lengths[i], 4, 8]} />
        </mesh>
      ))}
      <mesh position={[-side * 0.043, -0.05, -0.004]} rotation-z={side * 0.55} material={mats.skin}>
        <capsuleGeometry args={[0.0105, 0.035, 4, 8]} />
      </mesh>
    </group>
  )
}

function Eye({ mats, index, x, y, eyeRef, female }) {
  return (
    <group ref={eyeRef} position={[x, y, faceZ(x, y) + 0.003]}>
      <mesh material={mats.eye[index]}><sphereGeometry args={[0.0165, 20, 16]} /></mesh>
      <mesh position={[0, 0, -0.0158]} rotation-y={Math.PI} material={mats.iris}><circleGeometry args={[0.0092, 24]} /></mesh>
      <mesh material={mats.cornea}><sphereGeometry args={[0.0173, 16, 12]} /></mesh>
      <mesh position={[0.0045, 0.0045, -0.0186]} material={mats.glint}><sphereGeometry args={[0.0022, 8, 6]} /></mesh>
      <mesh position={[0, 0, -0.008]} material={female ? mats.lash : mats.lid}><torusGeometry args={[0.0186, 0.0042, 8, 20, Math.PI]} /></mesh>
      <mesh position={[0, 0, -0.008]} rotation-z={Math.PI} material={mats.lid}><torusGeometry args={[0.0178, 0.003, 8, 20, Math.PI]} /></mesh>
    </group>
  )
}

function Hair({ style, mats, seed }) {
  const crown = []
  if (style === 'curly') {
    for (let i = 0; i < 16; i++) { // golden-angle spiral over the upper hemisphere
      const t = (i + 0.5) / 16, phi = i * 2.399963
      const r = Math.sin(t * 1.35) , y = Math.cos(t * 1.35)
      crown.push([Math.cos(phi) * r * 0.09, y * 0.112 + 0.018, Math.sin(phi) * r * 0.1 + 0.005, 0.03 + 0.008 * rnd(seed, i)])
    }
  }
  return (
    <group>
      {/* scalp: tilted so the hairline rises at the front and drops at the nape */}
      <mesh position={[0, 0.018, 0.006]} rotation-x={0.42} scale={[0.089, 0.119, 0.107]} material={mats.hair}>
        <sphereGeometry args={[1, 40, 24, 0, Math.PI * 2, 0, 1.75]} />
      </mesh>
      {style === 'short' && (
        <>
          <mesh position={[0, 0.073, -0.07]} scale={[0.07, 0.024, 0.035]} material={mats.hair}><sphereGeometry args={[1, 16, 10]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.079, -0.012, -0.02]} scale={[0.01, 0.034, 0.03]} material={mats.hair}><sphereGeometry args={[1, 10, 8]} /></mesh>)}
        </>
      )}
      {style === 'long' && (
        <>
          <mesh position={[0, -0.09, 0.062]} scale={[1.05, 1, 0.6]} material={mats.hair}><capsuleGeometry args={[0.078, 0.15, 6, 14]} /></mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.088, -0.075, -0.008]} material={mats.hair}><capsuleGeometry args={[0.026, 0.12, 6, 10]} /></mesh>
              <mesh position={[s * 0.04, 0.062, -0.073]} rotation-z={s * -0.5} scale={[1, 0.5, 0.6]} material={mats.hair}><sphereGeometry args={[0.04, 14, 10]} /></mesh>
            </group>
          ))}
        </>
      )}
      {crown.map((c, i) => <mesh key={i} position={[c[0], c[1], c[2]]} material={mats.hair}><sphereGeometry args={[c[3], 12, 10]} /></mesh>)}
    </group>
  )
}

/* ====================================================================
   THE STUDENT
   ==================================================================== */

const Student = memo(function Student({ s }) {
  const female = FEMALE.has(s.name)
  const style = NAMES_STYLE[s.name] || 'short'
  const seed = hash(s.name) * 1000
  const build = useMemo(() => ({ w: 0.96 + 0.08 * hash(s.name + 'w'), h: 0.97 + 0.06 * hash(s.name + 'h'), head: 0.96 + 0.08 * hash(s.name + 'k') }), [s])

  const mats = useMemo(() => {
    const ghost = s.identity === 'Ghost'
    const fade = [] // every material the ghost effect should fade
    const make = (color, extra = {}) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, transparent: ghost, opacity: ghost ? 0.76 : 1, ...extra })
      fade.push(m)
      return m
    }
    const skinC = new THREE.Color(s.skinNormal || '#c58e6b')
    const jacketC = new THREE.Color(s.jacket || '#293d53')
    const irisHex = EYE_COLOURS[Math.floor(hash(s.name + 'e') * EYE_COLOURS.length)]
    const bump = { bumpMap: noiseTex(), bumpScale: 0.25 }
    const eye = [0, 1].map(() => make('#efe9e1', { roughness: 0.25, emissive: '#000000' }))
    return {
      fade, eye,
      skin: make(skinC, { roughness: 0.58, ...bump, bumpScale: 0.12 }),
      jacket: make(jacketC, { roughness: 0.9, side: THREE.DoubleSide, bumpMap: weaveTex(), bumpScale: 0.5 }),
      jacketDark: make(jacketC.clone().multiplyScalar(0.7), { roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
      hair: make(s.hair || '#211a18', { roughness: 0.62, ...bump, bumpScale: 0.5 }),
      shirt: make('#eceae2', { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }),
      white: make('#f5f1e8'),
      tie: make('#873e43', { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 }),
      brass: make('#b89a4a', { roughness: 0.35, metalness: 0.7 }),
      bottom: make(female ? '#2e3446' : '#252b34', { roughness: 0.92, side: THREE.DoubleSide, flatShading: female, bumpMap: weaveTex(), bumpScale: 0.4 }),
      tights: make('#1d1f27', { roughness: 0.7 }),
      shoe: make('#17191d', { roughness: 0.4 }),
      sole: make('#0b0b0d'),
      lip: make(skinC.clone().lerp(new THREE.Color('#a04a4a'), 0.5).multiplyScalar(0.92), { roughness: 0.35 }),
      lid: make(skinC.clone().multiplyScalar(0.8)),
      lash: make(new THREE.Color(s.hair || '#211a18').multiplyScalar(0.6)),
      mouthIn: make('#3a1212'),
      iris: new THREE.MeshStandardMaterial({ map: irisTex(irisHex), roughness: 0.3, transparent: ghost, opacity: ghost ? 0.76 : 1 }),
      cornea: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.14, roughness: 0.02, depthWrite: false }),
      glint: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      blush: new THREE.MeshStandardMaterial({ color: skinC.clone().lerp(new THREE.Color('#d06a6a'), 0.55), transparent: true, opacity: 0.22, roughness: 1, depthWrite: false }),
      blood: new THREE.MeshStandardMaterial({ color: '#5a0507', roughness: 0.12, transparent: true, opacity: 0.96, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    }
  }, [s, female])

  const bloodGeos = useMemo(() => [splatGeometry(seed, 0.32), splatGeometry(seed + 7, 0.18), splatGeometry(seed + 13, 0.14)], [seed])

  /* ---------- refs ---------- */
  const group = useRef(), fall = useRef(), shadow = useRef(), shN = useRef(), shW = useRef()
  const head = useRef(), b0 = useRef(), b1 = useRef(), e0 = useRef(), e1 = useRef()
  const blood = useRef(), blood2 = useRef(), blood3 = useRef(), wound = useRef()
  const mN = useRef(), mS = useRef(), mF = useRef(), fangs = useRef()
  const chest = useRef(), seated = useRef(), standing = useRef()
  const armU = useRef([]), armF = useRef([])

  const p = seatPos(s.seat)

  useEffect(() => {
    // Everything Behaviours.js / the rest of the game reads from here.
    s.ref = {
      group: group.current, fall: fall.current,
      shadow: shadow.current, shN: shN.current, shW: shW.current,
      head: head.current, brows: [b0.current, b1.current], eyes: [e0.current, e1.current],
      mats, blood: blood.current, bloods: [blood.current, blood2.current, blood3.current], wound: wound.current,
      mouth: { neutral: mN.current, smile: mS.current, frown: mF.current }, fangs: fangs.current,
      chest: chest.current, seated: seated.current, standing: standing.current,
      arms: [{ upper: armU.current[0], fore: armF.current[0] }, { upper: armU.current[1], fore: armF.current[1] }],
    }
    return () => { s.ref = null }
  }, [s, mats])

  const black = { color: '#000000', transparent: true, opacity: 0.42, depthWrite: false }
  const eyeY = 0.008, mouthY = -0.06

  return (
    <>
      {/* FLOOR SHADOW (circle normally, wolf shape once a werewolf is exposed) */}
      <group ref={shadow} position={[p.x, 0.02, p.z]}>
        <mesh ref={shN} rotation-x={-Math.PI / 2} scale={[0.55, 0.4, 1]}><circleGeometry args={[1, 32]} /><meshBasicMaterial {...black} /></mesh>
        <group ref={shW} visible={false} rotation-y={Math.PI / 2}>
          <mesh><boxGeometry args={[1, 0.01, 0.35]} /><meshBasicMaterial {...black} /></mesh>
          <mesh position={[0.65, 0, 0]}><boxGeometry args={[0.35, 0.01, 0.28]} /><meshBasicMaterial {...black} /></mesh>
          <mesh position={[0.85, 0, 0.1]}><boxGeometry args={[0.12, 0.01, 0.1]} /><meshBasicMaterial {...black} /></mesh>
          <mesh position={[0.85, 0, -0.1]}><boxGeometry args={[0.12, 0.01, 0.1]} /><meshBasicMaterial {...black} /></mesh>
        </group>
      </group>

      {/* BLOOD ON THE FLOOR (irregular pools, grown by the death animation) */}
      <group position={[p.x, 0.025, p.z]}>
        <mesh ref={blood} geometry={bloodGeos[0]} material={mats.blood} rotation-x={-Math.PI / 2} scale={[0.01, 0.01, 1]} visible={false} />
        <mesh ref={blood2} geometry={bloodGeos[1]} material={mats.blood} position={[0.28, 0.002, 0.12]} rotation-x={-Math.PI / 2} scale={[0.01, 0.01, 1]} visible={false} />
        <mesh ref={blood3} geometry={bloodGeos[2]} material={mats.blood} position={[-0.3, 0.003, -0.1]} rotation-x={-Math.PI / 2} scale={[0.01, 0.01, 1]} visible={false} />
      </group>

      {/* STUDENT ROOT (Behaviours.js moves / rotates / scales this) */}
      <group ref={group} position={[p.x, 0, p.z]}>
        {/* FALL PIVOT at the hips so the body can collapse sideways */}
        <group ref={fall} position={[0, 0.53, 0]}>
          <group position={[0, -0.53, 0]}>
            <group scale={[build.w, build.h, build.w]}>

              {/* ---------- HIPS, SKIRT ---------- */}
              <mesh position={[0, 0.54, 0]} scale={[0.175, 0.105, 0.135]} material={mats.bottom}><sphereGeometry args={[1, 20, 14]} /></mesh>
              {female && <mesh position={[0, 0.47, 0]} material={mats.bottom}><cylinderGeometry args={[0.19, 0.27, 0.3, 24, 1, true]} /></mesh>}

              {/* ---------- SEATED LEGS ---------- */}
              <group ref={seated}>
                {female && <mesh position={[0, 0.605, -0.2]} rotation-x={0.07} material={mats.bottom}><boxGeometry args={[0.37, 0.03, 0.36]} /></mesh>}
                {[-1, 1].map((sd) => (
                  <group key={sd}>
                    <mesh position={[sd * 0.098, 0.555, -0.2]} rotation-x={Math.PI / 2} material={female ? mats.tights : mats.bottom}><capsuleGeometry args={[0.074, 0.27, 6, 12]} /></mesh>
                    <mesh position={[sd * 0.098, 0.3, -0.405]} material={female ? mats.tights : mats.bottom}><capsuleGeometry args={[0.057, 0.33, 6, 12]} /></mesh>
                    {female
                      ? <mesh position={[sd * 0.098, 0.12, -0.41]} material={mats.white}><cylinderGeometry args={[0.052, 0.05, 0.08, 14]} /></mesh>
                      : <mesh position={[sd * 0.098, 0.12, -0.41]} material={mats.bottom}><cylinderGeometry args={[0.064, 0.067, 0.04, 14]} /></mesh>}
                    <Shoe mats={mats} position={[sd * 0.098, 0, -0.5]} />
                  </group>
                ))}
              </group>

              {/* ---------- STANDING LEGS (hostile / fleeing students; their group is lifted 0.35) ---------- */}
              <group ref={standing} visible={false}>
                {[-1, 1].map((sd) => (
                  <group key={sd}>
                    <mesh position={[sd * 0.098, 0.33, 0]} material={female ? mats.tights : mats.bottom}><capsuleGeometry args={[0.078, 0.3, 6, 12]} /></mesh>
                    <mesh position={[sd * 0.098, -0.1, 0]} material={female ? mats.tights : mats.bottom}><capsuleGeometry args={[0.058, 0.3, 6, 12]} /></mesh>
                    <Shoe mats={mats} position={[sd * 0.098, -0.35, -0.06]} />
                  </group>
                ))}
              </group>

              {/* ---------- TORSO: blazer, shirt, tie ---------- */}
              <group ref={chest} position={[0, 0.5, 0]}>
                <mesh scale={[1, 1, 0.64]} material={mats.jacket}><latheGeometry args={[TORSO_PROFILE, 28]} /></mesh>
                <mesh position={[0, 0.5, -0.1235]} material={mats.shirt}><shapeGeometry args={[SHAPES.shirt]} /></mesh>
                <mesh position={[0, 0.5, -0.1265]} material={mats.jacketDark}><shapeGeometry args={[SHAPES.lapel]} /></mesh>
                <mesh position={[0, 0.5, -0.1265]} scale={[-1, 1, 1]} material={mats.jacketDark}><shapeGeometry args={[SHAPES.lapel]} /></mesh>
                <mesh position={[0, 0.5, -0.1295]} material={mats.tie}><shapeGeometry args={[SHAPES.tie]} /></mesh>
                <mesh position={[0, 0.475, -0.128]} scale={[1, 0.85, 0.7]} material={mats.tie}><sphereGeometry args={[0.02, 12, 10]} /></mesh>
                {[0.18, 0.1].map((y) => (
                  <mesh key={y} position={[0, y, -0.12]} rotation-x={Math.PI / 2} material={mats.brass}><cylinderGeometry args={[0.009, 0.009, 0.006, 12]} /></mesh>
                ))}
                {/* school crest on the breast */}
                <mesh position={[0.09, 0.33, -0.1155]} rotation-y={Math.PI} material={mats.brass}><circleGeometry args={[0.02, 16]} /></mesh>
                <mesh position={[0.09, 0.33, -0.1165]} rotation-y={Math.PI} material={mats.white}><circleGeometry args={[0.011, 12]} /></mesh>
                {/* wound (shown by the death animation) */}
                <mesh ref={wound} position={[-0.03, 0.28, -0.1245]} rotation-y={Math.PI} scale={[0.01, 0.01, 1]} visible={false} material={mats.blood}><circleGeometry args={[1, 20]} /></mesh>
              </group>
              {/* shoulders, neck, collar */}
              {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.2, 0.96, 0]} scale={[1, 1.1, 1]} material={mats.jacket}><sphereGeometry args={[0.055, 16, 12]} /></mesh>)}
              <mesh position={[0, 0.99, 0]} scale={[1, 0.5, 0.65]} material={mats.jacket}><sphereGeometry args={[0.15, 20, 12]} /></mesh>
              <mesh position={[0, 1.08, 0]} material={mats.skin}><cylinderGeometry args={[0.036, 0.042, 0.15, 16]} /></mesh>
              <mesh position={[0, 1.04, -0.004]} rotation-x={Math.PI / 2} scale={[1, 1.1, 1]} material={mats.white}><torusGeometry args={[0.05, 0.011, 8, 22]} /></mesh>
              {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.034, 1.035, -0.062]} rotation-z={sd * -0.55} material={mats.white}><boxGeometry args={[0.045, 0.028, 0.008]} /></mesh>)}

              {/* ---------- ARMS: forearms rest on the desk when seated ---------- */}
              {[-1, 1].map((sd, i) => (
                <group key={sd} position={[sd * 0.205, 0.96, 0]}>
                  <group ref={(el) => (armU.current[i] = el)} rotation-x={1.05} rotation-z={sd * 0.06}>
                    <mesh position={[0, -0.145, 0]} material={mats.jacket}><capsuleGeometry args={[0.047, 0.2, 6, 12]} /></mesh>
                    <group position={[0, -0.29, 0]}>
                      <group ref={(el) => (armF.current[i] = el)} rotation-x={0.52}>
                        <mesh position={[0, -0.125, 0]} material={mats.jacket}><capsuleGeometry args={[0.039, 0.17, 6, 12]} /></mesh>
                        <mesh position={[0, -0.235, 0]} material={mats.shirt}><cylinderGeometry args={[0.04, 0.04, 0.026, 14]} /></mesh>
                        <group position={[0, -0.26, 0]}><Hand mats={mats} side={sd} /></group>
                      </group>
                    </group>
                  </group>
                </group>
              ))}

              {/* ---------- HEAD (pivots at the neck so it turns naturally) ---------- */}
              <group ref={head} position={[0, 1.13, 0]}>
                <group position={[0, 0.12, 0]} scale={[build.head, build.head, build.head]}>
                  <mesh position={[0, 0.012, 0.004]} scale={[0.082, 0.108, 0.1]} material={mats.skin}><sphereGeometry args={[1, 40, 32]} /></mesh>
                  <mesh position={[0, -0.062, -0.012]} scale={[0.06, 0.06, 0.072]} material={mats.skin}><sphereGeometry args={[1, 28, 20]} /></mesh>
                  <mesh position={[0, -0.098, -0.04]} scale={[0.026, 0.022, 0.026]} material={mats.skin}><sphereGeometry args={[1, 16, 12]} /></mesh>
                  {[-1, 1].map((sd) => (
                    <group key={sd}>
                      <mesh position={[sd * 0.052, -0.012, faceZ(sd * 0.052, -0.012) + 0.012]} scale={[1, 0.8, 0.8]} material={mats.skin}><sphereGeometry args={[0.03, 14, 10]} /></mesh>
                      <mesh position={[sd * 0.083, -0.005, 0.008]} scale={[0.35, 1, 0.75]} material={mats.skin}><sphereGeometry args={[0.032, 14, 12]} /></mesh>
                      <mesh position={[sd * 0.085, -0.005, 0.008]} scale={[0.2, 0.6, 0.45]} material={mats.lid}><sphereGeometry args={[0.032, 12, 10]} /></mesh>
                      <mesh position={[sd * 0.052, -0.035, faceZ(sd * 0.052, -0.035) + 0.002]} scale={[1, 0.7, 0.3]} material={mats.blush}><sphereGeometry args={[0.028, 14, 10]} /></mesh>
                    </group>
                  ))}

                  {/* eyes and brows */}
                  <Eye mats={mats} index={0} x={-0.036} y={eyeY} eyeRef={e0} female={female} />
                  <Eye mats={mats} index={1} x={0.036} y={eyeY} eyeRef={e1} female={female} />
                  <group ref={b0} position={[-0.037, 0.04, faceZ(-0.037, 0.04) - 0.002]}>
                    <mesh rotation-z={Math.PI / 2} scale={[1, 1, 0.7]} material={mats.hair}><capsuleGeometry args={[female ? 0.0035 : 0.0052, 0.03, 4, 8]} /></mesh>
                  </group>
                  <group ref={b1} position={[0.037, 0.04, faceZ(0.037, 0.04) - 0.002]}>
                    <mesh rotation-z={Math.PI / 2} scale={[1, 1, 0.7]} material={mats.hair}><capsuleGeometry args={[female ? 0.0035 : 0.0052, 0.03, 4, 8]} /></mesh>
                  </group>

                  {/* nose */}
                  <mesh position={[0, 0.0, faceZ(0, 0) - 0.005]} rotation-x={-0.15} material={mats.skin}><capsuleGeometry args={[0.0085, 0.032, 4, 8]} /></mesh>
                  <mesh position={[0, -0.024, faceZ(0, -0.024) - 0.012]} scale={[1, 0.82, 1]} material={mats.skin}><sphereGeometry args={[0.0135, 14, 12]} /></mesh>
                  {[-1, 1].map((sd) => (
                    <group key={sd}>
                      <mesh position={[sd * 0.012, -0.027, faceZ(0, -0.027) - 0.0045]} material={mats.skin}><sphereGeometry args={[0.0085, 10, 8]} /></mesh>
                      <mesh position={[sd * 0.0065, -0.032, faceZ(0, -0.032) - 0.0095]} scale={[0.7, 0.45, 0.6]} material={mats.mouthIn}><sphereGeometry args={[0.006, 8, 6]} /></mesh>
                    </group>
                  ))}

                  {/* mouth: three expressions, toggled by the animation loop */}
                  <group position={[0, mouthY, faceZ(0, mouthY) - 0.002]}>
                    <group ref={mN}>
                      <mesh scale={[1, 0.25, 0.5]} material={mats.mouthIn}><boxGeometry args={[0.046, 0.012, 0.006]} /></mesh>
                      <mesh position={[0, 0.0055, 0]} rotation-z={Math.PI / 2} material={mats.lip}><capsuleGeometry args={[0.0048, 0.03, 4, 8]} /></mesh>
                      <mesh position={[0, -0.0075, 0]} rotation-z={Math.PI / 2} material={mats.lip}><capsuleGeometry args={[0.0062, 0.028, 4, 8]} /></mesh>
                    </group>
                    <group ref={mS} visible={false}>
                      <mesh position={[0, 0.002, 0.002]} scale={[1, 0.55, 0.4]} material={mats.mouthIn}><circleGeometry args={[0.024, 16, Math.PI, Math.PI]} /></mesh>
                      <mesh position={[0, 0.0015, 0.0005]} scale={[1, 0.5, 0.4]} material={mats.white}><circleGeometry args={[0.02, 16, Math.PI, Math.PI]} /></mesh>
                      <mesh position={[0, 0.012, 0]} rotation-z={Math.PI} scale={[1, 0.55, 1]} material={mats.lip}><torusGeometry args={[0.026, 0.0048, 8, 20, Math.PI]} /></mesh>
                    </group>
                    <group ref={mF} visible={false}>
                      <mesh position={[0, -0.012, 0]} scale={[1, 0.45, 1]} material={mats.lip}><torusGeometry args={[0.024, 0.0052, 8, 20, Math.PI]} /></mesh>
                      <mesh position={[0, -0.0035, 0]} rotation-z={Math.PI / 2} material={mats.lip}><capsuleGeometry args={[0.0045, 0.028, 4, 8]} /></mesh>
                    </group>
                    {/* vampire fangs (after the exposure) */}
                    <group ref={fangs} visible={false}>
                      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.011, -0.01, -0.003]} rotation-x={Math.PI} material={mats.white}><coneGeometry args={[0.0042, 0.016, 8]} /></mesh>)}
                    </group>
                  </group>

                  <Hair style={style} mats={mats} seed={seed} />
                </group>
              </group>

            </group>
          </group>
        </group>
      </group>
    </>
  )
})

/* ====================================================================
   ANIMATION (runs on top of Behaviours.js)
   ==================================================================== */

const PALE = new THREE.Color('#9ea39b')
const lerp = (a, b, k) => a + (b - a) * k

// Posture, breathing and facial expression for living students.
function animateBody(s, dt, t) {
  const r = s.ref
  if (!r) return
  const isStanding = s.hostile || s.mode === 'flee'
  r.seated.visible = !isStanding
  r.standing.visible = isStanding

  const k = Math.min(1, dt * 5)
  r.arms.forEach((a, i) => {
    if (!a.upper) return
    const side = i === 0 ? -1 : 1
    a.upper.rotation.x = lerp(a.upper.rotation.x, isStanding ? 0.05 : 1.05, k)
    a.fore.rotation.x = lerp(a.fore.rotation.x, isStanding ? 0.18 : 0.52, k)
    a.upper.rotation.z = lerp(a.upper.rotation.z, side * (isStanding ? 0.09 : 0.06), k)
  })

  const b = Math.sin(t * 1.8 + s.seat) * 0.012 // breathing
  r.chest.scale.set(1 + b, 1 + b * 1.4, 1 + b)

  const mode = s.hostile || s.mode === 'flee' ? 'frown'
    : game.bellCount === 0 ? 'smile' // before the first bell everyone is friendly
    : s.band === 'warm' ? 'smile' : s.band === 'cold' ? 'frown' : 'neutral'
  if (s.mouthMode !== mode) {
    s.mouthMode = mode
    r.mouth.neutral.visible = mode === 'neutral'
    r.mouth.smile.visible = mode === 'smile'
    r.mouth.frown.visible = mode === 'frown'
  }
  r.fangs.visible = !!(s.revealed && s.identity === 'Vampire')
}

// Collapse out of the chair, pale skin, blood pools and a wound.
function animateDeath(s, dt) {
  const r = s.ref
  if (!r) return
  if (s.dying) s.deathProgress = Math.min(1, (s.deathProgress || 0) + dt / 2.4)
  else if (s.deathProgress === undefined) s.deathProgress = 1 // marked dead without an animation: snap to the end
  const t = s.deathProgress
  if (s.deathApplied === 1 && t >= 1) return
  const e = t * t * (3 - 2 * t)
  const dir = s.seat % 2 === 0 ? 1 : -1

  r.seated.visible = true; r.standing.visible = false
  r.fall.rotation.z = dir * 1.45 * e
  r.fall.rotation.x = 0.1 * e
  r.fall.position.x = dir * 0.42 * e
  r.fall.position.y = 0.53 - 0.4 * e
  r.head.rotation.set(0.3 * e, 0, dir * 0.45 * e)
  r.eyes.forEach((eye) => eye && (eye.scale.y = 0.12)) // eyes close
  r.mats.skin.color.lerp(PALE, Math.min(1, dt * 1.2))
  r.arms.forEach((a) => { if (a.upper) { a.upper.rotation.x = lerp(1.05, 0.15, e); a.fore.rotation.x = lerp(0.52, 0.3, e) } })

  const sizes = [1, 0.8, 0.6], delays = [0.12, 0.3, 0.45]
  r.bloods.forEach((m, i) => {
    if (!m) return
    const local = Math.max(0, Math.min(1, (t - delays[i]) / (1 - delays[i])))
    const sz = 0.1 + local * local * (3 - 2 * local) * sizes[i] * 0.9
    m.visible = t > delays[i]
    m.scale.set(sz, sz, 1)
  })
  if (r.wound) {
    r.wound.visible = t > 0.1
    const w = 0.02 + 0.05 * e
    r.wound.scale.set(w, w, 1)
  }
  if (t >= 1) { s.dying = false; s.bloodVisible = true; s.deathApplied = 1 }
}

export default function Students() {
  const g = useGame()

  useFrame((_, delta) => {
    if (game.screen === 'menu' || (game.screen === 'play' && game.bookOpen)) return
    const dt = Math.min(0.05, delta)
    game.anim += dt

    game.students.forEach((s) => {
      if (s.dead) { animateDeath(s, dt); return } // the dead don't behave normally
      updateStudent(s, dt, game.anim)
      animateBody(s, dt, game.anim)
    })
  })

  return game.students.map((s) => <Student key={g.round + s.name} s={s} />)
}