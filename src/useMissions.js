import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { missionFromDb, missionToDb } from './supabaseMappers'

const DETECTION_WINDOW_DAYS = 15
const DETECTION_THRESHOLD = 2

// MAI usare toISOString() per ricavare una stringa data da un Date locale (converte a UTC e,
// con fuso orario positivo, fa retrocedere la data di un giorno). Va letta con i componenti
// locali. Stesso bug corretto in useTradingData.js.
function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayStr() {
  return toLocalDateStr(new Date())
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toLocalDateStr(d)
}

function diffDays(fromStr, toStr) {
  const from = new Date(fromStr + 'T00:00:00')
  const to = new Date(toStr + 'T00:00:00')
  return Math.round((to - from) / 86400000)
}

// Ogni tipo di missione ha: come si rileva il problema (detect), la regola da rispettare
// durante la missione (violates), i testi mostrati all'utente (goal/rulesText), e un'icona/
// colore per rendere le card riconoscibili a colpo d'occhio invece che solo testo.
export const MISSION_TYPES = {
  overtrading: {
    label: 'Overtrading',
    icon: '🌪️',
    color: '#ff5c5c',
    durationDays: 5,
    detect: (e) => !!e.overtradingDay,
    violates: (e) => !e.overtradingDay && (e.tradesEffective || 0) > 2,
    goal: 'Massimo 2 trade al giorno',
    rulesText: () => `Per i prossimi 5 giorni puoi fare massimo 2 trade al giorno.`,
    problemText: (count) => `Hai fatto overtrading ${count} volte negli ultimi ${DETECTION_WINDOW_DAYS} giorni.`,
  },
  overlottaggio: {
    label: 'Overlottaggio',
    icon: '⚖️',
    color: '#e0a83d',
    durationDays: 5,
    detect: (e) => !!(e.finalSizeMicro && e.initialSizeMicro && e.finalSizeMicro > e.initialSizeMicro),
    violates: (e) => !!(e.finalSizeMicro && e.initialSizeMicro && e.finalSizeMicro > e.initialSizeMicro),
    goal: 'Rischio ridotto del 50%',
    rulesText: () => `Riduci il rischio del 50% per i prossimi 5 giorni: niente aumenti di lottaggio dopo l'ingresso.`,
    problemText: (count) => `Hai aumentato il lottaggio a metà trade ${count} volte negli ultimi ${DETECTION_WINDOW_DAYS} giorni.`,
  },
  revenge: {
    label: 'Revenge Trading',
    icon: '🔥',
    color: '#ff5c5c',
    durationDays: 7,
    detect: (e) => !!e.reEntry,
    violates: (e) => !!e.reEntry,
    goal: 'Zero re-entry impulsivi',
    rulesText: () => `Dopo ogni perdita attendi almeno 30 minuti prima di poter aprire un altro trade, per i prossimi 7 giorni.`,
    problemText: (count) => `Hai fatto re-entry impulsivi ${count} volte negli ultimi ${DETECTION_WINDOW_DAYS} giorni.`,
  },
  stoploss: {
    label: 'Stop Loss',
    icon: '🛡️',
    color: '#9b6bd6',
    durationDays: 7,
    detect: (e) => !!(e.finalRisk && e.initialRisk && e.finalRisk > e.initialRisk),
    violates: (e) => !!(e.finalRisk && e.initialRisk && e.finalRisk > e.initialRisk),
    goal: 'Zero Stop Loss spostati',
    rulesText: () => `Per una settimana non modificare mai lo Stop Loss dopo l'ingresso.`,
    problemText: (count) => `Hai spostato lo Stop Loss dopo l'ingresso ${count} volte negli ultimi ${DETECTION_WINDOW_DAYS} giorni.`,
  },
  news: {
    label: 'News Trading',
    icon: '📰',
    color: '#4f8cff',
    durationDays: 5,
    detect: (e) => !!e.hasNews && e.profit < 0,
    violates: (e) => !!e.hasNews,
    goal: 'Zero trade durante le notizie',
    rulesText: () => `Per i prossimi 5 giorni niente trade nelle finestre di notizie importanti.`,
    problemText: (count) => `Hai perso su trade in notizia ${count} volte negli ultimi ${DETECTION_WINDOW_DAYS} giorni.`,
  },
  lowConfidence: {
    label: 'Bassa Fiducia',
    icon: '🎯',
    color: '#e0a83d',
    durationDays: 5,
    detect: (e) => e.confidenceLevel != null && e.confidenceLevel <= 4 && e.profit < 0,
    violates: (e) => e.confidenceLevel != null && e.confidenceLevel <= 4,
    goal: 'Solo trade con fiducia ≥ 5/10',
    rulesText: () => `Per i prossimi 5 giorni salta ogni trade in cui la tua fiducia è sotto 5/10.`,
    problemText: (count) => `Hai perso su trade a bassa fiducia ${count} volte negli ultimi ${DETECTION_WINDOW_DAYS} giorni.`,
  },
  impulsiveGrade: {
    label: 'Trade Impulsivi',
    icon: '💥',
    color: '#ff5c5c',
    durationDays: 5,
    detect: (e) => e.grade === 'D',
    violates: (e) => e.grade === 'D',
    goal: 'Zero trade valutati D',
    rulesText: () => `Per i prossimi 5 giorni zero trade impulsivi (voto D): se non è nel piano, non lo apri.`,
    problemText: (count) => `Hai fatto ${count} trade impulsivi (voto D) negli ultimi ${DETECTION_WINDOW_DAYS} giorni.`,
  },
  negativeEmotion: {
    label: 'Stato Emotivo',
    icon: '😤',
    color: '#9b6bd6',
    durationDays: 5,
    detect: (e) => ['Stressato', 'Rabbia', 'Ansioso'].includes(e.emotionalState) && e.profit < 0,
    violates: (e) => ['Stressato', 'Rabbia', 'Ansioso'].includes(e.emotionalState),
    goal: 'Zero trade in stato emotivo negativo',
    rulesText: () => `Per i prossimi 5 giorni non aprire trade se ti senti stressato, arrabbiato o ansioso.`,
    problemText: (count) => `Hai perso in stato emotivo negativo ${count} volte negli ultimi ${DETECTION_WINDOW_DAYS} giorni.`,
  },
  lowRR: {
    label: 'R:R Basso',
    icon: '📉',
    color: '#4f8cff',
    durationDays: 5,
    detect: (e) => e.riskReward != null && e.riskReward < 1,
    violates: (e) => e.riskReward != null && e.riskReward < 1,
    goal: 'Solo trade con R:R ≥ 1',
    rulesText: () => `Per i prossimi 5 giorni accetta solo trade con rapporto rischio/rendimento almeno 1:1.`,
    problemText: (count) => `Hai preso ${count} trade con R:R sotto 1 negli ultimi ${DETECTION_WINDOW_DAYS} giorni.`,
  },
}

