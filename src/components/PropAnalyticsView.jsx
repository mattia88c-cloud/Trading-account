import { useMemo, useState } from 'react'
import Card from './Card'
import PropAnalyticsTimeChart from './PropAnalyticsTimeChart.jsx'
import PropAnalyticsMonthlyChart from './PropAnalyticsMonthlyChart.jsx'
import PropRoiChart from './PropRoiChart.jsx'
import { useFirmNames } from '../useFirmNames'
import styles from './PropAnalyticsView.module.css'

function fmt(n, currency = '') {
  if (n === null || n === undefined || Number.isNaN(n)) return 'N/D'
  return `${currency}${n.toLocaleString('it-IT', { maximumFractionDigits: 2 })}`
}

function pct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return 'N/D'
  return `${n >= 0 ? '+' : ''}${n.toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`
}

const PERIODS = [
  { id: '7d', label: '7 giorni', days: 7 },
  { id: '30d', label: '30 giorni', days: 30 },
  { id: '3m', label: '3 mesi', days: 90 },
  { id: '6m', label: '6 mesi', days: 180 },
  { id: '1y', label: '1 anno', days: 365 },
  { id: 'all', label: 'All time', days: null },
]

// Il costo di un acquisto (cost/activation_fee/reset_cost) e l'incasso di un payout
// (gross/net) possono essere in € o $ a seconda della riga: qui li sommiamo come se
// fossero la stessa unità (stessa semplificazione già usata nel resto della pagina ROI
// prop), quindi ogni KPI in questa vista è "misto €+$" e va letto come indicativo, non
// come cifra convertita col cambio reale.
function purchaseTotal(p) {
  return (p.cost || 0) + (p.activationFee || 0) + (p.resetCost || 0)
}
function payoutTotal(p) {
  return p.netAmountEur ?? p.grossAmount
}

