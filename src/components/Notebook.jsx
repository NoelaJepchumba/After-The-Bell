import { useState } from 'react'
import { useGame, toggleBook } from '../systems/GameState.js'
import StudentProfile from './StudentProfile.jsx'

export default function Notebook() {
  const g = useGame()
  const [i, setI] = useState(-1)
  return (
    <div className="ov on" id="book">
      <div className="pad">
        <ul>
          <li><button className={i === -1 ? 'sel' : ''} onClick={() => setI(-1)}>Blackboard<small>{g.boardLog.length} messages</small></button></li>
          {g.students.map((s, k) => (
            <li key={s.name}>
              <button className={k === i ? 'sel' : ''} onClick={() => setI(k)}>
                {s.name}<small>{s.status}{s.guess ? ' · ' + s.guess : ''}</small>
              </button>
            </li>
          ))}
        </ul>
        {i === -1 ? (
          <div className="pf">
            <h3>The blackboard</h3>
            <p className="small">Everything it has written. It knows things you don’t. Don’t trust it blindly.</p>
            <ol>{g.boardLog.length ? g.boardLog.map((b, k) => <li key={k}>After bell {b.bell}: {b.text}</li>) : <li className="empty">Nothing yet.</li>}</ol>
            <button onClick={() => toggleBook(false)}>Close notebook</button>
          </div>
        ) : <StudentProfile s={g.students[i]} onClose={() => toggleBook(false)} />}
      </div>
    </div>
  )
}
