import { useState } from 'react'
import Card from './Card'
import { useCollapsed } from '../useCollapsed.js'
import { useHints } from '../useHints.jsx'
import CollapseToggle from './CollapseToggle.jsx'
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
  // Il campo appena calcolato dal pulsante "Calcola" (per evidenziarlo in azzurro come risultato,
  // finché non lo si modifica di nuovo a mano).
  const [lastComputed, setLastComputed] = useState(null)
  const { hintsEnabled } = useHints()
  const [calcOpen, toggleCalc] = useCollapsed(`calculator:${market}:calc`)
  const [tableOpen, toggleTable] = useCollapsed(`calculator:${market}:table`)

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
    setLastComputed(null)
  }

  function handleFieldChange(field, val) {
    const setters = { risk: setRisk, micro: setMicro, sl: setSl }
    setters[field](val)
    if (lastComputed === field) setLastComputed(null)
  }

  // Tutti e 3 i campi sono intercambiabili: lascia esattamente 1 campo vuoto (gli altri 2
  // compilati) e premi "Calcola" per riempirlo — non serve più decidere in anticipo quale
  // sia l'input e quale il risultato.
  function handleCalculate() {
    const r = parseFloat(risk)
    const m = parseFloat(micro)
    const s = parseFloat(sl)
    const filled = [risk !== '' && r > 0, micro !== '' && m > 0, sl !== '' && s > 0]
    const filledCount = filled.filter(Boolean).length
    if (filledCount !== 2) return
    if (!filled[2] && r > 0 && m > 0) {
      setSl((r / (m * ppp)).toFixed(1))
      setLastComputed('sl')
    } else if (!filled[1] && r > 0 && s > 0) {
      setMicro((r / (ppp * s)).toFixed(1))
      setLastComputed('micro')
    } else if (!filled[0] && m > 0 && s > 0) {
      setRisk((m * ppp * s).toFixed(2))
      setLastComputed('risk')
    }
  }

  function applyPreset(preset) {
    setMicro(String(preset.micro))
    setPpp(preset.ppp)
    setLastComputed(null)
    const r = parseFloat(risk)
    const s = parseFloat(sl)
    if (r > 0 && !(s > 0)) {
      setSl((r / (preset.micro * preset.ppp)).toFixed(1))
      setLastComputed('sl')
    } else if (s > 0 && !(r > 0)) {
      setRisk((preset.micro * preset.ppp * s).toFixed(2))
      setLastComputed('risk')
    }
  }

  const canCalculate = [risk !== '' && parseFloat(risk) > 0, micro !== '' && parseFloat(micro) > 0, sl !== '' && parseFloat(sl) > 0]
    .filter(Boolean).length === 2

  return (
    <>
      <Card className={styles.calcCard}>
        {logo ? (
          <img src={logo} alt="" className={styles.marketLogo} />
        ) : (
          <span className={styles.marketBadge}>{market}</span>
        )}
        <div className={styles.cardHeaderRow}>
          <div className={styles.title}>Position Size Calculator — {market}</div>
          <CollapseToggle open={calcOpen} onToggle={toggleCalc} />
        </div>

        {calcOpen && (
          <>
            {hintsEnabled && <p className={styles.subtitle}>Inserisci 2 valori qualsiasi e premi "Calcola" per il terzo</p>}

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
              {hintsEnabled && <span className={styles.pppHint}>{mode.pppHint}</span>}
            </div>

            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Risk $</label>
                <input
                  type="number"
                  className={`${styles.fieldInput} ${lastComputed === 'risk' ? styles.fieldOutput : ''}`}
                  placeholder={hintsEnabled ? 'es. 250' : ''}
                  value={risk}
                  onChange={e => handleFieldChange('risk', e.target.value)}
                />
                <span className={styles.fieldUnit}>USD</span>
              </div>

              <div className={styles.fieldSep}>÷</div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>{mode.unitLabel}</label>
                <input
                  type="number"
                  className={`${styles.fieldInput} ${lastComputed === 'micro' ? styles.fieldOutput : ''}`}
                  placeholder={hintsEnabled ? 'es. 5' : ''}
                  value={micro}
                  onChange={e => handleFieldChange('micro', e.target.value)}
                />
                <span className={styles.fieldUnit}>{mode.unitShort}</span>
              </div>

              <div className={styles.fieldSep}>=</div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>SL Points</label>
                <input
                  type="number"
                  className={`${styles.fieldInput} ${lastComputed === 'sl' ? styles.fieldOutput : ''}`}
                  placeholder={hintsEnabled ? 'es. 25' : ''}
                  value={sl}
                  onChange={e => handleFieldChange('sl', e.target.value)}
                />
                <span className={styles.fieldUnit}>punti</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.calcBtn}
              onClick={handleCalculate}
              disabled={!canCalculate}
            >
              Calcola
            </button>

            {hintsEnabled && (
              <div className={styles.formula}>
                <span className={styles.formulaText}>
                  Formula: <code>SL punti = Risk $ ÷ ({mode.tableUnitLabel} × ${ppp}/punto)</code>
                </span>
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <div className={styles.tableTitleRow}>
          <div className={styles.tableTitle}>{mode.tableTitle}</div>
          {hintsEnabled && mode.tickInfo && <span className={styles.tickInfo}>{mode.tickInfo}</span>}
          <CollapseToggle open={tableOpen} onToggle={toggleTable} />
        </div>
        {tableOpen && (
          <>
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
              {hintsEnabled && (
                <div className={styles.sideNote}>
                  <b>Promemoria formula</b>
                  SL punti = Risk $ ÷ ({mode.tableUnitLabel} × ${ppp}/punto)
                </div>
              )}
            </div>
            {hintsEnabled && (
              <p className={styles.tableNote}>Clicca su una riga per usare quel valore di {mode.tableUnitLabel.toLowerCase()} nel calcolatore</p>
            )}
          </>
        )}
      </Card>
    </>
  )
}
