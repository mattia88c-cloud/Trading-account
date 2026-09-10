import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

const THEME_COLORS = {
  dark: { grid: 'rgba(245, 245, 240, 0.08)', tick: '#8a8a80' },
  light: { grid: 'rgba(44, 40, 30, 0.1)', tick: '#6f6a5c' },
}

function purchaseTotal(p) {
  return (p.cost || 0) + (p.activationFee || 0) + (p.resetCost || 0)
}
function payoutTotal(p) {
  return p.netAmountEur ?? p.grossAmount
}

export default function PropAnalyticsTimeChart({ purchases, payouts, theme = 'dark' }) {
  const colors = THEME_COLORS[theme] || THEME_COLORS.dark

  const events = [
    ...purchases.map((p) => ({ date: p.date, spend: purchaseTotal(p), payout: 0 })),
    ...payouts.map((p) => ({ date: p.date, spend: 0, payout: payoutTotal(p) })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  if (events.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nessun dato per il periodo selezionato.</p>

  let cumSpend = 0
  let cumPayout = 0
  const labels = []
  const spendSeries = []
  const payoutSeries = []
  const profitSeries = []
  for (const e of events) {
    cumSpend += e.spend
    cumPayout += e.payout
    labels.push(e.date)
    spendSeries.push(cumSpend)
    payoutSeries.push(cumPayout)
    profitSeries.push(cumPayout - cumSpend)
  }

  const data = {
    labels,
    datasets: [
      { label: 'Spese cumulative', data: spendSeries, borderColor: 'rgba(217, 99, 92, 0.9)', backgroundColor: 'rgba(217, 99, 92, 0.1)', fill: true, tension: 0.2, pointRadius: 0, borderWidth: 2 },
      { label: 'Payout cumulativi', data: payoutSeries, borderColor: 'rgba(96, 179, 128, 0.9)', backgroundColor: 'rgba(96, 179, 128, 0.1)', fill: true, tension: 0.2, pointRadius: 0, borderWidth: 2 },
      { label: 'Profitto cumulativo', data: profitSeries, borderColor: 'rgba(201, 166, 96, 0.9)', backgroundColor: 'transparent', borderDash: [5, 4], fill: false, tension: 0.2, pointRadius: 0, borderWidth: 2 },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: colors.tick, boxWidth: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('it-IT')}` } },
    },
    scales: {
      x: { ticks: { color: colors.tick, font: { size: 10 }, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { color: colors.tick, font: { size: 11 } }, grid: { color: colors.grid } },
    },
  }

  return <Line data={data} options={options} />
}
