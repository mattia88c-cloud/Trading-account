import { useState } from 'react'
import { MARKETS, SESSIONS, CLOSE_TYPES, OUTCOMES, GRADES, GRADE_LEGEND, EMOTIONAL_STATES } from '../useTradingData'
import styles from './DayEntryForm.module.css'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function DayEntryForm({ accounts, onSave, initialEntry, accountName, onClose }) {
  const isEdit = Boolean(initialEntry)
  const [date, setDate] = useState(initialEntry?.date || today())
  const [selectedIds, setSelectedIds] = useState(initialEntry ? [initialEntry.accountId] : [])
  const [market, setMarket] = useState(initialEntry?.market || MARKETS[0])
  const [hasNews, setHasNews] = useState(initialEntry?.hasNews || false)
  const [openSession, setOpenSession] = useState(initialEntry?.openSession || SESSIONS[0])
  const [closeSession, setCloseSession] = useState(initialEntry?.closeSession || SESSIONS[0])
  const [entryTime, setEntryTime] = useState(initialEntry?.entryTime || '')
  const [exitTime, setExitTime] = useState(initialEntry?.exitTime || '')
  const [profit, setProfit] = useState(initialEntry?.profit ?? '')
  const [tradesOpened, setTradesOpened] = useState(initialEntry?.tradesOpened ?? '')
  const [tradesEffective, setTradesEffective] = useState(initialEntry?.tradesEffective ?? '')
  const [side, setSide] = useState(initialEntry?.side || 'misto')
  const [initialSizeMicro, setInitialSizeMicro] = useState(initialEntry?.initialSizeMicro ?? '')
  const [finalSizeMicro, setFinalSizeMicro] = useState(initialEntry?.finalSizeMicro ?? '')
  const [initialRisk, setInitialRisk] = useState(initialEntry?.initialRisk ?? '')
  const [finalRisk, setFinalRisk] = useState(initialEntry?.finalRisk ?? '')
  const [reEntry, setReEntry] = useState(initialEntry?.reEntry || false)
  const [followedStrategy, setFollowedStrategy] = useState(initialEntry?.followedStrategy ?? true)
  const [riskPoints, setRiskPoints] = useState(initialEntry?.riskPoints ?? '')
  const [resultPoints, setResultPoints] = useState(initialEntry?.resultPoints ?? '')
  const [riskReward, setRiskReward] = useState(initialEntry?.riskReward ?? '')
  const [outcome, setOutcome] = useState(initialEntry?.outcome || '')
  const [closeType, setCloseType] = useState(initialEntry?.closeType || '')
  const [grade, setGrade] = useState(initialEntry?.grade || '')
  const [emotionalState, setEmotionalState] = useState(initialEntry?.emotionalState || '')
  const [confidenceLevel, setConfidenceLevel] = useState(initialEntry?.confidenceLevel ?? 5)
  const [mistake, setMistake] = useState(initialEntry?.mistake || '')
  const [whatWentWell, setWhatWentWell] = useState(initialEntry?.whatWentWell || '')
  const [lesson, setLesson] = useState(initialEntry?.lesson || '')
  const [tags, setTags] = useState((initialEntry?.tags || []).join(', '))
  const [chartUrl, setChartUrl] = useState(initialEntry?.chartUrl || '')

  function toggleAccount(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (selectedIds.length === 0 || profit === '') return
    await onSave({
      date,
      accountIds: selectedIds,
      market,
      hasNews,
      openSession,
      closeSession,
      entryTime,
      exitTime,
      profit,
      tradesOpened,
      tradesEffective,
      side,
      initialSizeMicro,
      finalSizeMicro,
      initialRisk,
      finalRisk,
      riskPoints,
      resultPoints,
      reEntry,
      followedStrategy,
      riskReward,
      outcome,
      closeType,
      grade,
      emotionalState,
      confidenceLevel,
      mistake,
      whatWentWell,
      lesson,
      tags,
      chartUrl,
    })

    if (isEdit) {
      onClose?.()
      return
    }

    setProfit('')
    setTradesOpened('')
    setTradesEffective('')
    setInitialSizeMicro('')
    setFinalSizeMicro('')
    setInitialRisk('')
    setFinalRisk('')
    setRiskPoints('')
    setResultPoints('')
    setReEntry(false)
    setHasNews(false)
    setEntryTime('')
    setExitTime('')
    setFollowedStrategy(true)
    setRiskReward('')
    setOutcome('')
    setCloseType('')
    setGrade('')
    setEmotionalState('')
    setConfidenceLevel(5)
    setMistake('')
    setWhatWentWell('')
    setLesson('')
    setTags('')
    setChartUrl('')
    setSelectedIds([])
  }

  if (accounts.length === 0) {
    return <p className={styles.empty}>Crea prima almeno un conto per registrare una giornata.</p>
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {isEdit ? (
        <div className={styles.editHeader}>
          <h3 className={styles.title}>Modifica giornata</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Annulla e torna indietro">✕</button>
        </div>
      ) : (
        <h3 className={styles.title}>Journal trade</h3>
      )}

      <label className={styles.label}>Data</label>
      <input
        className={styles.input}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {isEdit ? (
        <>
          <label className={styles.label}>Conto</label>
          <p className={styles.staticValue}>{accountName || '—'}</p>
        </>
      ) : (
        <>
          <label className={styles.label}>Conto/i (seleziona uno o più per copy trading)</label>
          <div className={styles.accountList}>
            {accounts.map((a) => (
              <label key={a.id} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(a.id)}
                  onChange={() => toggleAccount(a.id)}
                />
                {a.name}
              </label>
            ))}
          </div>
        </>
      )}

      <label className={styles.label}>Mercato</label>
      <select className={styles.input} value={market} onChange={(e) => setMarket(e.target.value)}>
        {MARKETS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={hasNews} onChange={(e) => setHasNews(e.target.checked)} />
        C'era notizia quel giorno
      </label>

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Sessione apertura</label>
          <select className={styles.input} value={openSession} onChange={(e) => setOpenSession(e.target.value)}>
            {SESSIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Sessione chiusura</label>
          <select className={styles.input} value={closeSession} onChange={(e) => setCloseSession(e.target.value)}>
            {SESSIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Ora di entrata</label>
          <input
            className={styles.input}
            type="time"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
          />
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Ora di uscita</label>
          <input
            className={styles.input}
            type="time"
            value={exitTime}
            onChange={(e) => setExitTime(e.target.value)}
          />
        </div>
      </div>

      <label className={styles.label}>Profitto / Perdita ($)</label>
      <input
        className={styles.input}
        type="number"
        step="0.01"
        placeholder="es. 250 o -120"
        value={profit}
        onChange={(e) => setProfit(e.target.value)}
      />

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Trade aperti</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            value={tradesOpened}
            onChange={(e) => setTradesOpened(e.target.value)}
          />
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Trade effettivi</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            value={tradesEffective}
            onChange={(e) => setTradesEffective(e.target.value)}
          />
        </div>
      </div>

      <label className={styles.label}>Lato</label>
      <select className={styles.input} value={side} onChange={(e) => setSide(e.target.value)}>
        <option value="long">Long</option>
        <option value="short">Short</option>
        <option value="misto">Misto</option>
      </select>

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Size iniziale (micro)</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            placeholder="es. 10"
            value={initialSizeMicro}
            onChange={(e) => setInitialSizeMicro(e.target.value)}
          />
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Size finale (micro)</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            placeholder="se cambiata"
            value={finalSizeMicro}
            onChange={(e) => setFinalSizeMicro(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Rischio iniziale ($)</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            placeholder="es. 200"
            value={initialRisk}
            onChange={(e) => setInitialRisk(e.target.value)}
          />
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Rischio finale ($)</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            placeholder="se stop allungato"
            value={finalRisk}
            onChange={(e) => setFinalRisk(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Punti rischiati (SL)</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            placeholder="es. 20"
            value={riskPoints}
            onChange={(e) => setRiskPoints(e.target.value)}
          />
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Punti fatti (risultato)</label>
          <input
            className={styles.input}
            type="number"
            placeholder="es. 45 o -20"
            value={resultPoints}
            onChange={(e) => setResultPoints(e.target.value)}
          />
        </div>
      </div>

      <label className={styles.label}>Rischio/Rendimento (R)</label>
      <input
        className={styles.input}
        type="number"
        step="0.1"
        placeholder="es. 2.5"
        value={riskReward}
        onChange={(e) => setRiskReward(e.target.value)}
      />

      <label className={styles.label}>Esito del trade</label>
      <div className={styles.toggleGroup}>
        {OUTCOMES.map((o) => (
          <button
            key={o}
            type="button"
            className={`${styles.toggleOption} ${outcome === o ? styles.toggleOptionActive : ''}`}
            onClick={() => setOutcome(outcome === o ? '' : o)}
          >
            {o}
          </button>
        ))}
      </div>

      <label className={styles.label}>Chiusura trade</label>
      <div className={styles.toggleGroup}>
        {CLOSE_TYPES.map((ct) => (
          <button
            key={ct}
            type="button"
            className={`${styles.toggleOption} ${closeType === ct ? styles.toggleOptionActive : ''}`}
            onClick={() => setCloseType(closeType === ct ? '' : ct)}
          >
            {ct}
          </button>
        ))}
      </div>

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={reEntry} onChange={(e) => setReEntry(e.target.checked)} />
        Ho fatto re-entry
      </label>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={followedStrategy}
          onChange={(e) => setFollowedStrategy(e.target.checked)}
        />
        Ho seguito la strategia
      </label>

      <label className={styles.label}>Dai un voto da A a D</label>
      <div className={styles.toggleGroup}>
        {GRADES.map((g) => (
          <button
            key={g}
            type="button"
            className={`${styles.toggleOption} ${grade === g ? styles.toggleOptionActive : ''}`}
            onClick={() => setGrade(grade === g ? '' : g)}
          >
            {g}
          </button>
        ))}
      </div>
      <div className={styles.gradeLegend}>
        {GRADES.map((g) => (
          <div key={g} className={styles.gradeLegendRow}>
            <span className={styles.gradeLegendLetter}>{g}</span>
            <span>{GRADE_LEGEND[g]}</span>
          </div>
        ))}
      </div>

      <label className={styles.label}>Stato emotivo</label>
      <select className={styles.input} value={emotionalState} onChange={(e) => setEmotionalState(e.target.value)}>
        <option value="">Non specificato</option>
        {EMOTIONAL_STATES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <label className={styles.label}>Fiducia ({confidenceLevel}/10)</label>
      <input
        className={styles.rangeInput}
        type="range"
        min="1"
        max="10"
        value={confidenceLevel}
        onChange={(e) => setConfidenceLevel(e.target.value)}
      />

      <label className={styles.label}>Tag (separati da virgola)</label>
      <input
        className={styles.input}
        type="text"
        placeholder="es. fomo, breakout, revenge"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />

      <label className={styles.label}>Link screenshot (TradingView)</label>
      <input
        className={styles.input}
        type="url"
        placeholder="incolla qui il link «Get chart image» di TradingView"
        value={chartUrl}
        onChange={(e) => setChartUrl(e.target.value)}
      />

      <label className={styles.label}>Errore principale</label>
      <input
        className={styles.input}
        type="text"
        placeholder="es. entrata anticipata senza conferma"
        value={mistake}
        onChange={(e) => setMistake(e.target.value)}
      />

      <label className={styles.label}>Cosa ho fatto bene</label>
      <input
        className={styles.input}
        type="text"
        placeholder="es. rispettato lo stop"
        value={whatWentWell}
        onChange={(e) => setWhatWentWell(e.target.value)}
      />

      <label className={styles.label}>Lezione del trade</label>
      <input
        className={styles.input}
        type="text"
        placeholder="es. aspettare sempre la conferma su M15"
        value={lesson}
        onChange={(e) => setLesson(e.target.value)}
      />

      <button type="submit" className={styles.submit}>
        {isEdit ? 'Salva' : 'Salva giornata'}
      </button>
    </form>
  )
}
