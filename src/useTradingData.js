import { useEffect, useState } from 'react'
import { parseCsvToDailyEntries } from './csvImport'

const ACCOUNTS_KEY = 'trading-accounts:accounts'
const ENTRIES_KEY = 'trading-accounts:entries'
const PAYOUTS_KEY = 'trading-accounts:payouts'

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
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

function getMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
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
  const sorted = [...groupEntries].sort((a, b) => a.date.localeCompare(b.date))

  const empty = {
    totalPnl: 0,
    winRate: 0,
    daysTraded: 0,
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

  if (sorted.length === 0 || !initialBalance) {
    if (groupPayouts.length > 0) {
      empty.payouts = {
        total: groupPayouts.reduce((sum, p) => sum + p.amount, 0),
        count: groupPayouts.length,
        list: [...groupPayouts].sort((a, b) => b.date.localeCompare(a.date)),
      }
    }
    return empty
  }

  const totalPnl = sorted.reduce((sum, e) => sum + e.profit, 0)
  const winningEntries = sorted.filter((e) => e.profit > 0)
  const losingEntries = sorted.filter((e) => e.profit < 0)
  const winningDays = winningEntries.length
  const losingDays = losingEntries.length
  const bestDay = sorted.reduce((best, e) => (e.profit > best.profit ? e : best), sorted[0])
  const worstDay = sorted.reduce((worst, e) => (e.profit < worst.profit ? e : worst), sorted[0])
  const currentBalance = initialBalance + totalPnl

  const totalTradesEffective = sorted.reduce((sum, e) => sum + e.tradesEffective, 0)

  const grossWin = winningEntries.reduce((sum, e) => sum + e.profit, 0)
  const grossLoss = Math.abs(losingEntries.reduce((sum, e) => sum + e.profit, 0))
  const avgWin = winningDays > 0 ? grossWin / winningDays : 0
  const avgLoss = losingDays > 0 ? grossLoss / losingDays : 0
  const winRateFrac = winningDays / sorted.length
  const lossRateFrac = losingDays / sorted.length
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
  const [accounts, setAccounts] = useState(() =>
    load(ACCOUNTS_KEY).map((a, i) => ({
      ...a,
      color: a.color || ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
      active: a.active === undefined ? true : a.active,
      maxDrawdown: a.maxDrawdown || 0,
    }))
  )
  const [entries, setEntries] = useState(() => load(ENTRIES_KEY))
  const [payouts, setPayouts] = useState(() => load(PAYOUTS_KEY))

  useEffect(() => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  }, [accounts])

  useEffect(() => {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
  }, [entries])

  useEffect(() => {
    localStorage.setItem(PAYOUTS_KEY, JSON.stringify(payouts))
  }, [payouts])

  function recordPayout({ accountId, date, amount }) {
    const payout = {
      id: crypto.randomUUID(),
      accountId,
      date,
      amount: Number(amount),
      createdAt: new Date().toISOString(),
    }
    setPayouts((prev) => [...prev, payout])
    return payout
  }

  function deletePayout(id) {
    setPayouts((prev) => prev.filter((p) => p.id !== id))
  }

  function addAccount({ name, type, initialBalance, maxDrawdown }) {
    const account = {
      id: crypto.randomUUID(),
      name,
      type,
      initialBalance: Number(initialBalance),
      maxDrawdown: maxDrawdown ? Number(maxDrawdown) : 0,
      color: ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length],
      active: true,
      createdAt: new Date().toISOString(),
    }
    setAccounts((prev) => [...prev, account])
    return account
  }

  function deleteAccount(id) {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    setEntries((prev) => prev.filter((e) => e.accountId !== id))
    setPayouts((prev) => prev.filter((p) => p.accountId !== id))
  }

  function toggleAccountActive(id) {
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

  // Upserts one entry per selected account for the given date.
  function saveDayEntry({
    date, accountIds, profit, tradesOpened, tradesEffective, side,
    market, initialSizeMicro, finalSizeMicro, initialRisk, finalRisk, reEntry,
    hasNews, openSession, closeSession, entryTime, exitTime, followedStrategy,
    riskReward, closeType, grade,
    emotionalState, confidenceLevel, mistake, whatWentWell, lesson, tags,
    riskPoints, resultPoints,
  }) {
    setEntries((prev) => {
      let next = [...prev]
      accountIds.forEach((accountId) => {
        const existingIndex = next.findIndex((e) => e.date === date && e.accountId === accountId)
        const entry = {
          id: existingIndex >= 0 ? next[existingIndex].id : crypto.randomUUID(),
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
        }
        if (existingIndex >= 0) {
          next[existingIndex] = entry
        } else {
          next.push(entry)
        }
      })
      return next
    })
  }

  // Imports a CSV trade history export for an account, aggregating same-day trades into
  // one entry each (matching the app's per-day model). Fields not present in the CSV
  // (session, emotional state, grade, etc.) are simply left empty on the created entries.
  function importCsvEntries(accountId, csvText) {
    const { days, skipped, totalRows } = parseCsvToDailyEntries(csvText)

    setEntries((prev) => {
      let next = [...prev]
      days.forEach((d) => {
        const existingIndex = next.findIndex((e) => e.date === d.date && e.accountId === accountId)
        const entry = {
          id: existingIndex >= 0 ? next[existingIndex].id : crypto.randomUUID(),
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
        }
        if (existingIndex >= 0) {
          next[existingIndex] = entry
        } else {
          next.push(entry)
        }
      })
      return next
    })

    return { importedDays: days.length, skipped, totalRows }
  }

  function deleteEntry(id) {
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

  function getEntriesForDate(date) {
    return entries.filter((e) => e.date === date)
  }

  function exportData() {
    return JSON.stringify({ accounts, entries, payouts, exportedAt: new Date().toISOString() }, null, 2)
  }

  // Overwrites all accounts and entries with the contents of a previously exported backup.
  function importData(json) {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.entries)) {
      throw new Error('File di backup non valido')
    }
    setAccounts(parsed.accounts)
    setEntries(parsed.entries)
    setPayouts(Array.isArray(parsed.payouts) ? parsed.payouts : [])
  }

  return {
    accounts,
    entries,
    payouts,
    addAccount,
    deleteAccount,
    toggleAccountActive,
    saveDayEntry,
    deleteEntry,
    importCsvEntries,
    recordPayout,
    deletePayout,
    getAccountBalance,
    getAccountSeries,
    getAnalytics,
    getSummaryAnalytics,
    getWeeklyAnalytics,
    getEntriesForDate,
    getThreshold,
    exportData,
    importData,
  }
}
