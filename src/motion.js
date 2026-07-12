// Preferenza utente per disattivare le animazioni dell'app (separata dal prefers-reduced-motion
// del sistema operativo, che resta comunque rispettato ovunque tramite le stesse regole CSS).
const MOTION_KEY = 'trading-accounts:motion-disabled'

export function isMotionDisabled() {
  return localStorage.getItem(MOTION_KEY) === '1'
}

export function setMotionDisabled(disabled) {
  localStorage.setItem(MOTION_KEY, disabled ? '1' : '0')
}
