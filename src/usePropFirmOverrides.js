import { useEffect, useState } from 'react'

const OVERRIDES_KEY = 'trading-accounts:prop-firm-price-overrides'

function load() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Overrides sono tenuti per offerId: { mode: 'discount' | 'manual', discountPercent, manualPrice }.
// Il listino nei dati statici non cambia mai da solo: è l'utente a tenerlo aggiornato qui,
// perché le promo delle prop firm cambiano troppo spesso per valere la pena tracciarle nel codice.
export function usePropFirmOverrides() {
  const [overrides, setOverrides] = useState(load)

  useEffect(() => {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
  }, [overrides])

  function setDiscountPercent(offerId, value) {
    setOverrides((prev) => ({ ...prev, [offerId]: { ...prev[offerId], mode: 'discount', discountPercent: value } }))
  }

  function setManualPrice(offerId, value) {
    setOverrides((prev) => ({ ...prev, [offerId]: { ...prev[offerId], mode: 'manual', manualPrice: value } }))
  }

  function clearOverride(offerId) {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[offerId]
      return next
    })
  }

  return { overrides, setDiscountPercent, setManualPrice, clearOverride }
}
