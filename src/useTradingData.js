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

// Shared stats computation used both for a single account and for a multi-account summary.
function computeStats(groupEntries, initialBalance, groupPayouts = []) {
  const allSorted = [...groupEntries].sort((a, b) => a.date.localeCompare(b.date))
  // Le giornate di overtrading pesano sul saldo reale (sono soldi veri, restano in allSorted)
  // ma non devono influenzare le statistiche "di qualità" (win rate, expectancy, breakdown per
  // mercato/sessione/ecc.): per quelle usiamo solo i giorni compilati in modo affidabile.
  const sorted = allSorted.filter((e) => !e.overtradingDay)
  const overtradingDaysCount = allSorted.length - sorted.length

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
    if (groupPayouts.length > 0) {
      empty.payouts = {
        total: groupPayouts.reduce((sum, p) => sum + p.amount, 0),
        count: groupPayouts.length,
        list: [...groupPayouts].sort((a, b) => b.date.localeCompare(a.date)),
      }
    }
    return empty
  }

  const totalPnl = allSorted.reduce((sum, e) => sum + e.profit, 0)
  const winningEntries = sorted.filter((e) => e.profit > 0)
  const losingEntries = sorted.filter((e) => e.profit < 0)
  const winningDays = winningEntries.length
  const losingDays = losingEntries.length
  const bestDay = allSorted.reduce((best, e) => (e.profit > best.profit ? e : best), allSorted[0])
  const worstDay = allSorted.reduce((worst, e) => (e.profit < worst.profit ? e : worst), allSorted[0])
  const currentBalance = initialBalance + totalPnl

  const totalTradesEffective = sorted.reduce((sum, e) => sum + e.tradesEffective, 0)

  const grossWin = winningEntries.reduce((sum, e) => sum + e.profit, 0)
  const grossLoss = Math.abs(losingEntries.reduce((sum, e) => sum + e.profit, 0))
  const avgWin = winningDays > 0 ? grossWin / winningDays : 0
  const avgLoss = losingDays > 0 ? grossLoss / losingDays : 0
  const winRateFrac = sorted.length > 0 ? winningDays / sorted.length : 0
  const lossRateFrac = sorted.length > 0 ? losingDays / sorted.length : 0
  const expectancy = winRateFrac * avgWin - lossRateFrac * avgLoss
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0)

  const winStreaks = computeStreaks(sorted, (e) => e.profit > 0)
  const lossStreaks = computeStreaks(sorted, (e) => e.profit < 0)

  const bySide = {}
  sorted.forEach((e) => {
    const key = e.side || 'misto'
    if (!bySide[key]) bySide[key] = { pnl: 0, days: 0, wins: 0 }
    bySide[key].pnl += e.profit
    bySide[key].days += 1
    if (e.profit > 0) bySide[key].wins += 1
  })
  Object.values(bySide).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byWeekday = {}
  sorted.forEach((e) => {
    const key = dayOfWeekLabel(e.date)
    if (!byWeekday[key]) byWeekday[key] = { pnl: 0, days: 0, wins: 0 }
    byWeekday[key].pnl += e.profit
    byWeekday[key].days += 1
    if (e.profit > 0) byWeekday[key].wins += 1
  })

  const byMonth = {}
  sorted.forEach((e) => {
    const key = e.date.slice(0, 7)
    if (!byMonth[key]) byMonth[key] = { pnl: 0, days: 0, wins: 0 }
    byMonth[key].pnl += e.profit
    byMonth[key].days += 1
    if (e.profit > 0) byMonth[key].wins += 1
  })

  const byMarket = {}
  sorted.forEach((e) => {
    const key = e.market || 'N/D'
    if (!byMarket[key]) byMarket[key] = { pnl: 0, days: 0, wins: 0 }
    byMarket[key].pnl += e.profit
    byMarket[key].days += 1
    if (e.profit > 0) byMarket[key].wins += 1
  })
  Object.values(byMarket).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byOpenSession = {}
  sorted.forEach((e) => {
    const key = e.openSession || 'N/D'
    if (!byOpenSession[key]) byOpenSession[key] = { pnl: 0, days: 0, wins: 0 }
    byOpenSession[key].pnl += e.profit
    byOpenSession[key].days += 1
    if (e.profit > 0) byOpenSession[key].wins += 1
  })
  Object.values(byOpenSession).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byNews = {}
  sorted.forEach((e) => {
    const key = e.hasNews ? 'Con notizia' : 'Senza notizia'
    if (!byNews[key]) byNews[key] = { pnl: 0, days: 0, wins: 0 }
    byNews[key].pnl += e.profit
    byNews[key].days += 1
    if (e.profit > 0) byNews[key].wins += 1
  })
  Object.values(byNews).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byStrategy = {}
  sorted.forEach((e) => {
    const key = e.followedStrategy ? 'Strategia seguita' : 'Strategia non seguita'
    if (!byStrategy[key]) byStrategy[key] = { pnl: 0, days: 0, wins: 0 }
    byStrategy[key].pnl += e.profit
    byStrategy[key].days += 1
    if (e.profit > 0) byStrategy[key].wins += 1
  })
  Object.values(byStrategy).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byCloseType = {}
  sorted.forEach((e) => {
    const key = e.closeType || 'N/D'
    if (!byCloseType[key]) byCloseType[key] = { pnl: 0, days: 0, wins: 0 }
    byCloseType[key].pnl += e.profit
    byCloseType[key].days += 1
    if (e.profit > 0) byCloseType[key].wins += 1
  })
  Object.values(byCloseType).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byGrade = {}
  sorted.forEach((e) => {
    const key = e.grade || 'N/D'
    if (!byGrade[key]) byGrade[key] = { pnl: 0, days: 0, wins: 0 }
    byGrade[key].pnl += e.profit
    byGrade[key].days += 1
    if (e.profit > 0) byGrade[key].wins += 1
  })
  Object.values(byGrade).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const withRiskReward = sorted.filter((e) => e.riskReward !== null && e.riskReward !== undefined)
  const avgRiskReward = withRiskReward.length > 0
    ? withRiskReward.reduce((sum, e) => sum + e.riskReward, 0) / withRiskReward.length
    : null

  const byEmotionalState = {}
  sorted.forEach((e) => {
    const key = e.emotionalState || 'N/D'
    if (!byEmotionalState[key]) byEmotionalState[key] = { pnl: 0, days: 0, wins: 0 }
    byEmotionalState[key].pnl += e.profit
    byEmotionalState[key].days += 1
    if (e.profit > 0) byEmotionalState[key].wins += 1
  })
  Object.values(byEmotionalState).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byTag = {}
  sorted.forEach((e) => {
    (e.tags || []).forEach((tag) => {
      if (!byTag[tag]) byTag[tag] = { pnl: 0, days: 0, wins: 0 }
      byTag[tag].pnl += e.profit
      byTag[tag].days += 1
      if (e.profit > 0) byTag[tag].wins += 1
    })
  })
  Object.values(byTag).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const withRiskPct = sorted.filter((e) => e.initialRisk)
  const avgRiskPct = withRiskPct.length > 0
    ? withRiskPct.reduce((sum, e) => sum + (e.initialRisk / initialBalance) * 100, 0) / withRiskPct.length
    : null

  const withConfidence = sorted.filter((e) => e.confidenceLevel)
  const avgConfidence = withConfidence.length > 0
    ? withConfidence.reduce((sum, e) => sum + e.confidenceLevel, 0) / withConfidence.length
    : null

  const byLotSize = {}
  sorted.forEach((e) => {
    if (!e.initialSizeMicro) return
    const key = String(e.initialSizeMicro)
    if (!byLotSize[key]) byLotSize[key] = { pnl: 0, days: 0, wins: 0 }
    byLotSize[key].pnl += e.profit
    byLotSize[key].days += 1
    if (e.profit > 0) byLotSize[key].wins += 1
  })
  Object.values(byLotSize).forEach((v) => { v.winRate = (v.wins / v.days) * 100 })

  const byRiskPoints = {}
  sorted.forEach((e) => {
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
    daysTraded: sorted.length,
    overtradingDaysCount,
    totalDaysTradedAll: allSorted.length,
    winningDays,
    losingDays,
    totalTradesOpened: sorted.reduce((sum, e) => sum + e.tradesOpened, 0),
    totalTradesEffective,
    bestDay,
    worstDay,
    currentBalance,
    growthPct: (totalPnl / initialBalance) * 100,
    expectancy,
    profitFactor,
    winners: {
      total: winningDays,
      best: winningEntries.length ? Math.max(...winningEntries.map((e) => e.profit)) : 0,
      average: avgWin,
      avgDuration: avgDuration(winningEntries),
      maxStreak: winStreaks.max,
      avgStreak: winStreaks.avg,
    },
    losers: {
      total: losingDays,
      best: losingEntries.length ? Math.max(...losingEntries.map((e) => e.profit)) : 0,
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
      reEntry: modificationStats(sorted, (e) => e.reEntry),
      stopWidened: modificationStats(sorted, (e) => e.finalRisk && e.initialRisk && e.finalRisk > e.initialRisk),
      lotIncreased: modificationStats(sorted, (e) => e.finalSizeMicro && e.initialSizeMicro && e.finalSizeMicro > e.initialSizeMicro),
    },
    avgTradeFrequency: sorted.length > 0 ? totalTradesEffective / sorted.length : 0,
    payouts: {
      total: groupPayouts.reduce((sum, p) => sum + p.amount, 0),
      count: groupPayouts.length,
      list: [...groupPayouts].sort((a, b) => b.date.localeCompare(a.date)),
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

  async function deletePayout(id) {
    const { error } = await supabase.from('payouts').delete().eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore eliminazione payout:', error.message)
      return
    }
    setPayouts((prev) => prev.filter((p) => p.id !== id))
  }

  async function addAccount({ name, type, initialBalance, maxDrawdown }) {
    const payload = accountToDb({
      name,
      type,
      initialBalance: Number(initialBalance),
      maxDrawdown: maxDrawdown ? Number(maxDrawdown) : 0,
      color: ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length],
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

  // Trailing drawdown threshold: rises with new balance highs (high water mark - maxDrawdown),
  // never falls, and locks permanently once it reaches the account's initial balance.
  function getThreshold(accountId) {
    const account = accounts.find((a) => a.id === accountId)
    if (!account || !account.maxDrawdown) return null

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

  // Upsert condiviso: manda le righe a Supabase (on conflict account_id+date aggiorna invece
  // di duplicare, grazie al vincolo unique nello schema) e fonde il risultato nello stato locale.
  async function upsertEntries(entryObjects) {
    const rows = entryObjects.map(entryToDb)
    const { data, error } = await supabase.from('entries').upsert(rows, { onConflict: 'account_id,date' }).select()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore salvataggio giornata:', error.message)
      return []
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

  // Upserts one entry per selected account for the given date.
  async function saveDayEntry({
    date, accountIds, profit, tradesOpened, tradesEffective, side,
    market, initialSizeMicro, finalSizeMicro, initialRisk, finalRisk, reEntry,
    hasNews, openSession, closeSession, entryTime, exitTime, followedStrategy,
    riskReward, outcome, closeType, grade,
    emotionalState, confidenceLevel, mistake, whatWentWell, lesson, tags,
    riskPoints, resultPoints, chartUrl,
  }) {
    const entryObjects = accountIds.map((accountId) => ({
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
    }))
    await upsertEntries(entryObjects)
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
    await upsertEntries(entryObjects)
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
    await upsertEntries(entryObjects)
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
      ...payouts.filter((p) => p.accountId === accountId).map((p) => ({ date: p.date, delta: -p.amount, isPayout: true })),
    ].sort((a, b) => a.date.localeCompare(b.date))

    let running = account.initialBalance
    const points = [{ date: account.createdAt.slice(0, 10), balance: running, isPayout: false }]
    events.forEach((e) => {
      running += e.delta
      points.push({ date: e.date, balance: running, isPayout: e.isPayout })
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

  // Snapshot pensato per la classifica Friends: saldo aggregato, numero conti, % e $ di
  // profitto giornaliero/settimanale di lunedì-venerdì della settimana corrente (weekend non
  // tradato, quindi 5 celle). La % è calcolata sul saldo iniziale aggregato, come growthPct.
  function getFriendsSnapshot(accountIds) {
    const relevantAccounts = accounts.filter((a) => accountIds.includes(a.id))
    const totalInitialBalance = relevantAccounts.reduce((sum, a) => sum + a.initialBalance, 0)
    const groupEntries = entries.filter((e) => accountIds.includes(e.accountId))
    const groupPayouts = payouts.filter((p) => accountIds.includes(p.accountId))
    const balance = totalInitialBalance
      + groupEntries.reduce((sum, e) => sum + e.profit, 0)
      - groupPayouts.reduce((sum, p) => sum + p.amount, 0)

    const monday = getMonday(todayStr())
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

    return { balance, accountCount: relevantAccounts.length, dailyPct, weeklyProfit }
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
      const { data, error } = await supabase.from('entries').upsert(entryRows, { onConflict: 'account_id,date' }).select()
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
    saveDayEntry,
    saveOvertradingDay,
    deleteEntry,
    importCsvEntries,
    recordPayout,
    deletePayout,
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
