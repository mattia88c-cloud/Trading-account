import { useEffect, useState } from 'react'
import { parseCsvToDailyEntries } from './csvImport'
import { supabase } from './supabaseClient'
import {
  accountFromDb, accountToDb, entryFromDb, entryToDb, payoutFromDb, payoutToDb,
} from './supabaseMappers'

// Chiavi usate PRIMA della migrazione a Supabase (Stadio B). Non le usiamo più per leggere/
// scrivere lo stato dell'app, ma i dati con cui abbiamo lavorato in sessione restano lì finché
// l'utente non li importa esplicitamente nel suo account cloud (vedi readLegacyLocalData sotto).
const LEGACY_ACCOUNTS_KEY = 'trading-accounts:accounts'
const LEGACY_ENTRIES_KEY = 'trading-accounts:entries'
const LEGACY_PAYOUTS_KEY = 'trading-accounts:payouts'

export function readLegacyLocalData() {
  try {
    const accounts = JSON.parse(localStorage.getItem(LEGACY_ACCOUNTS_KEY) || '[]')
    const entries = JSON.parse(localStorage.getItem(LEGACY_ENTRIES_KEY) || '[]')
    const payouts = JSON.parse(localStorage.getItem(LEGACY_PAYOUTS_KEY) || '[]')
    if (accounts.length === 0 && entries.length === 0) return null
    return { accounts, entries, payouts }
  } catch {
    return null
  }
}

// Va chiamata dopo che l'utente ha importato (o esplicitamente ignorato) i dati legacy: senza
// questo, readLegacyLocalData() continua a trovare gli stessi dati ad ogni reload e il banner
// li ripropone all'infinito, permettendo import duplicati ripetuti (bug osservato: 3 import
// dello stesso backup hanno creato 12 conti invece di 4).
export function clearLegacyLocalData() {
  localStorage.removeItem(LEGACY_ACCOUNTS_KEY)
  localStorage.removeItem(LEGACY_ENTRIES_KEY)
  localStorage.removeItem(LEGACY_PAYOUTS_KEY)
}

export const BALANCE_PRESETS = [25000, 50000, 100000, 150000]

export const DRAWDOWN_BY_PRESET = {
  25000: 1000,
  50000: 2000,
  100000: 3000,
  150000: 4500,
}

export const ACCOUNT_COLORS = [
  '#4f8cff', '#2ecc71', '#e67e22', '#e74c3c',
  '#9b59b6', '#1abc9c', '#f1c40f', '#ff6b9d',
]

// I marker dei payout nei grafici Dashboard sono bianchi (vedi EquityCharts.jsx): un conto
// bianco/quasi bianco renderebbe quel punto invisibile sulla propria linea. Il filtro qui è
// una rete di sicurezza — nessun colore in ACCOUNT_COLORS è bianco oggi, ma se in futuro se ne
// aggiunge uno (o si introduce un color picker) questo esclude comunque i colori troppo chiari
// dall'assegnazione automatica, invece di fidarsi solo della convenzione.
function isNearWhite(hex) {
  if (!hex) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r > 230 && g > 230 && b > 230
}

const SAFE_ACCOUNT_COLORS = ACCOUNT_COLORS.filter((c) => !isNearWhite(c))

export const MARKETS = ['NAS100', 'XAUUSD']

export const SESSIONS = ['Asia', 'Londra', 'New York']

export const CLOSE_TYPES = ['TP', 'Stop', 'BE', 'Parziale', 'Stop in profit']

export const OUTCOMES = ['Win', 'Loss', 'Breakeven']

export const GRADES = ['A', 'B', 'C', 'D']

export const GRADE_LEGEND = {
  A: 'Setup perfetto, esecuzione perfetta, gestione perfetta',
  B: 'Buon trade con piccole imperfezioni',
  C: 'Trade mediocre, entrata dubbia',
  D: 'Trade impulsivo, fuori piano',
}

export const EMOTIONAL_STATES = ['Calmo', 'Stressato', 'Stanco', 'Euforico', 'Ansioso']

function parseTags(raw) {
  if (!raw) return []
  return raw
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
}

// MAI usare toISOString() per ricavare una stringa data da un Date locale: converte a UTC e,
// con fuso orario positivo (es. CEST +2h), fa retrocedere la data di un giorno. Va sempre
// letta con i componenti locali (getFullYear/getMonth/getDate). Bug già capitato in questa
// codebase (vedi NOTES.md, CSV import e dati demo) — qui si applica anche a getMonday/addDays.
function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return toLocalDateStr(d)
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toLocalDateStr(d)
}

function todayStr() {
  return toLocalDateStr(new Date())
}

function dayOfWeekLabel(dateStr) {
  const labels = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  return labels[new Date(dateStr).getDay()]
}

// Groups consecutive entries (by date order) matching `predicate` into streaks
// and returns { max, avg } streak length. Used for consecutive wins/losses.
function computeStreaks(sortedEntries, predicate) {
  const streaks = []
  let current = 0
  sortedEntries.forEach((e) => {
    if (predicate(e)) {
      current += 1
    } else if (current > 0) {
      streaks.push(current)
      current = 0
    }
  })
  if (current > 0) streaks.push(current)
  if (streaks.length === 0) return { max: 0, avg: 0 }
  return {
    max: Math.max(...streaks),
    avg: streaks.reduce((sum, s) => sum + s, 0) / streaks.length,
  }
}

function avgDuration(entries) {
  const withDuration = entries.filter((e) => e.durationMinutes)
  if (withDuration.length === 0) return null
  return withDuration.reduce((sum, e) => sum + e.durationMinutes, 0) / withDuration.length
}

// Computes minutes between two "HH:MM" times, assuming exitTime may roll past midnight.
function computeDurationMinutes(entryTime, exitTime) {
  if (!entryTime || !exitTime) return null
  const [eh, em] = entryTime.split(':').map(Number)
  const [xh, xm] = exitTime.split(':').map(Number)
  let minutes = (xh * 60 + xm) - (eh * 60 + em)
  if (minutes < 0) minutes += 24 * 60
  return minutes
}

function modificationStats(entries, predicate) {
  const matching = entries.filter(predicate)
  const wins = matching.filter((e) => e.profit > 0).length
  const losses = matching.filter((e) => e.profit <= 0).length
  return {
    count: matching.length,
    wins,
    losses,
    pnl: matching.reduce((sum, e) => sum + e.profit, 0),
  }
}

// Un trade copy-tradato su più conti crea una entry per conto con campi identici (solo l'account
// cambia, vedi saveDayEntry): la firma serve a riconoscere queste righe come "lo stesso trade" da
// contare una volta sola nelle statistiche, distinguendole da trade realmente diversi che oggi
// possono capitare sullo stesso conto/giorno (contenuto diverso, quindi firma diversa).
export function entrySignature(e) {
  const { id, accountId, createdAt, ...rest } = e
  return JSON.stringify(rest)
}

