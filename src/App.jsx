
import { Canvas } from '@react-three/fiber'
import { useGame } from './systems/GameState.js'

import Classroom from './classroom/Classroom.jsx'
import Lighting from './classroom/Lighting.jsx'
import Furniture from './classroom/Furniture.jsx'
import Player from './classroom/Player.jsx'
import Students from './characters/Students.jsx'
import Simulation from './systems/Simulation.js'

import MainMenu from './components/MainMenu.jsx'
import GameInterface from './components/GameInterface.jsx'
import Notebook from './components/Notebook.jsx'
import EndScreen from './components/EndScreen.jsx'

export default function App() {
  const g = useGame()

  return (
    <>
      {g.screen !== 'menu' && (
        <Canvas
          camera={{
            fov: 70,
            near: 0.1,
            far: 100,
            position: [0, 1.6, 4.2]
          }}
          dpr={[1, 2]}
          shadows
          gl={{ antialias: true }}
          style={{
            width: '100vw',
            height: '100vh',
            display: 'block'
          }}
        >
          <color attach="background" args={['#05070a']} />
          <fog attach="fog" args={['#05070a', 14, 35]} />

          <Lighting />
          <Classroom />
          <Furniture />
          <Students />
          <Player />
          <Simulation />
        </Canvas>
      )}

      <div id="vig" />

      {g.screen === 'menu' && <MainMenu />}
      {g.screen !== 'menu' && <GameInterface />}
      {g.screen === 'play' && g.bookOpen && <Notebook />}
      {g.screen === 'end' && <EndScreen />}
    </>
  )
}
