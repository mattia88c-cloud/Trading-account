import Card from './Card'
import styles from './BehaviorProgress.module.css'

function fmt(n, digits = 0) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('it-IT', { maximumFractionDigits: digits })
}

function fmtPct(n) {
  if (n === null || n === undefined) return '—'
  return `${n >= 0 ? '+' : ''}${fmt(n, 1)}%`
}

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  return `${n >= 0 ? '+' : ''}$${fmt(n, 0)}`
}

// Verso del confronto "prima → dopo": per episodi (revenge, overlot) un valore più basso è
// il miglioramento, per piano/P&L è il contrario. Usato solo per l'accento colorato in
// modalità giorno (vedi [data-theme="light"] in BehaviorProgress.module.css).
function trend(prev, curr, higherIsBetter) {
  if (prev === null || prev === undefined || curr === null || curr === undefined || curr === prev) return ''
  const improved = higherIsBetter ? curr > prev : curr < prev
  return improved ? 'up' : 'down'
}

// Testo generato con un template deterministico sui numeri calcolati (nessuna chiamata AI:
// quella sezione è rimandata). Copre gli scenari principali richiesti dal riepilogo.
function buildSummary(data) {
  const parts = []

  if (data.noOvertradingStreak >= 3) {
    parts.push(`hai eliminato quasi completamente l'overtrading (${data.noOvertradingStreak} giorni consecutivi senza)`)
  } else if (data.noOvertradingStreak === 0) {
    parts.push(`l'overtrading è ancora presente nell'ultimo periodo`)
  }

  if (data.planLast30Pct !== null && data.planPrev30Pct !== null) {
    const delta = data.planLast30Pct - data.planPrev30Pct
    if (Math.abs(delta) >= 3) {
      parts.push(`il rispetto del piano è passato dal ${fmt(data.planPrev30Pct, 0)}% al ${fmt(data.planLast30Pct, 0)}%`)
    } else {
      parts.push(`il rispetto del piano si mantiene stabile intorno al ${fmt(data.planLast30Pct, 0)}%`)
    }
  }

  if (data.revengeReductionPct !== null && data.revengeReductionPct > 0) {
    parts.push(`il revenge trading è calato del ${fmt(data.revengeReductionPct, 0)}%`)
  }
  if (data.overlotReductionPct !== null && data.overlotReductionPct > 0) {
    parts.push(`l'overlottaggio è calato del ${fmt(data.overlotReductionPct, 0)}%`)
  }

  if (parts.length === 0) {
    return 'Non ci sono ancora abbastanza dati per un riepilogo affidabile: continua a registrare le giornate.'
  }

  const body = parts.join(', ')
  const tail = data.disciplineScore !== null
    ? (data.disciplineScore >= 70 ? ' I tuoi comportamenti stanno migliorando in modo costante.' : ' C\'è ancora margine di miglioramento sulla disciplina.')
    : ''

  return `Negli ultimi 30 giorni ${body}.${tail}`
}

function buildTimeline(data) {
  const items = []
  if (data.noOvertradingStreak >= 3) items.push(`${data.noOvertradingStreak} giorni senza overtrading`)
  if (data.riskRespectedStreak >= 3) items.push(`${data.riskRespectedStreak} giorni consecutivi con rischio rispettato`)
  if (data.slRespectedPct !== null && data.slRespectedPct >= 90) items.push(`Stop Loss rispettato nel ${fmt(data.slRespectedPct, 0)}% dei casi`)
  if (data.revengeReductionPct !== null && data.revengeReductionPct >= 20) items.push(`Revenge trading ridotto del ${fmt(data.revengeReductionPct, 0)}%`)
  if (data.overlotReductionPct !== null && data.overlotReductionPct >= 20) items.push(`Overlottaggio ridotto del ${fmt(data.overlotReductionPct, 0)}%`)
  if (data.disciplineScore !== null && data.disciplineScore >= 80) items.push(`Nuovo record di disciplina: score ${data.disciplineScore}/100`)
  return items
}

// Stroke minimale (stile Feather, currentColor) coerente con TabIcons.jsx, per le chip metriche.
const icon = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
}

const ICONS = {
  flame: <svg {...icon}><path d="M12 3c2 3-1 4-1 6.5a2.5 2.5 0 0 0 5 0c0-1-.5-1.7-.5-1.7 1.5 1 2.5 2.8 2.5 4.7a6 6 0 1 1-12 0C5.5 8 9 6 12 3z" /></svg>,
  shield: <svg {...icon}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /></svg>,
  shieldCheck: <svg {...icon}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>,
  target: <svg {...icon}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></svg>,
  trendDown: <svg {...icon}><polyline points="3,7 10,14 14,10 21,17" /><polyline points="15,17 21,17 21,11" /></svg>,
  smile: <svg {...icon}><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" /><path d="M8 14c1.2 1.5 2.6 2 4 2s2.8-.5 4-2" /></svg>,
  award: <svg {...icon}><circle cx="12" cy="9" r="5.5" /><path d="M9 13.5 7.5 21 12 18.5 16.5 21 15 13.5" /></svg>,
}

function scoreColor(score) {
  const v = 100 - score
  if (v < 40) return 'var(--green)'
  if (v < 70) return 'var(--amber)'
  return 'var(--red)'
}

