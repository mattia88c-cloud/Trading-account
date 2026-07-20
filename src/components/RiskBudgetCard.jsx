import { useState } from 'react'
import { useCollapsed } from '../useCollapsed.js'
import { entrySignature } from '../useTradingData.js'
import CollapseToggle from './CollapseToggle.jsx'
import styles from './RiskBudgetCard.module.css'

const DEFAULTS = { riskPoints: 25, riskPct: 0.5, maxTradesPerDay: 1, marketDays: 250 }

function loadSettings(key) {
  try {
    const raw = localStorage.getItem(`riskBudget:${key}`)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

function saveSettings(key, settings) {
  localStorage.setItem(`riskBudget:${key}`, JSON.stringify(settings))
}

function fmt(n, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('it-IT', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

// Budget di rischio annuale: quanti punti/percentuale di conto la strategia dell'utente
// (rischio per trade x trade max al giorno x giorni di mercato disponibili) permette di
// rischiare in un anno, confrontato con quanto già rischiato/portato a casa nei trade reali
// di quell'anno. I giorni non tradati non consumano budget, quindi restano automaticamente
// nel "rimanente" (budget totale - già rischiato), senza bisogno di un calcolo a parte.
export default function RiskBudgetCard({ entries, initialBalance, storageKey }) {
  const [open, toggle] = useCollapsed(`${storageKey}:riskBudget`)
  const [settings, setSettings] = useState(() => loadSettings(storageKey))

  function update(field, value) {
    const next = { ...settings, [field]: value }
    setSettings(next)
    saveSettings(storageKey, next)
  }

  const year = String(new Date().getFullYear())
  const yearEntries = entries.filter((e) => e.date.startsWith(year) && !e.overtradingDay)

  // Un giorno in copy trading ha un'entry per conto sulla stessa data con contenuto identico
  // (stesso trade replicato): a differenza dei dollari (che vanno sommati su tutti i conti
  // coinvolti, vedi pctEntries sotto), i punti vanno contati una volta sola per trade, altrimenti
  // un giorno in copy su 2 conti raddoppia i punti rischiati/portati a casa. La dedup è per
  // data+contenuto (non sola data): un conto può avere più trade distinti nello stesso giorno,
  // con punti diversi, che vanno contati separatamente.
  const pointsByKey = new Map()
  yearEntries.forEach((e) => {
    const key = `${e.date}|${entrySignature(e)}`
    if (e.riskPoints && !pointsByKey.has(key)) pointsByKey.set(key, e)
  })
  const pointsEntries = [...pointsByKey.values()]
  const pointsRisked = pointsEntries.reduce((sum, e) => sum + e.riskPoints, 0)
  const pointsHome = pointsEntries.reduce((sum, e) => sum + (e.resultPoints || 0), 0)
  const totalBudgetPoints = settings.riskPoints * settings.maxTradesPerDay * settings.marketDays
  const remainingPoints = totalBudgetPoints - pointsRisked

  // Qui invece sommare tutte le entry è corretto: initialRisk/profit sono dollari reali per
  // ogni conto coinvolto nel copy trade, e initialBalance è già il saldo iniziale combinato.
  const pctEntries = yearEntries.filter((e) => e.initialRisk && initialBalance)
  const pctRisked = pctEntries.reduce((sum, e) => sum + (e.initialRisk / initialBalance) * 100, 0)
  const pctHome = pctEntries.reduce((sum, e) => sum + (e.profit / initialBalance) * 100, 0)
  const totalBudgetPct = settings.riskPct * settings.maxTradesPerDay * settings.marketDays
  const remainingPct = totalBudgetPct - pctRisked

  const daysTraded = new Set(yearEntries.map((e) => e.date)).size
  const daysLeft = Math.max(0, settings.marketDays - daysTraded)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span>Budget di rischio annuale {year}</span>
        <CollapseToggle open={open} onToggle={toggle} />
      </div>
      {open && <>
      <p className={styles.subtitle}>In base alla tua strategia: quanto puoi rischiare in un anno e quanto hai già usato nei trade reali</p>

      <div className={styles.settingsRow}>
        <label className={styles.settingField}>
          <span>Rischio/trade (punti)</span>
          <input type="number" value={settings.riskPoints} onChange={(e) => update('riskPoints', Number(e.target.value) || 0)} />
        </label>
        <label className={styles.settingField}>
          <span>Rischio/trade (%)</span>
          <input type="number" step="0.1" value={settings.riskPct} onChange={(e) => update('riskPct', Number(e.target.value) || 0)} />
        </label>
        <label className={styles.settingField}>
          <span>Trade max/giorno</span>
          <input type="number" value={settings.maxTradesPerDay} onChange={(e) => update('maxTradesPerDay', Number(e.target.value) || 0)} />
        </label>
        <label className={styles.settingField}>
          <span>Giorni mercato/anno</span>
          <input type="number" value={settings.marketDays} onChange={(e) => update('marketDays', Number(e.target.value) || 0)} />
        </label>
      </div>

      <div className={styles.resultsGrid}>
        <div className={styles.resultCol}>
          <div className={styles.colTitle}>In punti</div>
          <div className={styles.statRow}><span>Budget totale annuo</span><b>{fmt(totalBudgetPoints)} pt</b></div>
          <div className={styles.statRow}><span>Già rischiati</span><b>{fmt(pointsRisked)} pt</b></div>
          <div className={styles.statRow}><span>Portati a casa</span><b className={pointsHome >= 0 ? styles.positive : styles.negative}>{pointsHome >= 0 ? '+' : ''}{fmt(pointsHome)} pt</b></div>
          <div className={styles.statRowStrong}>
            <span>Rimanenti dal budget iniziale<br /><small>Budget totale − già rischiati</small></span>
            <b className={remainingPoints >= 0 ? styles.positive : styles.negative}>{fmt(remainingPoints)} pt</b>
          </div>
        </div>
        <div className={styles.resultCol}>
          <div className={styles.colTitle}>In % sul conto</div>
          <div className={styles.statRow}><span>Budget totale annuo</span><b>{fmt(totalBudgetPct, 1)}%</b></div>
          <div className={styles.statRow}><span>Già rischiato</span><b>{fmt(pctRisked, 2)}%</b></div>
          <div className={styles.statRow}><span>Portato a casa</span><b className={pctHome >= 0 ? styles.positive : styles.negative}>{pctHome >= 0 ? '+' : ''}{fmt(pctHome, 2)}%</b></div>
          <div className={styles.statRowStrong}>
            <span>Rimanente dal budget iniziale<br /><small>Budget totale − già rischiato</small></span>
            <b className={remainingPct >= 0 ? styles.positive : styles.negative}>{fmt(remainingPct, 2)}%</b>
          </div>
        </div>
      </div>

      <p className={styles.footNote}>{daysTraded} giorni tradati su {settings.marketDays} disponibili nel {year} ({daysLeft} ancora liberi) — i giorni non tradati non consumano budget e restano già inclusi nel "rimanente".</p>
      </>}
    </div>
  )
}
