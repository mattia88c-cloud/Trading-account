import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'
import styles from './EquityCharts.module.css'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler)

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(79, 140, 255, ${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const PAYOUT_COLOR = '#9b59b6'

export default function EquityCharts({ accounts, getAccountSeries, getThreshold, selectedId, onSelect }) {
  if (accounts.length === 0) return null

  return (
    <div className={styles.stack}>
      {accounts.map((account) => {
        const series = getAccountSeries(account.id)
        const isSelected = selectedId === account.id
        const isDimmed = selectedId && !isSelected
        const threshold = getThreshold(account.id)
        const lineColor = threshold?.breached ? '#e74c3c' : account.color

        const hasPayout = series.some((p) => p.isPayout)

        const datasets = [
          {
            label: account.name,
            data: series.map((p) => p.balance),
            borderColor: lineColor,
            backgroundColor: hexToRgba(lineColor, isDimmed ? 0.03 : 0.15),
            fill: true,
            tension: 0.25,
            pointRadius: series.map((p) => (p.isPayout ? 5 : 2)),
            pointBackgroundColor: series.map((p) => (p.isPayout ? PAYOUT_COLOR : lineColor)),
            pointBorderColor: series.map((p) => (p.isPayout ? PAYOUT_COLOR : lineColor)),
            borderWidth: isSelected ? 3 : 2,
            segment: {
              borderColor: (ctx) => (series[ctx.p1DataIndex]?.isPayout ? PAYOUT_COLOR : undefined),
            },
          },
        ]

        if (threshold) {
          datasets.push({
            label: 'Threshold',
            data: series.map(() => threshold.threshold),
            borderColor: 'rgba(231, 76, 60, 0.6)',
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            borderWidth: 1.5,
          })
        }

        const data = { labels: series.map((p) => p.date), datasets }
        const yScale = { ticks: { color: '#8b8f9c' }, grid: { color: '#2a2e3a' } }
        if (threshold) {
          yScale.suggestedMin = threshold.threshold - 1000
          yScale.suggestedMax = account.initialBalance + 10000
        }
        const options = {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#8b8f9c', maxTicksLimit: 6 }, grid: { color: '#2a2e3a' } },
            y: yScale,
          },
        }
        return (
          <div
            key={account.id}
            className={`${styles.card} ${isSelected ? styles.cardSelected : ''} ${isDimmed ? styles.cardDimmed : ''} ${threshold?.breached ? styles.cardBreached : ''}`}
            style={{ borderLeftColor: lineColor }}
            onClick={() => onSelect(isSelected ? null : account.id)}
          >
            <div className={styles.header}>
              <span className={styles.dot} style={{ background: account.color }} />
              {account.name}
              {threshold?.breached && <span className={styles.breachedTag}>BRUCIATO</span>}
              {!threshold?.breached && hasPayout && <span className={styles.payoutTag}>● payout</span>}
            </div>
            <Line data={data} options={options} />
          </div>
        )
      })}
    </div>
  )
}
