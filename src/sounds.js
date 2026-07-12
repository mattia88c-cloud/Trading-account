// SFX sintetizzati via Web Audio API (nessun file audio da scaricare/ospitare). Toni brevissimi
// e a basso volume, pensati come feedback discreto, non come colonna sonora.
const MUTE_KEY = 'trading-accounts:sfx-muted'

let ctx = null
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function isSfxMuted() {
  return localStorage.getItem(MUTE_KEY) === '1'
}

export function setSfxMuted(muted) {
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
}

function tone({ freq, duration = 0.09, type = 'sine', gain = 0.05, glideTo }) {
  if (isSfxMuted()) return
  try {
    const audioCtx = getCtx()
    const now = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, now + duration)
    g.gain.setValueAtTime(gain, now)
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    osc.connect(g)
    g.connect(audioCtx.destination)
    osc.start(now)
    osc.stop(now + duration)
  } catch {
    // Web Audio non disponibile in questo browser: nessun sfx, nessun errore visibile.
  }
}

// Cambio sezione (click su un tab della nav principale).
export function playNav() {
  tone({ freq: 480, glideTo: 640, duration: 0.09, type: 'sine', gain: 0.06 })
}

// Salvataggio / conferma positiva (submit di un form, creazione conto, ecc.).
export function playSave() {
  tone({ freq: 520, glideTo: 780, duration: 0.12, type: 'triangle', gain: 0.07 })
}

// Eliminazione / azione distruttiva confermata.
export function playDelete() {
  tone({ freq: 320, glideTo: 180, duration: 0.14, type: 'sine', gain: 0.07 })
}

// Click generico, per tutti gli altri pulsanti dell'app.
export function playClick() {
  tone({ freq: 720, duration: 0.045, type: 'sine', gain: 0.04 })
}
