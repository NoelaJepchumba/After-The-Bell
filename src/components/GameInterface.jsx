
import { useEffect } from 'react'
import {
  game,
  useGame,
  toggleBook,
  emit,
  startGame
} from '../systems/GameState.js'
import { PHASES } from '../systems/Simulation.js'

export default function GameInterface() {
  const g = useGame()

  const pauseGame = () => {
    if (game.screen !== 'play' || game.bookOpen) return

    game.paused = !game.paused
    if (game.paused) document.exitPointerLock?.()
    emit()
  }

  const resumeGame = () => {
    game.paused = false
    emit()
  }

  const restartGame = () => {
    startGame(game.T)
  }

  const returnToMenu = () => {
    game.paused = false
    game.bookOpen = false
    game.screen = 'menu'
    emit()
  }

  useEffect(() => {
    const k = (e) => {
      if (e.code === 'KeyN' || e.code === 'Tab') {
        if (!game.paused && !game.bookOpen) {
          e.preventDefault()
          if (!e.repeat) toggleBook()
        }
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (game.screen === 'play' && !game.bookOpen) {
          e.preventDefault()

          if (!e.repeat) {
            game.paused = !game.paused
            if (game.paused) document.exitPointerLock?.()
            emit()
          }
        }
      }
    }

    addEventListener('keydown', k)

    return () => {
      removeEventListener('keydown', k)
    }
  }, [])

  return (
    <div id="hud">
      {!g.paused && (
        <>
          <div id="top">
            <div>
              <div>
                Bell in {Math.floor(g.secs / 60)}:
                {String(g.secs % 60).padStart(2, '0')}
              </div>

              <div className="dim">
                {PHASES[g.bellCount]}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              Composure
              <div id="hp">
                <div
                  id="hpf"
                  style={{ width: g.hp + '%' }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={pauseGame}
            style={{
              position: 'absolute',
              top: '75px',
              right: '20px',
              padding: '9px 18px',
              background: '#252b38',
              color: 'white',
              border: '1px solid #596174',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Pause (P)
          </button>

          {g.frozen && (
            <div id="freeze">
              Stay still. Watch.
            </div>
          )}

          <div id="cross" />
          <div id="focus">{g.focus}</div>

          {g.message && (
            <div
              key={g.message.id}
              id="msg"
              className="on"
            >
              {g.message.text}
            </div>
          )}

          <div id="notes">
            {g.notes.map((n) => (
              <div
                key={n.id}
                className={'note ' + n.kind}
              >
                {n.text}
              </div>
            ))}
          </div>

          <div id="hint">
            <kbd>WASD</kbd> move &nbsp;
            <kbd>N</kbd> notebook &nbsp;
            <kbd>P</kbd> pause
            <br />
            Click the room to look around
          </div>
        </>
      )}

      {g.paused && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#eee',
            fontFamily: 'inherit'
          }}
        >
          <h1
            style={{
              letterSpacing: '6px',
              marginBottom: '8px'
            }}
          >
            GAME PAUSED
          </h1>

          <p
            style={{
              color: '#999',
              marginBottom: '35px'
            }}
          >
            The classroom is waiting.
          </p>

          <button onClick={resumeGame}>
            Resume
          </button>

          <button onClick={restartGame}>
            Restart
          </button>

          <button onClick={returnToMenu}>
            Main Menu
          </button>

          <p
            style={{
              color: '#777',
              marginTop: '25px'
            }}
          >
            Press P or ESC to resume
          </p>
        </div>
      )}
    </div>
  )
}
