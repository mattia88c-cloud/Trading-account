import { useState } from 'react'
import Card from './Card'
import { useHints } from '../useHints.jsx'
import styles from './ConsistencyCalculator.module.css'

let nextId = 1

function emptyRow() {
  return { id: nextId++, profit: '' }
}

// Consistency rule delle prop firm: nessuna singola giornata dovrebbe pesare più di una certa %
// sul profitto TOTALE DEL PERIODO (varia da firm a firm — l'utente inserisce la propria soglia,
// il sito non la conosce a priori), altrimenti il payout/passaggio di fase rischia di essere
// rifiutato perché il risultato sembra un colpo di fortuna isolato invece di una performance
// ripetibile. Il totale è NETTO (somma di tutte le giornate, comprese le perdite): escludere le
// perdite dal totale renderebbe la regola più facile da rispettare quanto più si perde, che è
// l'opposto della realtà — le perdite riducono il totale e quindi fanno pesare di più (in %)
// qualsiasi giornata vincente.
export default function ConsistencyCalculator() {
  const { hintsEnabled } = useHints()
  const [rows, setRows] = useState([emptyRow(), emptyRow()])
  const [threshold, setThreshold] = useState('')
  const [result, setResult] = useState(null)

  function updateRow(id, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, profit: value } : r)))
    setResult(null)
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    setResult(null)
  }

  function handleCalculate() {
    const thresholdNum = parseFloat(threshold)
    if (!(thresholdNum > 0)) {
      setResult({ error: 'Inserisci la consistency rule della tua prop firm (es. 30 per "max 30% in un giorno").' })
      return
    }

    const allDays = rows
      .map((r, i) => ({ label: `Giorno ${i + 1}`, profit: parseFloat(r.profit) }))
      .filter((r) => Number.isFinite(r.profit) && r.profit !== 0)

    const positiveDays = allDays.filter((r) => r.profit > 0)

    if (positiveDays.length === 0) {
      setResult({ error: 'Inserisci almeno una giornata in profitto.' })
      return
    }

    // Netto: somma di TUTTE le giornate inserite, comprese le perdite — è il profitto del
    // periodo su cui la prop firm valuta la regola, non solo la somma dei giorni vincenti.
    const total = allDays.reduce((sum, r) => sum + r.profit, 0)

    if (total <= 0) {
      setResult({ error: 'Il totale netto del periodo (comprese le perdite) non è positivo: la consistency rule non si può valutare finché il periodo non è in profitto.' })
      return
    }

    const withPct = positiveDays
      .map((r) => ({ ...r, pct: (r.profit / total) * 100 }))
      .sort((a, b) => b.pct - a.pct)
    const worst = withPct[0]
    const overThreshold = worst.pct > thresholdNum

    setResult({ total, breakdown: withPct, worst, overThreshold, thresholdNum })
  }

  return (
    <Card className={styles.card}>
      <div className={styles.title}>Consistency Rule Calculator</div>
      {hintsEnabled && (
        <p className={styles.subtitle}>
          Aggiungi tutte le giornate del periodo (anche quelle in perdita) e scopri quanto pesa la
          migliore sul profitto netto totale — la maggior parte delle prop firm richiede che nessun
          singolo giorno superi una certa % del profitto complessivo del periodo.
        </p>
      )}

      <div className={styles.thresholdRow}>
        <label className={styles.thresholdLabel}>
          Consistency rule della tua firm
          <input
            type="number"
            className={styles.thresholdInput}
            min="1"
            max="100"
            placeholder={hintsEnabled ? 'es. 30' : ''}
            value={threshold}
            onChange={(e) => { setThreshold(e.target.value); setResult(null) }}
          />
          <span>%</span>
        </label>
        {hintsEnabled && (
          <span className={styles.thresholdHint}>Il sito non la conosce: controlla le regole della tua prop firm e scrivila qui</span>
        )}
      </div>

      <div className={styles.rows}>
        {rows.map((row, i) => (
          <div key={row.id} className={styles.row}>
            <span className={styles.rowLabel}>Giorno {i + 1}</span>
            <input
              type="number"
              className={styles.profitInput}
              placeholder={hintsEnabled ? 'Profitto ($)' : ''}
              value={row.profit}
              onChange={(e) => updateRow(row.id, e.target.value)}
            />
            <button
              type="button"
              className={styles.removeRowBtn}
              onClick={() => removeRow(row.id)}
              disabled={rows.length <= 1}
              aria-label="Rimuovi giornata"
              title="Rimuovi giornata"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button type="button" className={styles.addRowBtn} onClick={addRow}>+ Aggiungi giornata</button>

      <button type="button" className={styles.calcBtn} onClick={handleCalculate}>Calcola</button>

      {result?.error && <p className={styles.error}>{result.error}</p>}

      {result && !result.error && (
        <>
          <div className={`${styles.resultBox} ${result.overThreshold ? styles.resultBad : styles.resultGood}`}>
            <div className={styles.resultHeadline}>
              {result.overThreshold ? '⚠ Consistency rule NON rispettata' : '✓ Consistency rule rispettata'}
            </div>
            <div className={styles.resultLine}>
              Giornata più pesante: <b>{result.worst.label}</b> — {result.worst.pct.toFixed(1)}% del profitto totale
              (soglia {result.thresholdNum}%)
            </div>
            <div className={styles.resultLine}>
              Profitto netto del periodo (comprese le perdite): ${result.total.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className={styles.breakdown}>
            {result.breakdown.map((r) => (
              <div key={r.label} className={styles.breakdownRow}>
                <span className={styles.breakdownDate}>{r.label}</span>
                <div className={styles.breakdownTrack}>
                  <div
                    className={r.pct > result.thresholdNum ? styles.breakdownFillBad : styles.breakdownFillGood}
                    style={{ width: `${Math.min(r.pct, 100)}%` }}
                  />
                </div>
                <span className={styles.breakdownPct}>{r.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