export default function PropAnalyticsView({ purchases, payouts, theme }) {
  const { firmRows: firmNameRows, setFundedCount } = useFirmNames()
  const fundedByFirm = useMemo(() => {
    const map = {}
    for (const r of firmNameRows) {
      if (r.funded_count !== null && r.funded_count !== undefined) map[r.name] = r.funded_count
    }
    return map
  }, [firmNameRows])

  const [firmFilter, setFirmFilter] = useState('all')
  const [sizeFilter, setSizeFilter] = useState('all')
  const [period, setPeriod] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [sortKey, setSortKey] = useState('profit')
  const [sortDir, setSortDir] = useState('desc')

  const allFirms = useMemo(
    () => [...new Set([...purchases.map((p) => p.firmName), ...payouts.map((p) => p.firmName)])].sort((a, b) => a.localeCompare(b)),
    [purchases, payouts]
  )
  const allSizes = useMemo(
    () => [...new Set(purchases.map((p) => p.size).filter(Boolean))].sort((a, b) => a - b),
    [purchases]
  )

  const dateRange = useMemo(() => {
    if (period === 'all') return null
    if (period === 'custom') {
      if (!customFrom && !customTo) return null
      return { from: customFrom || '0000-01-01', to: customTo || '9999-12-31' }
    }
    const def = PERIODS.find((p) => p.id === period)
    if (!def || !def.days) return null
    const from = new Date()
    from.setDate(from.getDate() - def.days)
    return { from: from.toISOString().slice(0, 10), to: '9999-12-31' }
  }, [period, customFrom, customTo])

  const filteredPurchases = useMemo(() => purchases.filter((p) => {
    if (firmFilter !== 'all' && p.firmName !== firmFilter) return false
    if (sizeFilter !== 'all' && String(p.size) !== String(sizeFilter)) return false
    if (dateRange && (p.date < dateRange.from || p.date > dateRange.to)) return false
    return true
  }), [purchases, firmFilter, sizeFilter, dateRange])

  const filteredPayouts = useMemo(() => payouts.filter((p) => {
    if (firmFilter !== 'all' && p.firmName !== firmFilter) return false
    if (dateRange && (p.date < dateRange.from || p.date > dateRange.to)) return false
    return true
  }), [payouts, firmFilter, dateRange])

  const totals = useMemo(() => {
    const spesaChallenge = filteredPurchases.reduce((s, p) => s + (p.cost || 0), 0)
    const activationFee = filteredPurchases.reduce((s, p) => s + (p.activationFee || 0), 0)
    const reset = filteredPurchases.reduce((s, p) => s + (p.resetCost || 0), 0)
    const spesaTotale = spesaChallenge + activationFee + reset
    const payoutTotale = filteredPayouts.reduce((s, p) => s + payoutTotal(p), 0)
    const profittoNetto = payoutTotale - spesaTotale
    const roiPct = spesaTotale > 0 ? (profittoNetto / spesaTotale) * 100 : null
    const recoveryRatio = spesaTotale > 0 ? payoutTotale / spesaTotale : null
    const acquistiConCosto = filteredPurchases.filter((p) => p.cost > 0)
    const costoMedioChallenge = acquistiConCosto.length
      ? acquistiConCosto.reduce((s, p) => s + p.cost, 0) / acquistiConCosto.length
      : null
    const payoutMedio = filteredPayouts.length
      ? payoutTotale / filteredPayouts.length
      : null
    const visibleFirms = firmFilter !== 'all'
      ? [firmFilter]
      : [...new Set([...filteredPurchases.map((p) => p.firmName), ...filteredPayouts.map((p) => p.firmName)])]
    const fundedKnownFirms = visibleFirms.filter((f) => fundedByFirm[f] !== undefined)
    const fundedCount = fundedKnownFirms.length
      ? fundedKnownFirms.reduce((s, f) => s + fundedByFirm[f], 0)
      : null
    const passRate = fundedCount !== null && filteredPurchases.length > 0
      ? (fundedCount / filteredPurchases.length) * 100
      : null
    const costoPerFunded = fundedCount ? spesaTotale / fundedCount : null
    const fundedPayoutRate = fundedCount ? (filteredPayouts.length / fundedCount) * 100 : null
    return {
      spesaChallenge, activationFee, reset, spesaTotale, payoutTotale, profittoNetto,
      roiPct, recoveryRatio, costoMedioChallenge, payoutMedio, fundedCount, passRate, costoPerFunded,
      fundedPayoutRate,
      nAcquisti: filteredPurchases.length, nPayout: filteredPayouts.length,
    }
  }, [filteredPurchases, filteredPayouts, firmFilter, fundedByFirm])

  const firmRows = useMemo(() => {
    const firms = [...new Set([...filteredPurchases.map((p) => p.firmName), ...filteredPayouts.map((p) => p.firmName)])]
    return firms.map((firmName) => {
      const fp = filteredPurchases.filter((p) => p.firmName === firmName)
      const fo = filteredPayouts.filter((p) => p.firmName === firmName)
      const spesaChallenge = fp.reduce((s, p) => s + (p.cost || 0), 0)
      const activationFee = fp.reduce((s, p) => s + (p.activationFee || 0), 0)
      const reset = fp.reduce((s, p) => s + (p.resetCost || 0), 0)
      const spesaTotale = spesaChallenge + activationFee + reset
      const payoutTot = fo.reduce((s, p) => s + payoutTotal(p), 0)
      const profit = payoutTot - spesaTotale
      const roi = spesaTotale > 0 ? (profit / spesaTotale) * 100 : null
      const recovery = spesaTotale > 0 ? payoutTot / spesaTotale : null
      const funded = fundedByFirm[firmName] ?? null
      const passRate = funded !== null && fp.length > 0 ? (funded / fp.length) * 100 : null
      const costoPerFunded = funded ? spesaTotale / funded : null
      const fundedPayoutRate = funded ? (fo.length / funded) * 100 : null
      return {
        firmName, nAcquisti: fp.length, nPayout: fo.length,
        spesaChallenge, activationFee, reset, spesaTotale, payoutTot, profit, roi, recovery,
        funded, passRate, costoPerFunded, fundedPayoutRate,
      }
    })
  }, [filteredPurchases, filteredPayouts, fundedByFirm])

  const roiChartRows = useMemo(
    () => firmRows.map((r) => ({ firmName: r.firmName, spentTotal: r.spesaTotale, netEarned: r.payoutTot })),
    [firmRows]
  )

  const sortedFirmRows = useMemo(() => {
    const withVal = firmRows.map((r) => ({ ...r, _sortVal: r[sortKey] }))
    withVal.sort((a, b) => {
      const av = a._sortVal === null || a._sortVal === undefined ? -Infinity : a._sortVal
      const bv = b._sortVal === null || b._sortVal === undefined ? -Infinity : b._sortVal
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return withVal
  }, [firmRows, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const bestWorst = useMemo(() => {
    const withSpend = firmRows.filter((r) => r.spesaTotale > 0)
    if (withSpend.length === 0) return null
    const byProfit = [...withSpend].sort((a, b) => b.profit - a.profit)
    const byRoi = [...withSpend].filter((r) => r.roi !== null).sort((a, b) => b.roi - a.roi)
    const byPayout = [...withSpend].sort((a, b) => b.payoutTot - a.payoutTot)
    const byPassRate = [...withSpend].filter((r) => r.passRate !== null).sort((a, b) => b.passRate - a.passRate)
    const byCostPerFunded = [...withSpend].filter((r) => r.costoPerFunded !== null).sort((a, b) => a.costoPerFunded - b.costoPerFunded)
    return {
      maxProfit: byProfit[0],
      maxRoi: byRoi[0],
      minRoi: byRoi[byRoi.length - 1],
      maxPayout: byPayout[0],
      bestPassRate: byPassRate[0] || null,
      bestCostPerFunded: byCostPerFunded[0] || null,
    }
  }, [firmRows])

  const insights = useMemo(() => {
    const list = []
    if (bestWorst?.maxRoi) {
      list.push(`${bestWorst.maxRoi.firmName} è attualmente la prop con il ROI migliore (${pct(bestWorst.maxRoi.roi)}).`)
    }
    if (bestWorst?.minRoi && bestWorst.minRoi.firmName !== bestWorst.maxRoi?.firmName) {
      list.push(`${bestWorst.minRoi.firmName} ha il ROI peggiore (${pct(bestWorst.minRoi.roi)}) tra le firm con almeno una spesa registrata.`)
    }
    if (bestWorst?.maxProfit) {
      list.push(`${bestWorst.maxProfit.firmName} è la prop più profittevole in termini assoluti (${fmt(bestWorst.maxProfit.profit)}).`)
    }
    const now = new Date()
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30)
    const d60 = new Date(now); d60.setDate(d60.getDate() - 60)
    const d30s = d30.toISOString().slice(0, 10)
    const d60s = d60.toISOString().slice(0, 10)
    const spendLast30 = purchases.filter((p) => p.date >= d30s).reduce((s, p) => s + purchaseTotal(p), 0)
    const spendPrev30 = purchases.filter((p) => p.date >= d60s && p.date < d30s).reduce((s, p) => s + purchaseTotal(p), 0)
    const payoutLast30 = payouts.filter((p) => p.date >= d30s).reduce((s, p) => s + payoutTotal(p), 0)
    const payoutPrev30 = payouts.filter((p) => p.date >= d60s && p.date < d30s).reduce((s, p) => s + payoutTotal(p), 0)
    if (spendPrev30 > 0 || payoutPrev30 > 0) {
      const spendDelta = spendLast30 - spendPrev30
      const payoutDelta = payoutLast30 - payoutPrev30
      if (spendDelta > payoutDelta) {
        list.push('Negli ultimi 30 giorni le spese sono aumentate più dei payout rispetto ai 30 giorni precedenti.')
      } else if (payoutDelta > spendDelta) {
        list.push('Negli ultimi 30 giorni i payout sono cresciuti più delle spese rispetto ai 30 giorni precedenti.')
      }
    }
    if (bestWorst?.bestPassRate) {
      list.push(`${bestWorst.bestPassRate.firmName} ha il pass rate migliore (${pct(bestWorst.bestPassRate.passRate)}) tra le firm con dato funded inserito.`)
    } else {
      list.push('Pass rate non ancora disponibile per nessuna firm: inserisci il numero di funded nella colonna "Funded" della tabella per calcolarlo.')
    }
    const withFundedPayout = firmRows.filter((r) => r.fundedPayoutRate !== null)
    if (withFundedPayout.length) {
      const totalFunded = withFundedPayout.reduce((s, r) => s + r.funded, 0)
      const totalPayoutCount = withFundedPayout.reduce((s, r) => s + r.nPayout, 0)
      const overallRate = totalFunded ? (totalPayoutCount / totalFunded) * 100 : null
      if (overallRate !== null) {
        list.push(`In media si registra ${overallRate.toFixed(0)}% di payout rispetto ai funded ottenuti (stima aggregata, non per singolo account).`)
      }
    }
    return list
  }, [bestWorst, purchases, payouts, firmRows])

  return (
    <div className={styles.wrap}>
      <Card className={styles.filtersCard}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Prop firm</label>
          <div className={styles.firmPills}>
            <button
              type="button"
              className={`${styles.firmPill} ${firmFilter === 'all' ? styles.firmPillActive : ''}`}
              onClick={() => setFirmFilter('all')}
            >
              Tutte
            </button>
            {allFirms.map((f) => (
              <button
                key={f}
                type="button"
                className={`${styles.firmPill} ${firmFilter === f ? styles.firmPillActive : ''}`}
                onClick={() => setFirmFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Size account</label>
            <select className={styles.select} value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)}>
              <option value="all">Tutte</option>
              {allSizes.map((s) => <option key={s} value={s}>${s.toLocaleString('it-IT')}</option>)}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Periodo</label>
            <select className={styles.select} value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value="custom">Intervallo personalizzato</option>
            </select>
          </div>
          {period === 'custom' && (
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Da / A</label>
              <div className={styles.customRange}>
                <input className={styles.dateInput} type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                <input className={styles.dateInput} type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className={styles.kpiGrid}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Spesa totale</span>
          <span className={`${styles.kpiValue} ${styles.negative}`}>{fmt(totals.spesaTotale)}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Payout totali</span>
          <span className={`${styles.kpiValue} ${styles.positive}`}>{fmt(totals.payoutTotale)}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Profitto netto</span>
          <span className={`${styles.kpiValue} ${totals.profittoNetto >= 0 ? styles.positive : styles.negative}`}>{fmt(totals.profittoNetto)}</span>
        </div>
        <div className={styles.kpi} title="ROI% = (payout totali - spese totali) / spese totali × 100">
          <span className={styles.kpiLabel}>ROI %</span>
          <span className={`${styles.kpiValue} ${(totals.roiPct ?? 0) >= 0 ? styles.positive : styles.negative}`}>{pct(totals.roiPct)}</span>
        </div>
        <div className={styles.kpi} title="Recovery Ratio = payout totali / spese totali (1.0 = pareggio)">
          <span className={styles.kpiLabel}>Recovery Ratio</span>
          <span className={styles.kpiValue}>{totals.recoveryRatio === null ? 'N/D' : totals.recoveryRatio.toFixed(2)}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Acquisti registrati</span>
          <span className={styles.kpiValue}>{totals.nAcquisti}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Funded ottenuti</span>
          <span className={styles.kpiValue}>{totals.fundedCount === null ? 'N/D' : totals.fundedCount}</span>
        </div>
        <div className={styles.kpi} title="Pass Rate = funded ottenuti / acquisti registrati × 100 — dato manuale per firm, non collegato a un ID account specifico">
          <span className={styles.kpiLabel}>Pass Rate</span>
          <span className={styles.kpiValue}>{pct(totals.passRate)}</span>
        </div>
        <div className={styles.kpi} title="Stima aggregata: payout registrati / funded ottenuti × 100. Non è il conteggio esatto di quanti funded distinti hanno avuto almeno un payout (richiederebbe un ID per account), ma un indicatore di quanto i funded stanno effettivamente pagando.">
          <span className={styles.kpiLabel}>Funded → Payout Rate</span>
          <span className={styles.kpiValue}>{pct(totals.fundedPayoutRate)}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Costo medio per challenge</span>
          <span className={styles.kpiValue}>{fmt(totals.costoMedioChallenge)}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Payout medio</span>
          <span className={styles.kpiValue}>{fmt(totals.payoutMedio)}</span>
        </div>
        <div className={styles.kpi} title="Costo per funded = spesa totale / funded ottenuti">
          <span className={styles.kpiLabel}>Costo per funded</span>
          <span className={styles.kpiValue}>{fmt(totals.costoPerFunded)}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Payout registrati</span>
          <span className={styles.kpiValue}>{totals.nPayout}</span>
        </div>
      </div>

      <Card className={styles.tableCard}>
        <h3 className={styles.title}>Confronto per prop firm</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {[
                  ['firmName', 'Prop firm'],
                  ['nAcquisti', 'Acquisti'],
                  ['spesaChallenge', 'Spesa challenge'],
                  ['activationFee', 'Activation fee'],
                  ['reset', 'Reset'],
                  ['spesaTotale', 'Spesa totale'],
                  ['nPayout', 'Payout'],
                  ['payoutTot', 'Payout totale'],
                  ['profit', 'Profitto netto'],
                  ['roi', 'ROI %'],
                  ['recovery', 'Recovery Ratio'],
                  ['funded', 'Funded'],
                  ['passRate', 'Pass Rate'],
                  ['costoPerFunded', 'Costo/funded'],
                  ['fundedPayoutRate', 'Funded→Payout'],
                ].map(([key, label]) => (
                  <th key={key} className={styles.sortableTh} onClick={() => toggleSort(key)}>
                    {label}{sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedFirmRows.map((r) => (
                <tr
                  key={r.firmName}
                  className={
                    bestWorst?.maxRoi?.firmName === r.firmName ? styles.rowBest
                      : bestWorst?.minRoi?.firmName === r.firmName ? styles.rowWorst : ''
                  }
                >
                  <td className={styles.firmCell}>
                    {r.firmName}
                    {bestWorst?.maxRoi?.firmName === r.firmName && <span className={styles.badgeGood}>miglior ROI</span>}
                    {bestWorst?.minRoi?.firmName === r.firmName && bestWorst.minRoi.firmName !== bestWorst.maxRoi?.firmName && <span className={styles.badgeBad}>peggior ROI</span>}
                    {bestWorst?.maxProfit?.firmName === r.firmName && <span className={styles.badgeGood}>più profittevole</span>}
                  </td>
                  <td>{r.nAcquisti}</td>
                  <td className={styles.negative}>{fmt(r.spesaChallenge)}</td>
                  <td className={styles.negative}>{fmt(r.activationFee)}</td>
                  <td className={styles.negative}>{fmt(r.reset)}</td>
                  <td className={styles.negative}>{fmt(r.spesaTotale)}</td>
                  <td>{r.nPayout}</td>
                  <td className={styles.positive}>{fmt(r.payoutTot)}</td>
                  <td className={r.profit >= 0 ? styles.positive : styles.negative}>{fmt(r.profit)}</td>
                  <td className={r.roi === null ? '' : r.roi >= 0 ? styles.positive : styles.negative}>{pct(r.roi)}</td>
                  <td>{r.recovery === null ? 'N/D' : r.recovery.toFixed(2)}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      className={styles.fundedInput}
                      defaultValue={r.funded ?? ''}
                      placeholder="N/D"
                      onBlur={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value)
                        if (val !== r.funded) setFundedCount(r.firmName, val)
                      }}
                    />
                  </td>
                  <td>{pct(r.passRate)}</td>
                  <td>{fmt(r.costoPerFunded)}</td>
                  <td>{pct(r.fundedPayoutRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className={styles.chartsRow}>
        {roiChartRows.length > 0 && (
          <Card className={styles.chartCard}>
            <h3 className={styles.title}>Speso vs incassato per prop firm</h3>
            <PropRoiChart rows={roiChartRows} theme={theme} />
          </Card>
        )}

        <Card className={styles.chartCard}>
          <h3 className={styles.title}>Andamento nel tempo (cumulativo)</h3>
          <PropAnalyticsTimeChart purchases={filteredPurchases} payouts={filteredPayouts} theme={theme} />
        </Card>

        <Card className={styles.chartCard}>
          <h3 className={styles.title}>Andamento mensile</h3>
          <PropAnalyticsMonthlyChart purchases={filteredPurchases} payouts={filteredPayouts} theme={theme} />
        </Card>
      </div>

      <Card className={styles.bestWorstCard}>
        <h3 className={styles.title}>Best / Worst performance</h3>
        {!bestWorst ? (
          <p className={styles.empty}>Nessun dato sufficiente.</p>
        ) : (
          <div className={styles.bwGrid}>
            <div className={styles.bwItem}>
              <span className={styles.kpiLabel}>Maggior profitto</span>
              <span className={styles.bwValue}>{bestWorst.maxProfit.firmName}</span>
              <span className={styles.positive}>{fmt(bestWorst.maxProfit.profit)}</span>
            </div>
            <div className={styles.bwItem}>
              <span className={styles.kpiLabel}>ROI migliore</span>
              <span className={styles.bwValue}>{bestWorst.maxRoi?.firmName ?? 'N/D'}</span>
              <span className={styles.positive}>{bestWorst.maxRoi ? pct(bestWorst.maxRoi.roi) : 'N/D'}</span>
            </div>
            <div className={styles.bwItem}>
              <span className={styles.kpiLabel}>ROI peggiore</span>
              <span className={styles.bwValue}>{bestWorst.minRoi?.firmName ?? 'N/D'}</span>
              <span className={styles.negative}>{bestWorst.minRoi ? pct(bestWorst.minRoi.roi) : 'N/D'}</span>
            </div>
            <div className={styles.bwItem}>
              <span className={styles.kpiLabel}>Payout maggiore</span>
              <span className={styles.bwValue}>{bestWorst.maxPayout.firmName}</span>
              <span className={styles.positive}>{fmt(bestWorst.maxPayout.payoutTot)}</span>
            </div>
            <div className={styles.bwItem} title="Serve il numero di funded per firm (modificabile nella tabella sopra)">
              <span className={styles.kpiLabel}>Pass rate migliore</span>
              <span className={styles.bwValue}>{bestWorst.bestPassRate?.firmName ?? 'N/D'}</span>
              {bestWorst.bestPassRate && <span className={styles.positive}>{pct(bestWorst.bestPassRate.passRate)}</span>}
            </div>
            <div className={styles.bwItem} title="Serve il numero di funded per firm (modificabile nella tabella sopra)">
              <span className={styles.kpiLabel}>Costo per funded più basso</span>
              <span className={styles.bwValue}>{bestWorst.bestCostPerFunded?.firmName ?? 'N/D'}</span>
              {bestWorst.bestCostPerFunded && <span className={styles.positive}>{fmt(bestWorst.bestCostPerFunded.costoPerFunded)}</span>}
            </div>
          </div>
        )}
      </Card>

      <Card className={styles.insightsCard}>
        <h3 className={styles.title}>Insight automatici</h3>
        <ul className={styles.insightsList}>
          {insights.map((text, i) => <li key={i}>{text}</li>)}
        </ul>
      </Card>
    </div>
  )
}