function ScoreRing({ score }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0))
  const color = scoreColor(pct)
  const size = 92
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div className={styles.ring}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="22" fill="var(--text)">{pct}</text>
      </svg>
      <span className={styles.ringLabel}>Score disciplina</span>
    </div>
  )
}

export default function BehaviorProgress({ data }) {
  if (!data) return null

  const chips = [
    { icon: 'flame', value: fmt(data.noOvertradingStreak), label: 'senza overtrading' },
    { icon: 'shield', value: fmt(data.riskRespectedStreak), label: 'rischio rispettato' },
    { icon: 'shieldCheck', value: data.slRespectedPct !== null ? `${fmt(data.slRespectedPct, 0)}%` : '—', label: 'SL rispettati' },
    { icon: 'trendDown', value: fmtPct(data.revengeReductionPct), label: 'revenge trading', tone: data.revengeReductionPct },
    { icon: 'trendDown', value: fmtPct(data.overlotReductionPct), label: 'overlottaggio', tone: data.overlotReductionPct },
    { icon: 'target', value: data.planLast30Pct !== null ? `${fmt(data.planLast30Pct, 0)}%` : '—', label: 'rispetto piano' },
    { icon: 'smile', value: data.executionQualityPct !== null ? `${fmt(data.executionQualityPct, 0)}%` : '—', label: 'qualità esecuzione' },
  ]

  const timeline = buildTimeline(data)

  return (
    <div className={styles.wrap}>
      <Card>
        <div className={styles.title}>Behavior Progress</div>
        <p className={styles.subtitle}>Non solo P&amp;L: qui misuriamo la disciplina.</p>

        <div className={styles.scoreRow}>
          <ScoreRing score={data.disciplineScore ?? 0} />

          <div className={styles.chipsGrid}>
            {chips.map((c) => (
              <div key={c.label} className={styles.chip}>
                <span className={styles.chipIcon}>{ICONS[c.icon]}</span>
                <div>
                  <div
                    className={styles.chipValue}
                    style={c.tone !== undefined && c.tone !== null ? { color: c.tone >= 0 ? 'var(--green)' : 'var(--red)' } : undefined}
                  >
                    {c.value}
                  </div>
                  <div className={styles.chipLabel}>{c.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.stripWrap}>
          <div className={styles.strip}>
            {data.dailyTimeline.map((d) => (
              <div key={d.date} className={`${styles.stripBar} ${styles[`bar_${d.state}`]}`} title={`${d.date}: ${d.state === 'clean' ? 'giorno pulito' : d.state === 'violation' ? 'violazione' : 'nessun dato'}`} />
            ))}
          </div>
          <div className={styles.stripLegend}>
            <span><i className={`${styles.dot} ${styles.dotClean}`} />pulito</span>
            <span><i className={`${styles.dot} ${styles.dotViolation}`} />violazione</span>
            <span><i className={`${styles.dot} ${styles.dotEmpty}`} />n/d</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className={styles.sectionTitle}>Ultimi 30 giorni vs precedenti</div>
        <div className={styles.compareGrid}>
          <div className={`${styles.compareCol} ${styles[trend(data.planPrev30Pct, data.planLast30Pct, true)] || ''}`}>
            <div className={styles.compareLabel}>Rispetto del piano</div>
            <div className={styles.compareValues}>
              <span>{data.planPrev30Pct !== null ? `${fmt(data.planPrev30Pct, 0)}%` : '—'}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.compareNow}>{data.planLast30Pct !== null ? `${fmt(data.planLast30Pct, 0)}%` : '—'}</span>
            </div>
          </div>
          <div className={`${styles.compareCol} ${styles[trend(data.revengePrev30, data.revengeLast30, false)] || ''}`}>
            <div className={styles.compareLabel}>Revenge trading (episodi)</div>
            <div className={styles.compareValues}>
              <span>{data.revengePrev30}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.compareNow}>{data.revengeLast30}</span>
            </div>
          </div>
          <div className={`${styles.compareCol} ${styles[trend(data.overlotPrev30, data.overlotLast30, false)] || ''}`}>
            <div className={styles.compareLabel}>Overlottaggio (episodi)</div>
            <div className={styles.compareValues}>
              <span>{data.overlotPrev30}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.compareNow}>{data.overlotLast30}</span>
            </div>
          </div>
          <div className={`${styles.compareCol} ${styles[trend(data.pnlPrev30, data.pnlLast30, true)] || ''}`}>
            <div className={styles.compareLabel}>P&amp;L del periodo</div>
            <div className={styles.compareValues}>
              <span>{fmtMoney(data.pnlPrev30)}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.compareNow}>{fmtMoney(data.pnlLast30)}</span>
            </div>
          </div>
        </div>
        <p className={styles.compareNote}>Un comportamento migliore riduce il rischio nel tempo, anche se il P&amp;L non lo mostra subito.</p>
      </Card>

      {timeline.length > 0 && (
        <Card>
          <div className={styles.sectionTitle}>Traguardi</div>
          <div className={styles.badges}>
            {timeline.map((t, i) => (
              <span key={i} className={styles.badge}>
                <span className={styles.badgeIcon}>{ICONS.award}</span>
                {t}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className={styles.summaryCard}>
        <div className={styles.sectionTitle}>Riepilogo</div>
        <p className={styles.summaryText}>{buildSummary(data)}</p>
      </Card>
    </div>
  )
}
