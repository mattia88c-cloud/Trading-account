import { useState } from 'react'

// Elenco di nomi di strategie salvate dall'utente (es. "Breakout NY", "Pullback EMA"), condiviso
// tra Journal trade e Registro rapido: si aggiunge una volta con lo StrategyPicker e da lì in poi
// è selezionabile come i voti A-B-C-D, invece di doverla riscrivere ogni volta a mano.
const STORAGE_KEY = 'trading-accounts:strategies'

function readStrategies() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function useStrategies() {
  const [strategies, setStrategies] = useState(readStrategies)

  function addStrategy(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    setStrategies((prev) => {
      if (prev.includes(trimmed)) return prev
      const next = [...prev, trimmed]
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // localStorage non disponibile (es. modalità privata): la lista resta solo in memoria
      }
      return next
    })
  }

  function removeStrategy(name) {
    setStrategies((prev) => {
      const next = prev.filter((s) => s !== name)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // localStorage non disponibile (es. modalità privata): la lista resta solo in memoria
      }
      return next
    })
  }

  return { strategies, addStrategy, removeStrategy }
}
