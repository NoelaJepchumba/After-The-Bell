// Tiny WebAudio helpers.
// No external sound files required.
// Real audio files can be added to public/sounds later.

let AC
let drone
let masterGain

// ------------------------------------
// AUDIO INITIALIZATION
// ------------------------------------

export const initAudio = () => {
  try {
    if (!AC) {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext

      AC = new AudioContext()

      masterGain = AC.createGain()
      masterGain.gain.value = 0.7
      masterGain.connect(AC.destination)
    }

    if (AC.state === 'suspended') {
      AC.resume()
    }
  } catch (e) {
    console.warn('Audio could not be initialized.')
  }
}

// ------------------------------------
// TONE GENERATOR
// ------------------------------------

function tone(
  frequency,
  duration,
  volume = 0.1,
  type = 'sine',
  delay = 0
) {
  if (!AC || !masterGain) return

  try {
    const oscillator = AC.createOscillator()
    const gain = AC.createGain()
    const start = AC.currentTime + delay

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(
      Math.max(volume, 0.0001),
      start + 0.02
    )
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + duration
    )

    oscillator.connect(gain)
    gain.connect(masterGain)

    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
  } catch (e) {
    // Ignore unsupported audio operations.
  }
}

// ------------------------------------
// NOISE GENERATOR
// ------------------------------------

function noise(duration = 0.5, volume = 0.1) {
  if (!AC || !masterGain) return

  try {
    const buffer = AC.createBuffer(
      1,
      Math.floor(AC.sampleRate * duration),
      AC.sampleRate
    )

    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const fade = 1 - i / data.length
      data[i] = (Math.random() * 2 - 1) * fade
    }

    const source = AC.createBufferSource()
    const gain = AC.createGain()

    source.buffer = buffer
    gain.gain.value = volume

    source.connect(gain)
    gain.connect(masterGain)

    source.start()
  } catch (e) {
    // Ignore unsupported audio operations.
  }
}

// ------------------------------------
// BACKGROUND DRONE
// ------------------------------------

export const startDrone = () => {
  if (!AC || !masterGain || drone) return

  try {
    drone = [55, 58.3].map(frequency => {
      const oscillator = AC.createOscillator()
      const gain = AC.createGain()

      oscillator.type = 'sawtooth'
      oscillator.frequency.value = frequency
      gain.gain.value = 0.012

      oscillator.connect(gain)
      gain.connect(masterGain)

      oscillator.start()

      return oscillator
    })
  } catch (e) {
    drone = null
  }
}

// ------------------------------------
// STOP BACKGROUND DRONE
// ------------------------------------

export const stopDrone = () => {
  if (!drone) return

  drone.forEach(oscillator => {
    try {
      oscillator.stop()
    } catch (e) {
      // Already stopped.
    }
  })

  drone = null
}

// ------------------------------------
// SOUND EFFECTS
// ------------------------------------

export const sfx = {

  // Heavy impact during blackouts.
  thud() {
    tone(45, 0.8, 0.4, 'sine')
    tone(90, 0.3, 0.15, 'square')
    noise(0.25, 0.12)
  },

  // Repeated supernatural bell.
  bell() {
    for (let i = 0; i < 4; i++) {
      tone(523, 2.2, 0.18, 'sine', i * 1.4)
      tone(1046, 1.4, 0.06, 'sine', i * 1.4)
    }
  },

  // First classroom bell.
  bellOne() {
    tone(523, 3, 0.25)
    tone(1046, 2, 0.08)
    tone(392, 3, 0.15)
  },

  // Uncomfortable supernatural atmosphere.
  strange() {
    tone(180, 2.5, 0.12, 'sawtooth')
    tone(185.5, 2.5, 0.12, 'sawtooth')
    tone(60, 3, 0.2)
    noise(1.2, 0.08)
  },

  // Sudden reality glitch.
  glitch() {
    noise(0.4, 0.1)
    tone(2000, 0.15, 0.05, 'square')
    tone(350, 0.3, 0.08, 'sawtooth')
  },

  // A strangely cheerful melody.
  melody() {
    const notes = [392, 440, 523, 440, 349, 392]

    notes.forEach((frequency, index) => {
      tone(frequency, 0.8, 0.12, 'sine', index * 0.45)
    })
  },

  // Player takes damage.
  hit() {
    tone(70, 0.4, 0.3, 'sawtooth')
    tone(38, 0.6, 0.2, 'sine')
  },

  // Notebook and interface click.
  click() {
    tone(900, 0.05, 0.04, 'square')
  },

  // Distant whisper-like noise.
  whisper() {
    noise(1.5, 0.035)
    tone(260, 1.2, 0.025, 'sine')
    tone(270, 1.4, 0.02, 'sine', 0.4)
  },

  // Something moves behind the player.
  footsteps() {
    tone(65, 0.16, 0.12, 'sine')
    tone(55, 0.16, 0.12, 'sine', 0.35)
  },

  // A sudden frightening appearance.
  jumpscare() {
    noise(0.7, 0.35)
    tone(85, 0.8, 0.4, 'sawtooth')
    tone(900, 0.3, 0.15, 'square')
  }
}
