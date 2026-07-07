import styles from './IdealTradeCard.module.css'

function bestOf(dict, minDays = 1) {
  const entries = Object.entries(dict).filter(([, v]) => v.days >= minDays)
  if (entries.length === 0) return null
  return entries.reduce((best, e) => (e[1].pnl > best[1].pnl ? e : best), entries[0])
}

function worstOf(dict, minDays = 1) {
  const entries = Object.entries(dict).filter(([, v]) => v.days >= minDays)
  if (entries.length === 0) return null
  return entries.reduce((worst, e) => (e[1].pnl < worst[1].pnl ? e : worst), entries[0])
}

const SIDE_LABELS = { long: 'Long', short: 'Short', misto: 'Misto' }

export default function IdealTradeCard({ stats }) {
  const bestMarket = bestOf(stats.byMarket)
  const bestSession = bestOf(stats.byOpenSession)
  const bestDay = bestOf(stats.byWeekday)
  const bestSideRaw = bestOf(stats.bySide)
  const bestSide = bestSideRaw ? [SIDE_LABELS[bestSideRaw[0]] || bestSideRaw[0], bestSideRaw[1]] : null
  const bestEmotion = bestOf(stats.byEmotionalState)
  const bestLotSize = bestOf(stats.byLotSize)
  const bestRiskPoints = bestOf(stats.byRiskPoints)

  const recommendedLot = bestLotSize && stats.initialBalance
    ? (Number(bestLotSize[0]) * (stats.currentBalance / stats.initialBalance))
    : null

  const worstSession = worstOf(stats.byOpenSession)
  const worstDay = worstOf(stats.byWeekday)
  const worstEmotion = worstOf(stats.byEmotionalState)

  const hasRecommendations = bestMarket || bestSession || bestDay || bestSide || bestEmotion
  if (!hasRecommendations) return null

  return (
    <div className={styles.card}>
      <div className={styles.title}>Profilo del trade ideale</div>
      <div className={styles.subtitle}>Basato sullo storico: le condizioni che hanno reso di più finora</div>

      <div className={styles.goodList}>
        {bestMarket && <div className={styles.row}><span className={styles.check}>✓</span> Mercato: <b>{bestMarket[0]}</b> <span className={styles.meta}>({bestMarket[1].winRate.toFixed(0)}% win, {bestMarket[1].pnl >= 0 ? '+' : ''}{bestMarket[1].pnl.toLocaleString('it-IT')})</span></div>}
        {bestSession && <div className={styles.row}><span className={styles.check}>✓</span> Sessione: <b>{bestSession[0]}</b> <span className={styles.meta}>({bestSession[1].winRate.toFixed(0)}% win, {bestSession[1].pnl >= 0 ? '+' : ''}{bestSession[1].pnl.toLocaleString('it-IT')})</span></div>}
        {bestDay && <div className={styles.row}><span className={styles.check}>✓</span> Giorno: <b>{bestDay[0]}</b> <span className={styles.meta}>({bestDay[1].pnl >= 0 ? '+' : ''}{bestDay[1].pnl.toLocaleString('it-IT')})</span></div>}
        {bestSide && <div className={styles.row}><span className={styles.check}>✓</span> Lato: <b>{bestSide[0]}</b> <span className={styles.meta}>({bestSide[1].winRate.toFixed(0)}% win)</span></div>}
        {bestEmotion && <div className={styles.row}><span className={styles.check}>✓</span> Stato emotivo: <b>{bestEmotion[0]}</b> <span className={styles.meta}>({bestEmotion[1].winRate.toFixed(0)}% win)</span></div>}
        {bestLotSize && <div className={styles.row}><span className={styles.check}>✓</span> Lottaggio migliore storico: <b>{bestLotSize[0]} micro</b> <span className={styles.meta}>({bestLotSize[1].winRate.toFixed(0)}% win, {bestLotSize[1].pnl >= 0 ? '+' : ''}{bestLotSize[1].pnl.toLocaleString('it-IT')})</span></div>}
        {recommendedLot !== null && <div className={styles.row}><span className={styles.check}>✓</span> Lottaggio consigliato ora: <b>{recommendedLot.toFixed(1)} micro</b> <span className={styles.meta}>(scalato sul bilancio attuale)</span></div>}
        {bestRiskPoints && <div className={styles.row}><span className={styles.check}>✓</span> Rischio in punti migliore: <b>{bestRiskPoints[0]} punti</b> <span className={styles.meta}>({bestRiskPoints[1].winRate.toFixed(0)}% win, {bestRiskPoints[1].pnl >= 0 ? '+' : ''}{bestRiskPoints[1].pnl.toLocaleString('it-IT')})</span></div>}
        {stats.avgRiskReward !== null && <div className={styles.row}><span className={styles.check}>✓</span> R:R da puntare: <b>{stats.avgRiskReward.toFixed(2)}</b></div>}
        {stats.avgRiskPct !== null && <div className={styles.row}><span className={styles.check}>✓</span> Rischio per trade: <b>{stats.avgRiskPct.toFixed(2)}%</b> del conto</div>}
      </div>

      {(worstSession || worstDay || worstEmotion) && (
        <>
          <div className={styles.subtitle} style={{ marginTop: 8 }}>Da evitare</div>
          <div className={styles.badList}>
            {worstSession && worstSession[1].pnl < 0 && <div className={styles.row}><span className={styles.cross}>✗</span> Sessione: <b>{worstSession[0]}</b> <span className={styles.meta}>({worstSession[1].pnl.toLocaleString('it-IT')})</span></div>}
            {worstDay && worstDay[1].pnl < 0 && <div className={styles.row}><span className={styles.cross}>✗</span> Giorno: <b>{worstDay[0]}</b> <span className={styles.meta}>({worstDay[1].pnl.toLocaleString('it-IT')})</span></div>}
            {worstEmotion && worstEmotion[1].pnl < 0 && <div className={styles.row}><span className={styles.cross}>✗</span> Stato emotivo: <b>{worstEmotion[0]}</b> <span className={styles.meta}>({worstEmotion[1].pnl.toLocaleString('it-IT')})</span></div>}
          </div>
        </>
      )}
    </div>
  )
}
