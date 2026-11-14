import { game, emit, useGame } from '../systems/GameState.js'

export default function EndScreen() {
  const g = useGame()
  const ok = g.students.filter((s) => s.guess === s.identity).length
  return (
    <div className="ov on">
      <div className="card">
        <h2>{g.won ? 'The final bell rings. You survived.' : 'You didn’t make it to the bell.'}</h2>
        <p>Identified correctly: {ok} of 8. Here is who was in the room with you.</p>
        <div className="ex">
          {g.students.map((s) => (
            <div key={s.name} style={{ display: 'contents' }}>
              <span>{s.name}</span><b>{s.identity}</b>
              <span>{s.guess ? (s.guess === s.identity ? '✓ you named it' : '✗ you said ' + s.guess) : 'no guess'}</span>
            </div>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 18 }}>What the blackboard told you</p>
        {g.boardLog.map((b, k) => <p key={k} style={{ fontSize: 16, margin: '4px 0' }}>{b.text} <b style={{ color: b.truth === false ? '#d4483a' : '#b89a5a', fontWeight: 400 }}>({b.truth === false ? 'a lie' : 'true'})</b></p>)}
        <button onClick={() => { game.screen = 'menu'; emit() }}>Another night</button>
      </div>
    </div>
  )
}
