import { startGame } from '../systems/GameState.js'

export default function MainMenu() {
  return (
    <div className="ov on">
      <div className="card">
        <h1>After the Bell</h1>
        <p className="sub">A night class. Eight students. None of them are what they seem.</p>
        <p>You take the empty seat. Everything is normal, until the bell rings. Each bell takes the lights, and the blackboard writes something new. It may be true. It may be a lie.</p>
        <p>Watch your classmates, collect clues, and name what each one really is. Be right and they are exposed, but being right does not make you safe.</p>
        <p><kbd>WASD</kbd> walk &nbsp; <kbd>Mouse</kbd> look (click to capture, or drag) &nbsp; <kbd>N</kbd> notebook</p>
        <button onClick={() => startGame(1200)}>Begin the night (20 min)</button>
        <button onClick={() => startGame(300)}>Short night (5 min)</button>
      </div>
    </div>
  )
}
