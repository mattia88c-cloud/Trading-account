import { useState } from 'react'

// Stato aperto/chiuso di un box, persistito in locale per chiave: ogni box (identificato da
// una stringa stabile, es. "summary:winners") ricorda la propria preferenza tra un reload e
// l'altro. Default aperto se l'utente non ha mai toccato quel box.
export function useCollapsed(key, defaultOpen = true) {
  const [open, setOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(`analyticsBox:${key}`)
      return raw === null ? defaultOpen : raw === 'open'
    } catch {
      return defaultOpen
    }
  })

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(`analyticsBox:${key}`, next ? 'open' : 'closed')
      } catch {
        // localStorage non disponibile (es. modalità privata): lo stato resta solo in memoria
      }
      return next
    })
  }

  return [open, toggle]
}
