import { useState } from 'react'
import Card from './Card'
import styles from './CalculatorTab.module.css'

// Un blocco calcolatore + tabella di riferimento per un singolo mercato (NAS100, XAUUSD, ...).
// `presets` è una lista esplicita di { micro, ppp } invece di un solo moltiplicatore, così ogni
// mercato può avere una tabella non lineare senza cambiare la formula del calcolatore.
//
// `unitModes` (opzionale) permette più "tagli" dello stesso mercato con unità diverse (es. NAS100
// in micro/mini contract futures oppure in lotti CFD): un selezionatore passa dall'uno all'altro,
// ricalcolando ppp/etichette/tabella senza dover duplicare l'intero componente. Se non passato,
// il componente si comporta come prima con un solo modo costruito dalle prop dirette.
export default function MarketCalculator({
  market, logo, defaultPpp, pppHint, tableTitle, tickInfo, presets,
  title, unitLabel = 'Micro Contracts', unitShort = 'contracts', tableUnitLabel = 'Micro',
  unitModes,
}) {
  const modes = unitModes || [{
    key: 'default', label: title || market, defaultPpp, pppHint, tableTitle, tickInfo, presets, unitLabel, unitShort, tableUnitLabel,
  }]
  const [modeKey, setModeKey] = useState(modes[0].key)
  const mode = modes.find((m) => m.key === modeKey) || modes[0]

  const [ppp, setPpp] = useState(mode.defaultPpp)
  const [risk, setRisk] = useState('')
  const [micro, setMicro] = useState('')
  const [sl, setSl] = useState('')

  function selectMode(key) {
    const next = modes.find((m) => m.key === key)
    if (!next) return
    setModeKey(key)
    setPpp(next.defaultPpp)
    // Un numero di "5" non significa la stessa cosa in micro contract e in lotti: cambiando
    // unità si azzerano i campi invece di reinterpretare un valore che avrebbe un altro ordine
    // di grandezza, per non far leggere un risultato calcolato sull'unità sbagliata.
    setMicro('')
    setSl('')
  }

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

        {modes.length > 1 && (
          <div className={styles.modeToggle}>
            {modes.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`${styles.modeBtn} ${m.key === modeKey ? styles.modeBtnActive : ''}`}
                onClick={() => selectMode(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className={styles.pppRow}>
          <label className={styles.pppLabel}>
            $ per punto
            <input
              type="number"
              className={styles.pppInput}
              value={ppp}
              onChange={e => setPpp(parseFloat(e.target.value) || mode.defaultPpp)}
            />
          </label>
          <span className={styles.pppHint}>{mode.pppHint}</span>
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
            <label className={styles.fieldLabel}>{mode.unitLabel}</label>
            <input
              type="number"
              className={styles.fieldInput}
              placeholder="es. 5"
              value={micro}
              onChange={e => compute('micro', e.target.value)}
              onKeyDown={e => handleKey(e, 'sl')}
              onBlur={() => recalcAll('sl')}
            />
            <span className={styles.fieldUnit}>{mode.unitShort}</span>
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
            Formula: <code>SL punti = Risk $ ÷ ({mode.tableUnitLabel} × ${ppp}/punto)</code>
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
          <div className={styles.tableTitle}>{mode.tableTitle}</div>
          {mode.tickInfo && <span className={styles.tickInfo}>{mode.tickInfo}</span>}
        </div>
        <div className={styles.tableCardBody}>
          <div className={styles.tableFrame}>
            <table className={styles.refTable}>
              <thead>
                <tr>
                  <th>{mode.tableUnitLabel}</th>
                  <th>$ per punto</th>
                </tr>
              </thead>
              <tbody>
                {mode.presets.map(preset => {
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
          </div>
          <div className={styles.sideNote}>
            <b>Promemoria formula</b>
            SL punti = Risk $ ÷ ({mode.tableUnitLabel} × ${ppp}/punto)
          </div>
        </div>
        <p className={styles.tableNote}>Clicca su una riga per usare quel valore di {mode.tableUnitLabel.toLowerCase()} nel calcolatore</p>
      </Card>
    </>
  )
}
