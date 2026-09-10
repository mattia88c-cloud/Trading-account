import { Chart as ChartJS, BarElement, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js'
import { Chart } from 'react-chartjs-2'

ChartJS.register(BarElement, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

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

export default function PropAnalyticsMonthlyChart({ purchases, payouts, theme = 'dark' }) {
  const colors = THEME_COLORS[theme] || THEME_COLORS.dark

  const months = new Map()
  function ensure(month) {
    if (!months.has(month)) months.set(month, { spend: 0, payout: 0 })
    return months.get(month)
  }
  for (const p of purchases) {
    const month = p.date.slice(0, 7)
    ensure(month).spend += purchaseTotal(p)
  }
  for (const p of payouts) {
    const month = p.date.slice(0, 7)
    ensure(month).payout += payoutTotal(p)
  }

  const labels = [...months.keys()].sort()
  if (labels.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nessun dato per il periodo selezionato.</p>

  const spendData = labels.map((m) => months.get(m).spend)
  const payoutData = labels.map((m) => months.get(m).payout)
  const profitData = labels.map((m) => months.get(m).payout - months.get(m).spend)
  const roiData = labels.map((m) => {
    const s = months.get(m).spend
    return s > 0 ? ((months.get(m).payout - s) / s) * 100 : null
  })

  const data = {
    labels,
    datasets: [
      { type: 'bar', label: 'Spese del mese', data: spendData, backgroundColor: 'rgba(217, 99, 92, 0.75)', borderRadius: 4, yAxisID: 'y' },
      { type: 'bar', label: 'Payout del mese', data: payoutData, backgroundColor: 'rgba(96, 179, 128, 0.75)', borderRadius: 4, yAxisID: 'y' },
      { type: 'bar', label: 'Profitto del mese', data: profitData, backgroundColor: 'rgba(201, 166, 96, 0.75)', borderRadius: 4, yAxisID: 'y' },
      { type: 'line', label: 'ROI % del mese', data: roiData, borderColor: 'rgba(155, 107, 214, 0.9)', backgroundColor: 'transparent', yAxisID: 'y1', tension: 0.2, pointRadius: 3, borderWidth: 2 },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: colors.tick, boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.label === 'ROI % del mese') {
              return ctx.parsed.y === null ? 'ROI: N/D' : `ROI: ${ctx.parsed.y.toFixed(1)}%`
            }
            return `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('it-IT')}`
          },
        },
      },
    },
    scales: {
      x: { ticks: { color: colors.tick, font: { size: 10 } }, grid: { display: false } },
      y: { position: 'left', ticks: { color: colors.tick, font: { size: 11 } }, grid: { color: colors.grid } },
      y1: { position: 'right', ticks: { color: colors.tick, font: { size: 11 }, callback: (v) => `${v}%` }, grid: { display: false } },
    },
  }

  return <Chart type="bar" data={data} options={options} />
}
