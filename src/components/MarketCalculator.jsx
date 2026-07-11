import { useState } from 'react'
import Card from './Card'
import styles from './CalculatorTab.module.css'

// Un blocco calcolatore + tabella di riferimento per un singolo mercato (NAS100, XAUUSD, ...).
// `presets` è una lista esplicita di { micro, ppp } invece di un solo moltiplicatore, così ogni
// mercato può avere una tabella non lineare senza cambiare la formula del calcolatore.
export default function MarketCalculator({ market, logo, defaultPpp, pppHint, tableTitle, tickInfo, presets }) {
  const [ppp, setPpp] = useState(defaultPpp)
  const [risk, setRisk] = useState('')
  const [micro, setMicro] = useState('')
  const [sl, setSl] = useState('')

  function compute(field, val) {
    const r = field === 'risk' ? parseFloat(val) : parseFloat(risk)
    const m = field === 'micro' ? parseFloat(val) : parseFloat(micro)
    const s = field === 'sl' ? parseFloat(val) : parseFloat(sl)

    if (field === 'risk') {
      setRisk(val)
      if (m > 0 && s > 0) { }
      else if (m > 0 && !(s > 0) && r > 0) setSl((r / (m * ppp)).toFixed(1))
      else if (!(m > 0) && s > 0 && r > 0) setMicro((r / (ppp * s)).toFixed(1))
    } else if (field === 'micro') {
      setMicro(val)
      if (r > 0 && s > 0) { }
      else if (r > 0 && !(s > 0) && m > 0) setSl((r / (m * ppp)).toFixed(1))
      else if (!(r > 0) && s > 0 && m > 0) setRisk((m * ppp * s).toFixed(2))
    } else {
      setSl(val)
      if (r > 0 && m > 0) { }
      else if (r > 0 && !(m > 0) && s > 0) setMicro((r / (ppp * s)).toFixed(1))
      else if (!(r > 0) && m > 0 && s > 0) setRisk((m * ppp * s).toFixed(2))
    }
  }

  function recalcAll(field) {
    const r = parseFloat(risk)
    const m = parseFloat(micro)
    const s = parseFloat(sl)
    if (field === 'sl' || (!sl && r > 0 && m > 0)) {
      if (r > 0 && m > 0) setSl((r / (m * ppp)).toFixed(1))
    } else if (field === 'micro' || (!micro && r > 0 && s > 0)) {
      if (r > 0 && s > 0) setMicro((r / (ppp * s)).toFixed(1))
    } else if (field === 'risk' || (!risk && m > 0 && s > 0)) {
      if (m > 0 && s > 0) setRisk((m * ppp * s).toFixed(2))
    }
  }

  function handleKey(e, field) {
    if (e.key === 'Enter' || e.key === 'Tab') recalcAll(field)
  }

  function applyPreset(preset) {
    setMicro(String(preset.micro))
    setPpp(preset.ppp)
    const r = parseFloat(risk)
    if (r > 0) setSl((r / (preset.micro * preset.ppp)).toFixed(1))
  }

  const calculatedSl = parseFloat(risk) > 0 && parseFloat(micro) > 0
    ? parseFloat(risk) / (parseFloat(micro) * ppp)
    : null

  return (
    <>
      <Card className={styles.calcCard}>
        {logo ? (
          <img src={logo} alt="" className={styles.marketLogo} />
        ) : (
          <span className={styles.marketBadge}>{market}</span>
        )}
        <div className={styles.title}>Position Size Calculator — {market}</div>
        <p className={styles.subtitle}>Inserisci 2 valori, premi Enter per calcolare il terzo</p>

        <div className={styles.pppRow}>
          <label className={styles.pppLabel}>
            $ per punto
            <input
              type="number"
              className={styles.pppInput}
              value={ppp}
              onChange={e => setPpp(parseFloat(e.target.value) || defaultPpp)}
            />
          </label>
          <span className={styles.pppHint}>{pppHint}</span>
        </div>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Risk $</label>
            <input
              type="number"
              className={styles.fieldInput}
              placeholder="es. 250"
              value={risk}
              onChange={e => compute('risk', e.target.value)}
              onKeyDown={e => handleKey(e, 'sl')}
              onBlur={() => recalcAll('sl')}
            />
            <span className={styles.fieldUnit}>USD</span>
          </div>

          <div className={styles.fieldSep}>÷</div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Micro Contracts</label>
            <input
              type="number"
              className={styles.fieldInput}
              placeholder="es. 5"
              value={micro}
              onChange={e => compute('micro', e.target.value)}
              onKeyDown={e => handleKey(e, 'sl')}
              onBlur={() => recalcAll('sl')}
            />
            <span className={styles.fieldUnit}>contracts</span>
          </div>

          <div className={styles.fieldSep}>=</div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>SL Points</label>
            <input
              type="number"
              className={`${styles.fieldInput} ${calculatedSl ? styles.fieldOutput : ''}`}
              placeholder="es. 25"
              value={sl}
              onChange={e => compute('sl', e.target.value)}
              onKeyDown={e => handleKey(e, 'risk')}
              onBlur={() => recalcAll('risk')}
            />
            <span className={styles.fieldUnit}>punti</span>
          </div>
        </div>

        <div className={styles.formula}>
          <span className={styles.formulaText}>
            Formula: <code>SL punti = Risk $ ÷ (Micro × ${ppp}/punto)</code>
          </span>
        </div>

        {calculatedSl && (
          <div className={styles.result}>
            <span className={styles.resultLabel}>SL calcolato:</span>
            <span className={styles.resultVal}>{calculatedSl.toFixed(1)} punti</span>
          </div>
        )}
      </Card>

      <Card>
        <div className={styles.tableTitleRow}>
          <div className={styles.tableTitle}>{tableTitle}</div>
          {tickInfo && <span className={styles.tickInfo}>{tickInfo}</span>}
        </div>
        <table className={styles.refTable}>
          <thead>
            <tr>
              <th>Micro</th>
              <th>$ per punto</th>
            </tr>
          </thead>
          <tbody>
            {presets.map(preset => {
              const isActive = parseFloat(micro) === preset.micro && ppp === preset.ppp
              return (
                <tr
                  key={preset.micro}
                  className={`${styles.refRow} ${isActive ? styles.refRowActive : ''}`}
                  onClick={() => applyPreset(preset)}
                >
                  <td>{preset.micro}</td>
                  <td>${preset.ppp}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className={styles.tableNote}>Clicca su una riga per usare quel numero di micro nel calcolatore</p>
      </Card>
    </>
  )
}