// Stato/progresso di una missione NON è salvato: si ricalcola sempre dai dati del journal,
// così non può mai andare fuori sincrono con le entry reali.
export function evaluateMission(mission, entries) {
  const def = MISSION_TYPES[mission.type]
  const endDate = addDays(mission.startDate, mission.durationDays - 1)
  const today = todayStr()

  const windowEntries = entries.filter((e) =>
    mission.accountIds.includes(e.accountId) && e.date >= mission.startDate && e.date <= endDate
  )
  const violations = windowEntries.filter((e) => def.violates(e))

  const daysElapsed = Math.min(Math.max(diffDays(mission.startDate, today) + 1, 0), mission.durationDays)
  const isPastEnd = today > endDate

  let status = 'active'
  if (violations.length > 0) status = 'failed'
  else if (isPastEnd) status = 'completed'

  // L'utente può chiudere una missione manualmente (superata/fallita) prima che i dati
  // automatici la risolvano da soli: se presente, l'esito manuale vince su quello calcolato.
  if (mission.manualStatus) status = mission.manualStatus

  const percent = Math.min(100, Math.round((daysElapsed / mission.durationDays) * 100))

  return { ...mission, endDate, status, violationsCount: violations.length, percent, isManual: !!mission.manualStatus }
}

export function useMissions(entries) {
  const [missions, setMissions] = useState([])

  useEffect(() => {
    let active = true
    async function loadMissions() {
      const { data, error } = await supabase.from('missions').select('*').order('created_at', { ascending: false })
      if (!active) return
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Errore caricamento missioni:', error.message)
        return
      }
      setMissions(data.map(missionFromDb))
    }
    loadMissions()
    return () => { active = false }
  }, [])

  // Analizza il journal degli ultimi 15 giorni e genera una nuova missione per ogni
  // pattern negativo rilevato, a patto che non ce ne sia già una attiva dello stesso tipo.
  async function generateMissions(accountIds) {
    const windowStart = addDays(todayStr(), -DETECTION_WINDOW_DAYS)
    const recentEntries = entries.filter((e) => accountIds.includes(e.accountId) && e.date >= windowStart)

    const toCreate = []
    Object.entries(MISSION_TYPES).forEach(([type, def]) => {
      const count = recentEntries.filter((e) => def.detect(e)).length
      if (count < DETECTION_THRESHOLD) return

      const hasActive = missions.some((m) => {
        if (m.type !== type) return false
        const evald = evaluateMission(m, entries)
        return evald.status === 'active' && m.accountIds.some((id) => accountIds.includes(id))
      })
      if (hasActive) return

      toCreate.push({
        type,
        accountIds,
        startDate: todayStr(),
        durationDays: def.durationDays,
        problemDescription: def.problemText(count),
        goal: def.goal,
        rulesText: def.rulesText(count),
      })
    })

    if (toCreate.length === 0) return []

    const { data, error } = await supabase.from('missions').insert(toCreate.map(missionToDb)).select()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore creazione missioni:', error.message)
      return []
    }
    const created = data.map(missionFromDb)
    setMissions((prev) => [...created, ...prev])
    return created
  }

  async function dismissMission(id) {
    const { error } = await supabase.from('missions').delete().eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore eliminazione missione:', error.message)
      return
    }
    setMissions((prev) => prev.filter((m) => m.id !== id))
  }

  async function setMissionOutcome(id, outcome) {
    const { error } = await supabase.from('missions').update({ manual_status: outcome }).eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore aggiornamento missione:', error.message)
      return
    }
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, manualStatus: outcome } : m)))
  }

  async function clearMissionOutcome(id) {
    const { error } = await supabase.from('missions').update({ manual_status: null }).eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore aggiornamento missione:', error.message)
      return
    }
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, manualStatus: null } : m)))
  }

  // Cancella tutte le missioni dell'utente loggato (RLS limita già alla sua sola riga).
  async function deleteAllMissions() {
    const { error } = await supabase.from('missions').delete().not('id', 'is', null)
    if (error) throw error
    setMissions([])
  }

  return {
    missions, generateMissions, dismissMission, setMissionOutcome, clearMissionOutcome, deleteAllMissions,
  }
}
