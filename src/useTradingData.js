import { useEffect, useState } from 'react'

const ACCOUNTS_KEY = 'trading-accounts:accounts'
const ENTRIES_KEY = 'trading-accounts:entries'

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const BALANCE_PRESETS = [25000, 50000, 100000, 150000]

export function useTradingData() {
  const [accounts, setAccounts] = useState(() => load(ACCOUNTS_KEY))
  const [entries, setEntries] = useState(() => load(ENTRIES_KEY))

  useEffect(() => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  }, [accounts])

  useEffect(() => {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
  }, [entries])

  function addAccount({ name, type, initialBalance }) {
    const account = {
      id: crypto.randomUUID(),
      name,
      type,
      initialBalance: Number(initialBalance),
      createdAt: new Date().toISOString(),
    }
    setAccounts((prev) => [...prev, account])
    return account
  }

  function deleteAccount(id) {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    setEntries((prev) => prev.filter((e) => e.accountId !== id))
  }

  // Upserts one entry per selected account for the given date.
  function saveDayEntry({ date, accountIds, profit, tradesOpened, tradesEffective }) {
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

  function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function getAccountBalance(accountId) {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return 0
    const total = entries
      .filter((e) => e.accountId === accountId)
      .reduce((sum, e) => sum + e.profit, 0)
    return account.initialBalance + total
  }

  function getAccountSeries(accountId) {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return []
    const sorted = entries
      .filter((e) => e.accountId === accountId)
      .sort((a, b) => a.date.localeCompare(b.date))
    let running = account.initialBalance
    const points = [{ date: account.createdAt.slice(0, 10), balance: running }]
    sorted.forEach((e) => {
      running += e.profit
      points.push({ date: e.date, balance: running })
    })
    return points
  }

  function getAnalytics(accountId) {
    const account = accounts.find((a) => a.id === accountId)
    const accountEntries = entries
      .filter((e) => e.accountId === accountId)
      .sort((a, b) => a.date.localeCompare(b.date))

    if (!account || accountEntries.length === 0) {
      return {
        totalPnl: 0,
        winRate: 0,
        daysTraded: 0,
        winningDays: 0,
        losingDays: 0,
        totalTradesOpened: 0,
        totalTradesEffective: 0,
        bestDay: null,
        worstDay: null,
        currentBalance: account ? account.initialBalance : 0,
        growthPct: 0,
      }
    }

    const totalPnl = accountEntries.reduce((sum, e) => sum + e.profit, 0)
    const winningDays = accountEntries.filter((e) => e.profit > 0).length
    const losingDays = accountEntries.filter((e) => e.profit < 0).length
    const bestDay = accountEntries.reduce((best, e) => (e.profit > best.profit ? e : best), accountEntries[0])
    const worstDay = accountEntries.reduce((worst, e) => (e.profit < worst.profit ? e : worst), accountEntries[0])
    const currentBalance = account.initialBalance + totalPnl

    return {
      totalPnl,
      winRate: (winningDays / accountEntries.length) * 100,
      daysTraded: accountEntries.length,
      winningDays,
      losingDays,
      totalTradesOpened: accountEntries.reduce((sum, e) => sum + e.tradesOpened, 0),
      totalTradesEffective: accountEntries.reduce((sum, e) => sum + e.tradesEffective, 0),
      bestDay,
      worstDay,
      currentBalance,
      growthPct: (totalPnl / account.initialBalance) * 100,
    }
  }

  function getEntriesForDate(date) {
    return entries.filter((e) => e.date === date)
  }

  return {
    accounts,
    entries,
    addAccount,
    deleteAccount,
    saveDayEntry,
    deleteEntry,
    getAccountBalance,
    getAccountSeries,
    getAnalytics,
    getEntriesForDate,
  }
}
