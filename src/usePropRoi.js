import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import {
  propPurchaseFromDb, propPurchaseToDb, propPayoutFromDb, propPayoutToDb,
} from './supabaseMappers'

// Dati della pagina "ROI prop": quanto spendi comprando conti/valutazioni dalle prop firm e
// quanto incassi in payout, aggregato per nome della firm (non per singolo conto in accounts,
// che può essere già stato eliminato mentre lo storico spesa/incasso deve restare).
export function usePropRoi() {
  const [purchases, setPurchases] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadAll() {
      const [purRes, payRes] = await Promise.all([
        supabase.from('prop_purchases').select('*').order('date', { ascending: false }),
        supabase.from('prop_payouts').select('*').order('date', { ascending: false }),
      ])
      if (!active) return
      const firstError = purRes.error || payRes.error
      if (firstError) {
        // eslint-disable-next-line no-console
        console.error('Errore caricamento dati ROI prop:', firstError.message)
        setLoading(false)
        return
      }
      setPurchases(purRes.data.map(propPurchaseFromDb))
      setPayouts(payRes.data.map(propPayoutFromDb))
      setLoading(false)
    }
    loadAll()
    return () => { active = false }
  }, [])

  async function addPurchase({ firmName, size, cost, activationFee, resetCost, currency, date }) {
    const { data, error } = await supabase
      .from('prop_purchases')
      .insert(propPurchaseToDb({ firmName, size, cost, activationFee, resetCost, currency, date }))
      .select()
      .single()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore salvataggio acquisto prop:', error.message)
      throw new Error(error.message)
    }
    const purchase = propPurchaseFromDb(data)
    setPurchases((prev) => [purchase, ...prev])
    return purchase
  }

  async function deletePurchase(id) {
    const { error } = await supabase.from('prop_purchases').delete().eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore eliminazione acquisto prop:', error.message)
      return
    }
    setPurchases((prev) => prev.filter((p) => p.id !== id))
  }

  async function addPayout({ firmName, grossAmount, taxEur, netAmountEur, date }) {
    const { data, error } = await supabase
      .from('prop_payouts')
      .insert(propPayoutToDb({ firmName, grossAmount, taxEur, netAmountEur, date }))
      .select()
      .single()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore salvataggio payout prop:', error.message)
      throw new Error(error.message)
    }
    const payout = propPayoutFromDb(data)
    setPayouts((prev) => [payout, ...prev])
    return payout
  }

  async function deletePayout(id) {
    const { error } = await supabase.from('prop_payouts').delete().eq('id', id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Errore eliminazione payout prop:', error.message)
      return
    }
    setPayouts((prev) => prev.filter((p) => p.id !== id))
  }

  // Statistiche per firm: quanto speso in acquisti, quanto incassato in payout (lordo e netto
  // EUR), e il ROI. L'elenco delle firm viene dall'unione di chi ha almeno un acquisto o un
  // payout, così una firm compare anche se hai solo speso (o solo incassato, caso raro ma
  // possibile con dati importati/corretti a mano).
  function getStatsByFirm() {
    const firms = new Set([...purchases.map((p) => p.firmName), ...payouts.map((p) => p.firmName)])
    const rows = [...firms].sort((a, b) => a.localeCompare(b)).map((firmName) => {
      const firmPurchases = purchases.filter((p) => p.firmName === firmName)
      const firmPayouts = payouts.filter((p) => p.firmName === firmName)
      const eurPurchases = firmPurchases.filter((p) => p.currency !== 'USD')
      const usdPurchases = firmPurchases.filter((p) => p.currency === 'USD')
      const sumField = (list, field) => list.reduce((sum, p) => sum + (p[field] || 0), 0)
      const spentEur = sumField(eurPurchases, 'cost')
      const spentUsd = sumField(usdPurchases, 'cost')
      const activationFeeCount = firmPurchases.filter((p) => p.activationFee).length
      const activationFeeTotalEur = sumField(eurPurchases, 'activationFee')
      const activationFeeTotalUsd = sumField(usdPurchases, 'activationFee')
      const resetCostCount = firmPurchases.filter((p) => p.resetCost).length
      const resetCostTotalEur = sumField(eurPurchases, 'resetCost')
      const resetCostTotalUsd = sumField(usdPurchases, 'resetCost')
      const spentTotalEur = spentEur + activationFeeTotalEur + resetCostTotalEur
      const spentTotalUsd = spentUsd + activationFeeTotalUsd + resetCostTotalUsd
      const grossEarned = firmPayouts.reduce((sum, p) => sum + p.grossAmount, 0)
      const netEarned = firmPayouts.reduce((sum, p) => sum + (p.netAmountEur ?? p.grossAmount), 0)
      return {
        firmName,
        purchaseCount: firmPurchases.length,
        payoutCount: firmPayouts.length,
        spent: spentEur + spentUsd,
        spentEur,
        spentUsd,
        activationFeeCount,
        activationFeeTotal: activationFeeTotalEur + activationFeeTotalUsd,
        activationFeeTotalEur,
        activationFeeTotalUsd,
        resetCostCount,
        resetCostTotal: resetCostTotalEur + resetCostTotalUsd,
        resetCostTotalEur,
        resetCostTotalUsd,
        spentTotalEur,
        spentTotalUsd,
        spentTotal: spentTotalEur + spentTotalUsd,
        grossEarned,
        netEarned,
        net: netEarned - (spentTotalEur + spentTotalUsd),
      }
    })
    const totals = rows.reduce((acc, r) => ({
      purchaseCount: acc.purchaseCount + r.purchaseCount,
      payoutCount: acc.payoutCount + r.payoutCount,
      spent: acc.spent + r.spent,
      spentEur: acc.spentEur + r.spentEur,
      spentUsd: acc.spentUsd + r.spentUsd,
      activationFeeCount: acc.activationFeeCount + r.activationFeeCount,
      activationFeeTotal: acc.activationFeeTotal + r.activationFeeTotal,
      activationFeeTotalEur: acc.activationFeeTotalEur + r.activationFeeTotalEur,
      activationFeeTotalUsd: acc.activationFeeTotalUsd + r.activationFeeTotalUsd,
      resetCostCount: acc.resetCostCount + r.resetCostCount,
      resetCostTotal: acc.resetCostTotal + r.resetCostTotal,
      resetCostTotalEur: acc.resetCostTotalEur + r.resetCostTotalEur,
      resetCostTotalUsd: acc.resetCostTotalUsd + r.resetCostTotalUsd,
      spentTotalEur: acc.spentTotalEur + r.spentTotalEur,
      spentTotalUsd: acc.spentTotalUsd + r.spentTotalUsd,
      spentTotal: acc.spentTotal + r.spentTotal,
      grossEarned: acc.grossEarned + r.grossEarned,
      netEarned: acc.netEarned + r.netEarned,
      net: acc.net + r.net,
    }), {
      purchaseCount: 0, payoutCount: 0, spent: 0, spentEur: 0, spentUsd: 0, activationFeeCount: 0,
      activationFeeTotal: 0, activationFeeTotalEur: 0, activationFeeTotalUsd: 0,
      resetCostCount: 0, resetCostTotal: 0, resetCostTotalEur: 0, resetCostTotalUsd: 0,
      spentTotalEur: 0, spentTotalUsd: 0, spentTotal: 0, grossEarned: 0, netEarned: 0, net: 0,
    })
    return { rows, totals }
  }

  return {
    purchases,
    payouts,
    loading,
    addPurchase,
    deletePurchase,
    addPayout,
    deletePayout,
    getStatsByFirm,
  }
}
