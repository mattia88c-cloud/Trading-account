import { useMemo } from 'react'
import Card from './Card'
import MissionRing from './MissionRing.jsx'
import { evaluateMission, MISSION_TYPES } from '../useMissions'
import styles from './RecoveryMissions.module.css'

const STATUS_LABELS = {
  active: 'In corso',
  completed: 'Superata',
  failed: 'Fallita',
}

function MissionCard({ mission, entries, onDismiss, onSetOutcome, onClearOutcome }) {
  const evald = evaluateMission(mission, entries)
  const def = MISSION_TYPES[mission.type]

  return (
    <div className={`${styles.missionCard} ${styles[`status_${evald.status}`]}`} style={{ '--type-color': def.color }}>
      <span className={styles.statusRibbon}>{STATUS_LABELS[evald.status]}</span>

      <div className={styles.cardTop}>
        <MissionRing percent={evald.percent} icon={def.icon} status={evald.status} />
        <div className={styles.cardHeadline}>
          <span className={styles.missionType}>{def.label}</span>
          <span className={styles.goalChip}>🎯 {mission.goal}</span>
        </div>
      </div>

      <p className={styles.problem}>{mission.problemDescription}</p>
      <p className={styles.rules}>📋 {mission.rulesText}</p>

      <div className={styles.meta}>
        <span>📅 {mission.startDate} → {evald.endDate}</span>
        <span>{evald.violationsCount > 0 ? `❌ ${evald.violationsCount}` : '✅ 0'}</span>
      </div>

      {evald.status === 'active' && (
        <div className={styles.outcomeActions}>
          <button className={styles.successBtn} onClick={() => onSetOutcome(mission.id, 'completed')}>🏆 Superata</button>
          <button className={styles.failBtn} onClick={() => onSetOutcome(mission.id, 'failed')}>💀 Fallita</button>
        </div>
      )}

      {evald.status !== 'active' && (
        <div className={styles.outcomeActions}>
          {evald.isManual && (
            <button className={styles.undoBtn} onClick={() => onClearOutcome(mission.id)}>↺ Annulla</button>
          )}
          <button className={styles.dismissBtn} onClick={() => onDismiss(mission.id)}>Archivia</button>
        </div>
      )}
    </div>
  )
}

export default function RecoveryMissions({ accounts, entries, missions, onGenerate, onDismiss, onSetOutcome, onClearOutcome }) {
  const accountIds = useMemo(() => accounts.map((a) => a.id), [accounts])

  const evaluated = missions.map((m) => ({ mission: m, evald: evaluateMission(m, entries) }))
  const active = evaluated.filter((x) => x.evald.status === 'active')
  const finished = evaluated.filter((x) => x.evald.status !== 'active')

  function handleGenerate() {
    const created = onGenerate(accountIds)
    if (created.length === 0) {
      window.alert('Nessun nuovo pattern negativo rilevato negli ultimi 15 giorni (o le missioni per quei pattern sono già attive).')
    }
  }

  if (accounts.length === 0) {
    return <p className={styles.empty}>Crea un conto e registra qualche giornata per generare missioni di recupero.</p>
  }

  return (
    <div className={styles.wrap}>
      <Card>
        <div className={styles.title}>🎮 Recovery Missions</div>
        <p className={styles.subtitle}>
          Il sistema analizza il journal degli ultimi 15 giorni e genera missioni a tempo sui pattern
          negativi che trova. Rispetta le regole e la missione si completa da sola.
        </p>
        <button className={styles.generateBtn} onClick={handleGenerate}>⚡ Genera missioni</button>
      </Card>

      {active.length === 0 && finished.length === 0 && (
        <p className={styles.empty}>Nessuna missione ancora. Clicca "Genera missioni" per analizzare il journal.</p>
      )}

      {active.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>🔥 In corso</div>
          <div className={styles.grid}>
            {active.map(({ mission }) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                entries={entries}
                onDismiss={onDismiss}
                onSetOutcome={onSetOutcome}
                onClearOutcome={onClearOutcome}
              />
            ))}
          </div>
        </div>
      )}

      {finished.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>🏁 Concluse</div>
          <div className={styles.grid}>
            {finished.map(({ mission }) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                entries={entries}
                onDismiss={onDismiss}
                onSetOutcome={onSetOutcome}
                onClearOutcome={onClearOutcome}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
