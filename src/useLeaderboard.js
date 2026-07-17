import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Legge/scrive SOLO public.leaderboard_stats — la tabella condivisa per la classifica Friends,
// separata da tutte le tabelle private (accounts/entries/payouts/missions non hanno mai RLS
// che le esponga ad altri utenti). Vedi supabase/schema.sql per le policy.
export function useLeaderboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('leaderboard_stats').select('*')
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore caricamento classifica:', error.message)
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function publish({
    userId, username, balance, accountCount, dailyPct, weeklyProfit,
    monthlyProfit, monthlyPct, quarterlyProfit, quarterlyPct,
    disciplineScore, missionsSummary,
  }) {
    const { error } = await supabase.from('leaderboard_stats').upsert({
      user_id: userId,
      username,
      balance,
      account_count: accountCount,
      daily_pct: dailyPct,
      weekly_profit: weeklyProfit,
      monthly_profit: monthlyProfit,
      monthly_pct: monthlyPct,
      quarterly_profit: quarterlyProfit,
      quarterly_pct: quarterlyPct,
      discipline_score: disciplineScore,
      missions_summary: missionsSummary,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore pubblicazione classifica:', error.message)
      return { error }
    }
    load()
    return { error: null }
  }

  // Chiamata quando l'utente cancella tutti i suoi dati: senza questo, la sua riga in classifica
  // resterebbe visibile agli amici con numeri ormai falsi (conti/entry cancellati ma snapshot
  // ancora pubblicato).
  async function remove(userId) {
    const { error } = await supabase.from('leaderboard_stats').delete().eq('user_id', userId)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore rimozione dalla classifica:', error.message)
      return { error }
    }
    setRows((prev) => prev.filter((r) => r.user_id !== userId))
    return { error: null }
  }

  return { rows, loading, publish, remove }
}