// Shared stats computation used both for a single account and for a multi-account summary.
function computeStats(groupEntries, initialBalance, groupPayouts = []) {
  const allSorted = [...groupEntries].sort((a, b) => a.date.localeCompare(b.date))
  // Le giornate di overtrading pesano sul saldo reale (sono soldi veri, restano in allSorted)
  // ma non devono influenzare le statistiche "di qualità" (win rate, expectancy, breakdown per
  // mercato/sessione/ecc.): per quelle usiamo solo i giorni compilati in modo affidabile.
  const sorted = allSorted.filter((e) => !e.overtradingDay)
  // Conta le date distinte, non le entry: con più conti selezionati un giorno di overtrading
  // può avere un'entry per conto sulla stessa data.
  const overtradingDaysCount = new Set(allSorted.filter((e) => e.overtradingDay).map((e) => e.date)).size
  // Importi negativi in groupPayouts sono capitale aggiunto (vedi addCapital in useTradingData.js),
  // non prelievi: la statistica "payouts" mostrata all'utente conta solo i prelievi veri.
  const withdrawalPayouts = groupPayouts.filter((p) => p.amount > 0)

  const empty = {
    totalPnl: 0,
    winRate: 0,
    daysTraded: 0,
    overtradingDaysCount: 0,
    totalDaysTradedAll: 0,
    winningDays: 0,
    losingDays: 0,
    totalTradesOpened: 0,
    totalTradesEffective: 0,
    bestDay: null,
    worstDay: null,
    currentBalance: initialBalance,
    growthPct: 0,
    expectancy: 0,
    profitFactor: 0,
    winners: { total: 0, best: 0, average: 0, avgDuration: null, maxStreak: 0, avgStreak: 0 },
    losers: { total: 0, best: 0, average: 0, avgDuration: null, maxStreak: 0, avgStreak: 0 },
    bySide: {},
    byWeekday: {},
    byMonth: {},
    byMarket: {},
    byOpenSession: {},
    byNews: {},
    byStrategy: {},
    disciplineCost: { offPlanCount: 0, missedTPCount: 0, missedTPPct: null, missedTPPnl: 0 },
    byCloseType: {},
    byGrade: {},
    byEmotionalState: {},
    byTag: {},
    byLotSize: {},
    byRiskPoints: {},
    avgRiskReward: null,
    avgRiskPct: null,
    avgConfidence: null,
    initialBalance,
    modifications: {
      reEntry: { count: 0, wins: 0, losses: 0, pnl: 0 },
      stopWidened: { count: 0, wins: 0, losses: 0, pnl: 0 },
      lotIncreased: { count: 0, wins: 0, losses: 0, pnl: 0 },
    },
    avgTradeFrequency: 0,
    payouts: { total: 0, count: 0, list: [] },
  }

  if (allSorted.length === 0 || !initialBalance) {
    if (withdrawalPayouts.length > 0) {
      empty.payouts = {
        total: withdrawalPayouts.reduce((sum, p) => sum + p.amount, 0),
        count: withdrawalPayouts.length,
        list: [...withdrawalPayouts].sort((a, b) => b.date.localeCompare(a.date)),
      }
    }
    return empty
  }

  const totalPnl = allSorted.reduce((sum, e) => sum + e.profit, 0)

  // Con più conti selezionati insieme (Riepilogo), la stessa data può avere più entry — una
  // per conto, tipico del copy trading. Le statistiche "a giorni" (giorni tradati, win rate,
  // streak, miglior/peggior giorno, expectancy) vanno contate una volta per data reale, non
  // una volta per entry, altrimenti un giorno in copy trading su 2 conti risulta "2 giorni".
  function groupByDate(entries) {
    const byDate = {}
    entries.forEach((e) => { byDate[e.date] = (byDate[e.date] || 0) + e.profit })
    return Object.entries(byDate)
      .map(([date, profit]) => ({ date, profit }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const allDayRecords = groupByDate(allSorted)
  const dayRecords = groupByDate(sorted)

  // Un trade in copy trading su più conti genera un'entry per conto sulla stessa data con
  // contenuto identico (vedi entrySignature): è UN trade solo, non N, quindi per ogni breakdown
  // "per categoria" (mercato, sessione, voto, tag, lato, ecc.) e per i conteggi trade/durata lo
  // contiamo una volta sola, sommando il P/L e unendo i tag di tutti i conti coinvolti. Trade
  // realmente diversi sullo stesso conto/giorno hanno contenuto diverso quindi firma diversa, e
  // restano quindi separati (non più forzatamente uno per data, dato che un conto può avere più
  // trade distinti nello stesso giorno).
  const tradesByDate = {}
  sorted.forEach((e) => {
    const key = `${e.date}|${entrySignature(e)}`
    if (!tradesByDate[key]) tradesByDate[key] = { ...e, profit: 0, tags: [] }
    const t = tradesByDate[key]
    t.profit += e.profit
    t.tags = [...new Set([...(t.tags || []), ...(e.tags || [])])]
  })
  const trades = Object.values(tradesByDate)

  const winningEntries = trades.filter((e) => e.profit > 0)
  const losingEntries = trades.filter((e) => e.profit < 0)
  const winningDayRecords = dayRecords.filter((d) => d.profit > 0)
  const losingDayRecords = dayRecords.filter((d) => d.profit < 0)
  const winningDays = winningDayRecords.length
  const losingDays = losingDayRecords.length
  const bestDay = allDayRecords.reduce((best, d) => (d.profit > best.profit ? d : best), allDayRecords[0])
  const worstDay = allDayRecords.reduce((worst, d) => (d.profit < worst.profit ? d : worst), allDayRecords[0])
  const currentBalance = initialBalance + totalPnl

  const totalTradesEffective = trades.reduce((sum, e) => sum + e.tradesEffective, 0)

  const grossWin = winningDayRecords.reduce((sum, d) => sum + d.profit, 0)
  const grossLoss = Math.abs(losingDayRecords.reduce((sum, d) => sum + d.profit, 0))
  const avgWin = winningDays > 0 ? grossWin / winningDays : 0
  const avgLoss = losingDays > 0 ? grossLoss / losingDays : 0
  const winRateFrac = dayRecords.length > 0 ? winningDays / dayRecords.length : 0
  const lossRateFrac = dayRecords.length > 0 ? losingDays / dayRecords.length : 0
  const expectancy = winRateFrac * avgWin - lossRateFrac * avgLoss
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0)

  const winStreaks = computeStreaks(dayRecords, (d) => d.profit > 0)
  const lossStreaks = computeStreaks(dayRecords, (d) => d.profit < 0)

  const bySide = {}
  trades.forEach((e) => {
    const key = e.side || 'misto'
    if (!bySide[key]) bySide[key] = { pnl: 0, days: 0, wins: 0 }
    bySide[key].pnl += e.profit
    bySide[key].days += 1
    if (e.profit > 0) bySide[key].wins += 1
  })
  Object.values(bySide).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byWeekday = {}
  trades.forEach((e) => {
    const key = dayOfWeekLabel(e.date)
    if (!byWeekday[key]) byWeekday[key] = { pnl: 0, days: 0, wins: 0 }
    byWeekday[key].pnl += e.profit
    byWeekday[key].days += 1
    if (e.profit > 0) byWeekday[key].wins += 1
  })

  const byMonth = {}
  trades.forEach((e) => {
    const key = e.date.slice(0, 7)
    if (!byMonth[key]) byMonth[key] = { pnl: 0, days: 0, wins: 0 }
    byMonth[key].pnl += e.profit
    byMonth[key].days += 1
    if (e.profit > 0) byMonth[key].wins += 1
  })

  const byMarket = {}
  trades.forEach((e) => {
    const key = e.market || 'N/D'
    if (!byMarket[key]) byMarket[key] = { pnl: 0, days: 0, wins: 0 }
    byMarket[key].pnl += e.profit
    byMarket[key].days += 1
    if (e.profit > 0) byMarket[key].wins += 1
  })
  Object.values(byMarket).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byOpenSession = {}
  trades.forEach((e) => {
    const key = e.openSession || 'N/D'
    if (!byOpenSession[key]) byOpenSession[key] = { pnl: 0, days: 0, wins: 0 }
    byOpenSession[key].pnl += e.profit
    byOpenSession[key].days += 1
    if (e.profit > 0) byOpenSession[key].wins += 1
  })
  Object.values(byOpenSession).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byNews = {}
  trades.forEach((e) => {
    const key = e.hasNews ? 'Con notizia' : 'Senza notizia'
    if (!byNews[key]) byNews[key] = { pnl: 0, days: 0, wins: 0 }
    byNews[key].pnl += e.profit
    byNews[key].days += 1
    if (e.profit > 0) byNews[key].wins += 1
  })
  Object.values(byNews).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byStrategy = {}
  trades.forEach((e) => {
    const key = e.followedStrategy ? 'Strategia seguita' : 'Strategia non seguita'
    if (!byStrategy[key]) byStrategy[key] = { pnl: 0, days: 0, wins: 0 }
    byStrategy[key].pnl += e.profit
    byStrategy[key].days += 1
    if (e.profit > 0) byStrategy[key].wins += 1
  })
  Object.values(byStrategy).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  // Costo dell'indisciplina: tra i giorni in cui NON hai seguito il piano, quanti avresti
  // comunque preso TP se lo avessi seguito — quantifica il P/L "regalato" per non aver
  // rispettato la strategia, non solo quante volte è successo.
  const offPlan = trades.filter((e) => e.followedStrategy === false)
  const offPlanMissedTP = offPlan.filter((e) => e.wouldHaveHitTP === true)
  const disciplineCost = {
    offPlanCount: offPlan.length,
    missedTPCount: offPlanMissedTP.length,
    missedTPPct: offPlan.length > 0 ? (offPlanMissedTP.length / offPlan.length) * 100 : null,
    missedTPPnl: offPlanMissedTP.reduce((sum, e) => sum + e.profit, 0),
  }

  const byCloseType = {}
  trades.forEach((e) => {
    const key = e.closeType || 'N/D'
    if (!byCloseType[key]) byCloseType[key] = { pnl: 0, days: 0, wins: 0 }
    byCloseType[key].pnl += e.profit
    byCloseType[key].days += 1
    if (e.profit > 0) byCloseType[key].wins += 1
  })
  Object.values(byCloseType).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byGrade = {}
  trades.forEach((e) => {
    const key = e.grade || 'N/D'
    if (!byGrade[key]) byGrade[key] = { pnl: 0, days: 0, wins: 0 }
    byGrade[key].pnl += e.profit
    byGrade[key].days += 1
    if (e.profit > 0) byGrade[key].wins += 1
  })
  Object.values(byGrade).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const withRiskReward = trades.filter((e) => e.riskReward !== null && e.riskReward !== undefined)
  const avgRiskReward = withRiskReward.length > 0
    ? withRiskReward.reduce((sum, e) => sum + e.riskReward, 0) / withRiskReward.length
    : null

  const byEmotionalState = {}
  trades.forEach((e) => {
    const key = e.emotionalState || 'N/D'
    if (!byEmotionalState[key]) byEmotionalState[key] = { pnl: 0, days: 0, wins: 0 }
    byEmotionalState[key].pnl += e.profit
    byEmotionalState[key].days += 1
    if (e.profit > 0) byEmotionalState[key].wins += 1
  })
  Object.values(byEmotionalState).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byTag = {}
  trades.forEach((e) => {
    (e.tags || []).forEach((tag) => {
      if (!byTag[tag]) byTag[tag] = { pnl: 0, days: 0, wins: 0 }
      byTag[tag].pnl += e.profit
      byTag[tag].days += 1
      if (e.profit > 0) byTag[tag].wins += 1
    })
  })
  Object.values(byTag).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const withRiskPct = trades.filter((e) => e.initialRisk)
  const avgRiskPct = withRiskPct.length > 0
    ? withRiskPct.reduce((sum, e) => sum + (e.initialRisk / initialBalance) * 100, 0) / withRiskPct.length
    : null

  const withConfidence = trades.filter((e) => e.confidenceLevel)
  const avgConfidence = withConfidence.length > 0
    ? withConfidence.reduce((sum, e) => sum + e.confidenceLevel, 0) / withConfidence.length
    : null

  const byLotSize = {}
  trades.forEach((e) => {
    if (!e.initialSizeMicro) return
    const key = String(e.initialSizeMicro)
    if (!byLotSize[key]) byLotSize[key] = { pnl: 0, days: 0, wins: 0 }
    byLotSize[key].pnl += e.profit
    byLotSize[key].days += 1
    if (e.profit > 0) byLotSize[key].wins += 1
  })
  Object.values(byLotSize).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byRiskPoints = {}
  trades.forEach((e) => {
    if (!e.riskPoints) return
    const key = String(e.riskPoints)
    if (!byRiskPoints[key]) byRiskPoints[key] = { pnl: 0, days: 0, wins: 0 }
    byRiskPoints[key].pnl += e.profit
    byRiskPoints[key].days += 1
    if (e.profit > 0) byRiskPoints[key].wins += 1
  })
  Object.values(byRiskPoints).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  return {
    totalPnl,
    winRate: winRateFrac * 100,
    daysTraded: dayRecords.length,
    overtradingDaysCount,
    totalDaysTradedAll: allDayRecords.length,
    winningDays,
    losingDays,
    totalTradesOpened: trades.reduce((sum, e) => sum + e.tradesOpened, 0),
    totalTradesEffective,
    bestDay,
    worstDay,
    currentBalance,
    growthPct: (totalPnl / initialBalance) * 100,
    expectancy,
    profitFactor,
    winners: {
      total: winningDays,
      best: winningDayRecords.length ? Math.max(...winningDayRecords.map((d) => d.profit)) : 0,
      average: avgWin,
      avgDuration: avgDuration(winningEntries),
      maxStreak: winStreaks.max,
      avgStreak: winStreaks.avg,
    },
    losers: {
      total: losingDays,
      best: losingDayRecords.length ? Math.max(...losingDayRecords.map((d) => d.profit)) : 0,
      average: avgLoss === 0 ? 0 : -avgLoss,
      avgDuration: avgDuration(losingEntries),
      maxStreak: lossStreaks.max,
      avgStreak: lossStreaks.avg,
    },
    bySide,
    byWeekday,
    byMonth,
    byMarket,
    byOpenSession,
    byNews,
    byStrategy,
    disciplineCost,
    byCloseType,
    byGrade,
    byEmotionalState,
    byTag,
    byLotSize,
    byRiskPoints,
    avgRiskReward,
    avgRiskPct,
    avgConfidence,
    initialBalance,
    modifications: {
      reEntry: modificationStats(trades, (e) => e.reEntry),
      stopWidened: modificationStats(trades, (e) => e.finalRisk && e.initialRisk && e.finalRisk > e.initialRisk),
      lotIncreased: modificationStats(trades, (e) => e.finalSizeMicro && e.initialSizeMicro && e.finalSizeMicro > e.initialSizeMicro),
    },
    avgTradeFrequency: dayRecords.length > 0 ? totalTradesEffective / dayRecords.length : 0,
    payouts: {
      total: withdrawalPayouts.reduce((sum, p) => sum + p.amount, 0),
      count: withdrawalPayouts.length,
      list: [...withdrawalPayouts].sort((a, b) => b.date.localeCompare(a.date)),
    },
  }
}

export function useTradingData() {
  const [accounts, setAccounts] = useState([])
  const [entries, setEntries] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)

  // Idratazione da Supabase al mount. Niente filtro per utente qui: le policy RLS (vedi
  // supabase/schema.sql) restringono già ogni tabella a user_id = auth.uid() lato server.
  useEffect(() => {
    let active = true
    async function loadAll() {
      const [accRes, entRes, payRes] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at', { ascending: true }),
        supabase.from('entries').select('*'),
        supabase.from('payouts').select('*'),
      ])
      if (!active) return
      const firstError = accRes.error || entRes.error || payRes.error
      if (firstError) {
        // eslint-disable-next-line no-console
        console.error('Errore caricamento dati da Supabase:', firstError.message)
        setLoading(false)
        return
      }
      setAccounts(accRes.data.map(accountFromDb))
      setEntries(entRes.data.map(entryFromDb))
      setPayouts(payRes.data.map(payoutFromDb))
      setLoading(false)
    }
    loadAll()
    return () => { active = false }
  }, [])

  async function recordPayout({ accountId, date, amount }) {
    const { data, error } = await supabase
      .from('payouts')
      .insert(payoutToDb({ accountId, date, amount: Number(amount) }))
      .select()
      .single()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore registrazione payout:', error.message)
      return null
    }
    const payout = payoutFromDb(data)
    setPayouts((prev) => [...prev, payout])
    return payout
  }

  // Capitale proprio versato su un conto personale (es. ricarica del conto Live): riusa la
  // tabella payouts con importo negativo, cosi balance/serie/grafico lo trattano automaticamente
  // come un movimento di cassa esterno al trading (l'opposto di un prelievo) senza bisogno di
  // uno schema Supabase dedicato.
  async function addCapital({ accountId, date, amount }) {
    return recordPayout({ accountId, date, amount: -Math.abs(Number(amount)) })
  }

  async function deletePayout(id) {
    const { error } = await supabase.from('payouts').delete().eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore eliminazione payout:', error.message)
      return
    }
    setPayouts((prev) => prev.filter((p) => p.id !== id))
  }

  async function addAccount({ name, type, initialBalance, maxDrawdown, fixedThreshold, thresholdValue }) {
    const payload = accountToDb({
      name,
      type,
      initialBalance: Number(initialBalance),
      maxDrawdown: fixedThreshold ? 0 : (maxDrawdown ? Number(maxDrawdown) : 0),
      fixedThreshold: !!fixedThreshold,
      thresholdValue: fixedThreshold ? thresholdValue : null,
      color: SAFE_ACCOUNT_COLORS[accounts.length % SAFE_ACCOUNT_COLORS.length],
      active: true,
    })
    const { data, error } = await supabase.from('accounts').insert(payload).select().single()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore creazione conto:', error.message)
      return null
    }
    const account = accountFromDb(data)
    setAccounts((prev) => [...prev, account])
    return account
  }

  async function deleteAccount(id) {
    // on delete cascade lato database elimina già entries/payout collegati; qui aggiorniamo
    // solo lo stato locale in memoria per riflettere subito la stessa cosa in UI.
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore eliminazione conto:', error.message)
      return
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    setEntries((prev) => prev.filter((e) => e.accountId !== id))
    setPayouts((prev) => prev.filter((p) => p.accountId !== id))
  }

  async function toggleAccountActive(id) {
    const account = accounts.find((a) => a.id === id)
    if (!account) return
    const { error } = await supabase.from('accounts').update({ active: !account.active }).eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore aggiornamento conto:', error.message)
      return
    }
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))
  }

  async function updateAccountTarget(id, targetProfit) {
    const value = targetProfit ? Number(targetProfit) : null
    const { error } = await supabase.from('accounts').update({ target_profit: value }).eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore aggiornamento traguardo:', error.message)
      return
    }
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, targetProfit: value } : a)))
  }

  // Trailing drawdown threshold: rises with new balance highs (high water mark - maxDrawdown),
  // never falls, and locks permanently once it reaches the account's initial balance.
  // Conti CFD con "threshold fisso" saltano tutta questa logica: il floor è un numero fisso
  // scelto dall'utente, non insegue mai il saldo che cresce (a differenza delle valutazioni
  // prop firm, dove il floor sale col massimo storico raggiunto).
  function getThreshold(accountId) {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return null

    if (account.fixedThreshold) {
      if (account.thresholdValue === null || account.thresholdValue === undefined) return null
      const currentBalance = getAccountBalance(accountId)
      // thresholdValue è il drawdown massimo consentito ($), non un saldo assoluto:
      // la soglia reale è il saldo iniziale meno quel drawdown.
      const floor = account.initialBalance - account.thresholdValue
      return {
        threshold: floor,
        locked: false,
        fixed: true,
        breached: currentBalance <= floor,
      }
    }

    if (!account.maxDrawdown) return null

    const series = getAccountSeries(accountId)
    let highWaterMark = account.initialBalance
    let threshold = account.initialBalance - account.maxDrawdown
    let locked = false

    series.slice(1).forEach((point) => {
      if (locked) return
      if (point.balance > highWaterMark) {
        highWaterMark = point.balance
        const candidate = highWaterMark - account.maxDrawdown
        if (candidate >= account.initialBalance) {
          threshold = account.initialBalance
          locked = true
        } else {
          threshold = candidate
        }
      }
    })

    const currentBalance = getAccountBalance(accountId)
    return {
      threshold,
      locked,
      breached: currentBalance <= threshold,
    }
  }

  // Insert condiviso: manda le righe a Supabase come nuove entry (un conto può avere più trade
  // distinti nello stesso giorno, ognuno una riga a sé — niente upsert-by-date, altrimenti un
  // secondo trade sovrascriverebbe silenziosamente il primo) e fonde il risultato nello stato locale.
  async function insertEntries(entryObjects) {
    const rows = entryObjects.map(entryToDb)
    const { data, error } = await supabase.from('entries').insert(rows).select()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore salvataggio giornata:', error.message)
      // Prima veniva solo loggato in console: un salvataggio fallito (es. colonna non ancora
      // migrata sul database) sembrava "non succede niente" invece di un errore vero. Ora
      // rilanciamo, così DayEntryForm/QuickEntryForm possono mostrare un messaggio all'utente.
      throw new Error(error.message)
    }
    const mapped = data.map(entryFromDb)
    setEntries((prev) => {
      let next = [...prev]
      mapped.forEach((entry) => {
        const idx = next.findIndex((e) => e.id === entry.id)
        if (idx >= 0) next[idx] = entry
        else next.push(entry)
      })
      return next
    })
    return mapped
  }

  // Costruisce l'oggetto entry (camelCase) per un conto a partire dai campi del form Journal
  // trade. Condiviso tra saveDayEntry (crea/upsert, uno o più conti) e updateEntry (modifica
  // in place una singola riga esistente).
  function buildEntryFields({
    date, accountId, profit, tradesOpened, tradesEffective, side,
    market, initialSizeMicro, finalSizeMicro, initialRisk, finalRisk, reEntry,
    hasNews, openSession, closeSession, entryTime, exitTime, followedStrategy, wouldHaveHitTP,
    riskReward, outcome, closeType, grade,
    emotionalState, confidenceLevel, mistake, whatWentWell, lesson, tags,
    riskPoints, resultPoints, chartUrl,
  }) {
    return {
      date,
      accountId,
      profit: Number(profit),
      tradesOpened: Number(tradesOpened) || 0,
      tradesEffective: Number(tradesEffective) || 0,
      side: side || 'misto',
      durationMinutes: computeDurationMinutes(entryTime, exitTime),
      entryTime: entryTime || null,
      exitTime: exitTime || null,
      market: market || null,
      initialSizeMicro: initialSizeMicro ? Number(initialSizeMicro) : null,
      finalSizeMicro: finalSizeMicro ? Number(finalSizeMicro) : (initialSizeMicro ? Number(initialSizeMicro) : null),
      initialRisk: initialRisk ? Number(initialRisk) : null,
      finalRisk: finalRisk ? Number(finalRisk) : (initialRisk ? Number(initialRisk) : null),
      reEntry: !!reEntry,
      hasNews: !!hasNews,
      openSession: openSession || null,
      closeSession: closeSession || openSession || null,
      followedStrategy: followedStrategy !== undefined ? !!followedStrategy : true,
      wouldHaveHitTP: followedStrategy === false ? !!wouldHaveHitTP : null,
      riskReward: riskReward ? Number(riskReward) : null,
      outcome: outcome || null,
      closeType: closeType || null,
      grade: grade || null,
      emotionalState: emotionalState || null,
      confidenceLevel: confidenceLevel ? Number(confidenceLevel) : null,
      mistake: mistake || null,
      whatWentWell: whatWentWell || null,
      lesson: lesson || null,
      tags: parseTags(tags),
      riskPoints: riskPoints ? Number(riskPoints) : null,
      resultPoints: resultPoints ? Number(resultPoints) : null,
      chartUrl: chartUrl || null,
    }
  }

  // Upserts one entry per selected account for the given date.
  async function saveDayEntry({ date, accountIds, ...fields }) {
    const entryObjects = accountIds.map((accountId) => buildEntryFields({ date, accountId, ...fields }))
    await insertEntries(entryObjects)
  }

  // Modifica in place una entry esistente (update by id, non upsert by account_id+date): a
  // differenza di saveDayEntry, qui la entry è già nota e va aggiornata anche se cambiano
  // data o conto, non ricreata come nuova riga.
  // Il modal di modifica espone solo i campi del Journal trade standard, quindi NON deve mai
  // toccare i campi del flusso overtrading (overtrading_day, data_quality, ecc.): entryToDb
  // li valorizzerebbe con dei default (es. overtrading_day: false) cancellando il flag su
  // entry create con saveOvertradingDay/importCsvEntries.
  async function updateEntry(id, { date, accountIds, ...fields }) {
    const row = entryToDb(buildEntryFields({ date, accountId: accountIds[0], ...fields }))
    delete row.overtrading_day
    delete row.estimated_trade_count
    delete row.lost_control_at_trade
    delete row.main_trigger
    delete row.data_quality
    delete row.quick_note
    delete row.tomorrow_correction
    const { data, error } = await supabase.from('entries').update(row).eq('id', id).select()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore modifica entry:', error.message)
      throw new Error(error.message)
    }
    const updated = entryFromDb(data[0])
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)))
    return updated
  }

  // Flusso rapido "emergency mode" per le giornate di overtrading: salva il danno grezzo
  // (P&L reale, stima trade, trigger, note) senza pretendere di ricostruire ogni singolo trade.
  // L'entry risultante è marcata dataQuality:'low' e overtradingDay:true, cosa che
  // computeStats() usa per escluderla dalle statistiche tecniche pur mantenendola nel saldo reale.
  async function saveOvertradingDay({
    date, accountIds, estimatedTradeCount, dailyPnL, lostControlAtTrade,
    mainTrigger, quickNote, tomorrowCorrection,
  }) {
    const entryObjects = accountIds.map((accountId) => ({
      date,
      accountId,
      profit: Number(dailyPnL) || 0,
      tradesOpened: null,
      tradesEffective: Number(estimatedTradeCount) || 0,
      side: 'misto',
      durationMinutes: null,
      entryTime: null,
      exitTime: null,
      market: null,
      initialSizeMicro: null,
      finalSizeMicro: null,
      initialRisk: null,
      finalRisk: null,
      reEntry: false,
      hasNews: false,
      openSession: null,
      closeSession: null,
      followedStrategy: false,
      riskReward: null,
      outcome: null,
      closeType: null,
      grade: null,
      emotionalState: null,
      confidenceLevel: null,
      mistake: null,
      whatWentWell: null,
      lesson: null,
      tags: [],
      riskPoints: null,
      resultPoints: null,
      overtradingDay: true,
      estimatedTradeCount: estimatedTradeCount ? Number(estimatedTradeCount) : null,
      lostControlAtTrade: lostControlAtTrade ? Number(lostControlAtTrade) : null,
      mainTrigger: mainTrigger || null,
      dataQuality: 'low',
      quickNote: quickNote || null,
      tomorrowCorrection: tomorrowCorrection || null,
    }))
    await insertEntries(entryObjects)
  }

  // Imports a CSV trade history export for an account, aggregating same-day trades into
  // one entry each (matching the app's per-day model). Fields not present in the CSV
  // (session, emotional state, grade, etc.) are simply left empty on the created entries.
  async function importCsvEntries(accountId, csvText) {
    const { days, skipped, totalRows } = parseCsvToDailyEntries(csvText)
    const entryObjects = days.map((d) => ({
      date: d.date,
      accountId,
      profit: d.profit,
      tradesOpened: d.tradesOpened,
      tradesEffective: d.tradesEffective,
      side: d.side || 'misto',
      durationMinutes: null,
      entryTime: null,
      exitTime: null,
      market: d.market || null,
      initialSizeMicro: null,
      finalSizeMicro: null,
      initialRisk: null,
      finalRisk: null,
      reEntry: false,
      hasNews: false,
      openSession: null,
      closeSession: null,
      followedStrategy: true,
      riskReward: null,
      outcome: null,
      closeType: null,
      grade: null,
      emotionalState: null,
      confidenceLevel: null,
      mistake: null,
      whatWentWell: null,
      lesson: null,
      tags: [],
      riskPoints: null,
      resultPoints: null,
    }))
    await insertEntries(entryObjects)
    return { importedDays: days.length, skipped, totalRows }
  }

  async function deleteEntry(id) {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore eliminazione entry:', error.message)
      return
    }
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function getAccountBalance(accountId) {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return 0
    const totalProfit = entries
      .filter((e) => e.accountId === accountId)
      .reduce((sum, e) => sum + e.profit, 0)
    const totalPayouts = payouts
      .filter((p) => p.accountId === accountId)
      .reduce((sum, p) => sum + p.amount, 0)
    return account.initialBalance + totalProfit - totalPayouts
  }

  // Merges trading entries and payout withdrawals into one chronological balance curve.
  // Each point is tagged isPayout so the chart can render withdrawal dips differently from trading losses.
  function getAccountSeries(accountId) {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return []
    const events = [
      ...entries.filter((e) => e.accountId === accountId).map((e) => ({ date: e.date, delta: e.profit, isPayout: false })),
      ...payouts.filter((p) => p.accountId === accountId).map((p) => ({ date: p.date, delta: -p.amount, isPayout: true, isDeposit: p.amount < 0 })),
    ].sort((a, b) => a.date.localeCompare(b.date))

    let running = account.initialBalance
    // Il punto di partenza è la data di creazione della riga account, TRANNE quando esistono
    // eventi importati con data storica precedente (es. "Importa CSV conto passato"): in quel
    // caso il grafico deve partire dalla data del primo evento reale, altrimenti il primo punto
    // (oggi) risulterebbe più recente dei trade che lo seguono, e sull'asse X numerico del
    // grafico (vedi EquityCharts.jsx) la linea salterebbe indietro nel tempo creando un
    // artefatto visivo invece di una curva pulita.
    const createdDate = account.createdAt.slice(0, 10)
    const startDate = events.length > 0 && events[0].date < createdDate ? events[0].date : createdDate
    const points = [{ date: startDate, balance: running, isPayout: false, isDeposit: false }]
    events.forEach((e) => {
      running += e.delta
      points.push({ date: e.date, balance: running, isPayout: e.isPayout, isDeposit: e.isDeposit })
    })
    return points
  }

  function getAnalytics(accountId) {
    const account = accounts.find((a) => a.id === accountId)
    const accountEntries = entries.filter((e) => e.accountId === accountId)
    const accountPayouts = payouts.filter((p) => p.accountId === accountId)
    return computeStats(accountEntries, account ? account.initialBalance : 0, accountPayouts)
  }

  // Aggregates stats across multiple accounts (e.g. all active accounts) into one summary.
  function getSummaryAnalytics(accountIds) {
    const relevantAccounts = accounts.filter((a) => accountIds.includes(a.id))
    const totalInitialBalance = relevantAccounts.reduce((sum, a) => sum + a.initialBalance, 0)
    const groupEntries = entries.filter((e) => accountIds.includes(e.accountId))
    const groupPayouts = payouts.filter((p) => accountIds.includes(p.accountId))
    return {
      ...computeStats(groupEntries, totalInitialBalance, groupPayouts),
      accountCount: relevantAccounts.length,
    }
  }

  // Metriche dedicate alle giornate di overtrading: quanto costano, da dove partono di solito,
  // qual è il trigger più comune, e come si confrontano con i giorni "normali" dello stesso gruppo.
  function getOvertradingAnalytics(accountIds) {
    const groupEntries = entries.filter((e) => accountIds.includes(e.accountId))
    const overtradingEntries = groupEntries.filter((e) => e.overtradingDay)
    const normalEntries = groupEntries.filter((e) => !e.overtradingDay)

    const count = overtradingEntries.length
    const totalPnl = overtradingEntries.reduce((sum, e) => sum + e.profit, 0)
    const avgPnl = count > 0 ? totalPnl / count : 0

    const triggerCounts = {}
    overtradingEntries.forEach((e) => {
      const t = e.mainTrigger || 'Non specificato'
      triggerCounts[t] = (triggerCounts[t] || 0) + 1
    })
    const mostFrequentTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    const lostControlValues = overtradingEntries
      .filter((e) => e.lostControlAtTrade)
      .map((e) => e.lostControlAtTrade)
    const avgLostControlAtTrade = lostControlValues.length > 0
      ? lostControlValues.reduce((sum, v) => sum + v, 0) / lostControlValues.length
      : null

    const totalDays = groupEntries.length
    const pctDaysRuined = totalDays > 0 ? (count / totalDays) * 100 : 0
    const normalAvgPnl = normalEntries.length > 0
      ? normalEntries.reduce((sum, e) => sum + e.profit, 0) / normalEntries.length
      : 0

    return {
      count,
      totalPnl,
      avgPnl,
      triggerCounts,
      mostFrequentTrigger,
      avgLostControlAtTrade,
      pctDaysRuined,
      normalAvgPnl,
      normalDaysCount: normalEntries.length,
      list: [...overtradingEntries].sort((a, b) => b.date.localeCompare(a.date)),
    }
  }

  // Misura il miglioramento comportamentale (non il P&L): streak di disciplina, % di
  // regole rispettate, confronto ultimi 30gg vs 30gg precedenti, e uno score 0-100.
  // Come i punteggi di difficoltà del Prop Firm Finder, è una stima euristica nostra
  // costruita sui segnali che già registriamo (reEntry, SL spostato, lottaggio aumentato,
  // piano seguito), non un dato "ufficiale".
  function getBehaviorProgress(accountIds) {
    const groupEntries = entries.filter((e) => accountIds.includes(e.accountId))
    const today = todayStr()
    const last30Start = addDays(today, -29)
    const prev30Start = addDays(today, -59)
    const prev30End = addDays(today, -30)

    const last30 = groupEntries.filter((e) => e.date >= last30Start && e.date <= today)
    const prev30 = groupEntries.filter((e) => e.date >= prev30Start && e.date <= prev30End)

    // Aggrega per giorno (non per entry) così un giorno con più conti non viene contato più volte.
    const byDate = {}
    groupEntries.forEach((e) => {
      if (!byDate[e.date]) byDate[e.date] = { overtrading: false, lotIncreased: false, slWidened: false }
      if (e.overtradingDay) byDate[e.date].overtrading = true
      if (e.finalSizeMicro && e.initialSizeMicro && e.finalSizeMicro > e.initialSizeMicro) byDate[e.date].lotIncreased = true
      if (e.finalRisk && e.initialRisk && e.finalRisk > e.initialRisk) byDate[e.date].slWidened = true
    })
    const datesDesc = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

    function streakWhile(predicate) {
      let streak = 0
      for (const d of datesDesc) {
        if (!predicate(byDate[d])) break
        streak++
      }
      return streak
    }
    const noOvertradingStreak = streakWhile((d) => !d.overtrading)
    const riskRespectedStreak = streakWhile((d) => !d.lotIncreased && !d.slWidened)

    const slEligible = groupEntries.filter((e) => e.initialRisk)
    const slRespectedPct = slEligible.length > 0
      ? (slEligible.filter((e) => !(e.finalRisk && e.finalRisk > e.initialRisk)).length / slEligible.length) * 100
      : null

    // Se la finestra precedente aveva 0 episodi, una % di riduzione non è calcolabile in modo
    // sensato in nessuna direzione (sia se restano 0 sia se ne compaiono di nuovi, il che
    // sarebbe un peggioramento, non una "riduzione dello 0%"): meglio "—" che un numero fuorviante.
    const revengeLast30 = last30.filter((e) => e.reEntry).length
    const revengePrev30 = prev30.filter((e) => e.reEntry).length
    const revengeReductionPct = revengePrev30 > 0
      ? ((revengePrev30 - revengeLast30) / revengePrev30) * 100
      : null

    const overlotLast30 = last30.filter((e) => e.finalSizeMicro && e.initialSizeMicro && e.finalSizeMicro > e.initialSizeMicro).length
    const overlotPrev30 = prev30.filter((e) => e.finalSizeMicro && e.initialSizeMicro && e.finalSizeMicro > e.initialSizeMicro).length
    const overlotReductionPct = overlotPrev30 > 0
      ? ((overlotPrev30 - overlotLast30) / overlotPrev30) * 100
      : null

    const planLast30Pct = last30.length > 0 ? (last30.filter((e) => e.followedStrategy).length / last30.length) * 100 : null
    const planPrev30Pct = prev30.length > 0 ? (prev30.filter((e) => e.followedStrategy).length / prev30.length) * 100 : null

    const gradeEligible = groupEntries.filter((e) => e.grade)
    const executionQualityPct = gradeEligible.length > 0
      ? (gradeEligible.filter((e) => e.grade === 'A' || e.grade === 'B').length / gradeEligible.length) * 100
      : null

    const pnlLast30 = last30.reduce((sum, e) => sum + e.profit, 0)
    const pnlPrev30 = prev30.reduce((sum, e) => sum + e.profit, 0)

    // Score di disciplina: media pesata delle componenti disponibili (quelle senza dati
    // abbastanza non entrano nel calcolo, invece di penalizzare artificialmente lo score).
    const overtradingDaysLast30 = Object.entries(byDate).filter(([d]) => d >= last30Start && d <= today && byDate[d].overtrading).length
    const daysInWindow = Object.keys(byDate).filter((d) => d >= last30Start && d <= today).length
    const noOvertradingScore = daysInWindow > 0 ? ((daysInWindow - overtradingDaysLast30) / daysInWindow) * 100 : null

    const components = [slRespectedPct, planLast30Pct, noOvertradingScore, executionQualityPct].filter((v) => v !== null)
    const disciplineScore = components.length > 0
      ? Math.round(components.reduce((sum, v) => sum + v, 0) / components.length)
      : null

    // Un giorno per riga degli ultimi 30, per il mini-grafico a barre in Behavior Progress:
    // 'clean' (niente overtrading/lotto aumentato/SL spostato), 'violation', o 'empty' (nessun dato).
    const dailyTimeline = []
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i)
      const day = byDate[d]
      let state = 'empty'
      if (day) state = (day.overtrading || day.lotIncreased || day.slWidened) ? 'violation' : 'clean'
      dailyTimeline.push({ date: d, state })
    }

    return {
      dailyTimeline,
      noOvertradingStreak,
      riskRespectedStreak,
      slRespectedPct,
      revengeReductionPct,
      revengeLast30,
      revengePrev30,
      overlotReductionPct,
      overlotLast30,
      overlotPrev30,
      planLast30Pct,
      planPrev30Pct,
      executionQualityPct,
      disciplineScore,
      pnlLast30,
      pnlPrev30,
    }
  }

  // Groups entries into Mon-Sun weeks and computes stats per week, most recent first.
  function getWeeklyAnalytics(accountIds) {
    const relevantAccounts = accounts.filter((a) => accountIds.includes(a.id))
    const totalInitialBalance = relevantAccounts.reduce((sum, a) => sum + a.initialBalance, 0)
    const groupEntries = entries.filter((e) => accountIds.includes(e.accountId))
    const groupPayouts = payouts.filter((p) => accountIds.includes(p.accountId))

    const byWeek = {}
    groupEntries.forEach((e) => {
      const monday = getMonday(e.date)
      if (!byWeek[monday]) byWeek[monday] = { entries: [], payouts: [] }
      byWeek[monday].entries.push(e)
    })
    groupPayouts.forEach((p) => {
      const monday = getMonday(p.date)
      if (!byWeek[monday]) byWeek[monday] = { entries: [], payouts: [] }
      byWeek[monday].payouts.push(p)
    })

    return Object.entries(byWeek)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([weekStart, week]) => ({
        weekStart,
        weekEnd: addDays(weekStart, 6),
        stats: computeStats(week.entries, totalInitialBalance, week.payouts),
      }))
  }

  function getMonthStart(dateStr) {
    return `${dateStr.slice(0, 7)}-01`
  }

  function getQuarterStart(dateStr) {
    const [y, m] = dateStr.split('-').map(Number)
    const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1
    return `${y}-${String(qStartMonth).padStart(2, '0')}-01`
  }

  // Snapshot pensato per la classifica Friends: saldo aggregato, numero conti, % e $ di
  // profitto giornaliero/settimanale di lunedì-venerdì della settimana corrente (weekend non
  // tradato, quindi 5 celle), più i totali del mese e del trimestre in corso per le classifiche
  // mensile/trimestrale. La % è sempre calcolata sul saldo iniziale aggregato, come growthPct.
  function getFriendsSnapshot(accountIds) {
    const relevantAccounts = accounts.filter((a) => accountIds.includes(a.id))
    const totalInitialBalance = relevantAccounts.reduce((sum, a) => sum + a.initialBalance, 0)
    const groupEntries = entries.filter((e) => accountIds.includes(e.accountId))
    const groupPayouts = payouts.filter((p) => accountIds.includes(p.accountId))
    const balance = totalInitialBalance
      + groupEntries.reduce((sum, e) => sum + e.profit, 0)
      - groupPayouts.reduce((sum, p) => sum + p.amount, 0)

    const today = todayStr()
    const monday = getMonday(today)
    const byDate = {}
    groupEntries.forEach((e) => {
      byDate[e.date] = (byDate[e.date] || 0) + e.profit
    })

    const dailyPct = [0, 1, 2, 3, 4].map((i) => {
      const date = addDays(monday, i)
      const dayProfit = byDate[date]
      return {
        date,
        pct: totalInitialBalance > 0 && dayProfit !== undefined ? (dayProfit / totalInitialBalance) * 100 : null,
      }
    })
    const weeklyProfit = dailyPct.reduce((sum, d) => sum + (byDate[d.date] || 0), 0)

    const monthStart = getMonthStart(today)
    const quarterStart = getQuarterStart(today)
    const monthlyProfit = groupEntries.filter((e) => e.date >= monthStart).reduce((sum, e) => sum + e.profit, 0)
    const quarterlyProfit = groupEntries.filter((e) => e.date >= quarterStart).reduce((sum, e) => sum + e.profit, 0)
    const monthlyPct = totalInitialBalance > 0 ? (monthlyProfit / totalInitialBalance) * 100 : null
    const quarterlyPct = totalInitialBalance > 0 ? (quarterlyProfit / totalInitialBalance) * 100 : null

    return {
      balance,
      accountCount: relevantAccounts.length,
      dailyPct,
      weeklyProfit,
      monthlyProfit,
      monthlyPct,
      quarterlyProfit,
      quarterlyPct,
    }
  }

  function getEntriesForDate(date) {
    return entries.filter((e) => e.date === date)
  }

  function exportData() {
    return JSON.stringify({ accounts, entries, payouts, exportedAt: new Date().toISOString() }, null, 2)
  }

  // Importa un backup esportato in precedenza (o i dati di localStorage di prima della
  // migrazione a Supabase) DENTRO l'account cloud dell'utente loggato. A differenza della
  // vecchia versione (che sovrascriveva tutto in localStorage), qui si AGGIUNGE: i conti
  // vengono ricreati con nuovi id assegnati da Postgres, ed entries/payout vengono riagganciati
  // ai nuovi id conto (i vecchi id locali non hanno alcun significato lato database).
  async function importData(json) {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.entries)) {
      throw new Error('File di backup non valido')
    }

    const accountIdMap = {}
    const newAccounts = []
    for (const a of parsed.accounts) {
      const { data, error } = await supabase.from('accounts').insert(accountToDb(a)).select().single()
      if (error) throw error
      accountIdMap[a.id] = data.id
      newAccounts.push(accountFromDb(data))
    }

    const entryRows = parsed.entries
      .filter((e) => accountIdMap[e.accountId])
      .map((e) => entryToDb({ ...e, accountId: accountIdMap[e.accountId] }))
    let newEntries = []
    if (entryRows.length > 0) {
      const { data, error } = await supabase.from('entries').insert(entryRows).select()
      if (error) throw error
      newEntries = data.map(entryFromDb)
    }

    const payoutRows = (parsed.payouts || [])
      .filter((p) => accountIdMap[p.accountId])
      .map((p) => payoutToDb({ ...p, accountId: accountIdMap[p.accountId] }))
    let newPayouts = []
    if (payoutRows.length > 0) {
      const { data, error } = await supabase.from('payouts').insert(payoutRows).select()
      if (error) throw error
      newPayouts = data.map(payoutFromDb)
    }

    setAccounts((prev) => [...prev, ...newAccounts])
    setEntries((prev) => [...prev, ...newEntries])
    setPayouts((prev) => [...prev, ...newPayouts])
  }

  // Cancella TUTTI i conti dell'utente loggato (RLS limita già la delete alla sua sola riga:
  // ".not('id','is',null)" è solo il filtro "sempre vero" che PostgREST richiede per una delete
  // senza altre condizioni). Entries e payout seguono a cascata via FK, non vanno cancellati a parte.
  async function deleteAllAccounts() {
    const { error } = await supabase.from('accounts').delete().not('id', 'is', null)
    if (error) throw error
    setAccounts([])
    setEntries([])
    setPayouts([])
  }

  return {
    accounts,
    entries,
    payouts,
    loading,
    addAccount,
    deleteAccount,
    toggleAccountActive,
    updateAccountTarget,
    saveDayEntry,
    updateEntry,
    saveOvertradingDay,
    deleteEntry,
    importCsvEntries,
    recordPayout,
    deletePayout,
    addCapital,
    getAccountBalance,
    getAccountSeries,
    getAnalytics,
    getSummaryAnalytics,
    getOvertradingAnalytics,
    getBehaviorProgress,
    getWeeklyAnalytics,
    getFriendsSnapshot,
    getEntriesForDate,
    getThreshold,
    exportData,
    importData,
    deleteAllAccounts,
  }
}
