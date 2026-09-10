import { createContext, useContext, useState } from 'react'

// Interruttore globale "Suggerimenti": quando spento, tutto il sito nasconde i testi di aiuto
// secondari (sottotitoli, hint, note, placeholder di esempio) e lascia solo le etichette e i
// controlli essenziali — persistito così la preferenza resta tra un reload e l'altro. Un Context
// (non solo localStorage) perché il cambio deve riflettersi subito su ogni componente montato in
// quel momento, non solo al prossimo mount.
const HINTS_KEY = 'trading-accounts:hintsEnabled'

function readHintsEnabled() {
  try {
    const raw = localStorage.getItem(HINTS_KEY)
    return raw === null ? true : raw === 'on'
  } catch {
    return true
  }
}

const HintsContext = createContext({ hintsEnabled: true, toggleHints: () => {} })

export function HintsProvider({ children }) {
  const [hintsEnabled, setHintsEnabled] = useState(readHintsEnabled)

  function toggleHints() {
    setHintsEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem(HINTS_KEY, next ? 'on' : 'off')
      } catch {
        // localStorage non disponibile (es. modalità privata): la preferenza resta solo in memoria
      }
      return next
    })
  }

  return (
    <HintsContext.Provider value={{ hintsEnabled, toggleHints }}>
      {children}
    </HintsContext.Provider>
  )
}

export function useHints() {
  return useContext(HintsContext)
}
