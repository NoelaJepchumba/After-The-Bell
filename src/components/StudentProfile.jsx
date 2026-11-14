import { emit } from '../systems/GameState.js'
import { IDENTITIES, accuse } from '../systems/IdentitySystem.js'
import { lookDescription } from '../systems/RelationshipSystem.js'

export default function StudentProfile({ s, onClose }) {
  const locked = s.hostile || s.status === 'Confirmed'
  const setGuess = (v) => {
    s.guess = v
    if (s.status === 'Unknown' && v) s.status = 'Suspected'
    if (!v && s.status === 'Suspected') s.status = 'Unknown'
    emit()
  }
  return (
    <div className="pf">
      <h3>{s.name}</h3>
      <p className="meta">Seat {s.seat + 1}{s.seat !== s.firstSeat ? ` (first seen in seat ${s.firstSeat + 1})` : ''} · Status: {s.status}{s.status === 'Confirmed' ? ' · ' + s.identity : ''}</p>
      <b>Observed behaviour</b>
      <p className="small">{lookDescription(s)}</p>
      <b>Clues</b>
      <ol>
        {s.clues.length ? s.clues.map((c) => <li key={c}>{c}</li>) : <li className="empty">Nothing yet. Watch {s.name} for a few seconds.</li>}
      </ol>
      <b>Suspected identity</b><br />
      <select value={s.guess} disabled={locked} onChange={(e) => setGuess(e.target.value)}>
        <option value="">Unknown</option>
        {IDENTITIES.map((x) => <option key={x}>{x}</option>)}
      </select>{' '}
      <button disabled={!s.guess || locked} onClick={() => accuse(s)}>Accuse</button>{' '}
      <button onClick={onClose}>Close notebook</button>
    </div>
  )
}
