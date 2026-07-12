import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'
import styles from './EquityCharts.module.css'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler)

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(201, 166, 96, ${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const THEME_COLORS = {
  dark: {
    payout: '#9b6bd6',
    breached: '#ff5c5c',
    threshold: 'rgba(255, 92, 92, 0.6)',
    grid: 'rgba(245, 245, 240, 0.08)',
    tick: '#8a8a80',
  },
  light: {
    payout: '#6f47a8',
    breached: '#c94444',
    threshold: 'rgba(201, 68, 68, 0.55)',
    grid: 'rgba(44, 40, 30, 0.1)',
    tick: '#6f6a5c',
  },
}

export default function EquityCharts({ accounts, getAccountSeries, getThreshold, selectedId, onSelect, theme = 'dark', motionEnabled = true }) {
  if (accounts.length === 0) return null

  const colors = THEME_COLORS[theme] || THEME_COLORS.dark
  const PAYOUT_COLOR = colors.payout
  const BREACHED_COLOR = colors.breached
  const GRID_COLOR = colors.grid
  const TICK_COLOR = colors.tick

  return (
    <div className={styles.stack}>
      {accounts.map((account, index) => {
        const series = getAccountSeries(account.id)
        const isSelected = selectedId === account.id
        const isDimmed = selectedId && !isSelected
        const threshold = getThreshold(account.id)
        const lineColor = threshold?.breached ? BREACHED_COLOR : account.color

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
            borderColor: colors.threshold,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            borderWidth: 1.5,
          })
        }

        const data = { labels: series.map((p) => p.date), datasets }
        const yScale = {
          ticks: { color: TICK_COLOR },
          grid: { display: true, color: GRID_COLOR, drawTicks: true },
          border: { color: GRID_COLOR },
        }
        if (threshold) {
          yScale.suggestedMin = threshold.threshold - 1000
          yScale.suggestedMax = account.initialBalance + 10000
        }
        const options = {
          responsive: true,
          // Al primo mount (es. arrivando sulla Dashboard da un'altra sezione, dato che
          // key={tab} in App.jsx smonta/rimonta il contenuto) la linea si disegna "da zero":
          // ogni punto parte dal fondo dell'asse Y (animations.y.from) e sale al suo valore
          // reale, invece del solito fade-in di Chart.js. Disattivabile da Impostazioni.
          animation: motionEnabled ? { duration: 900, easing: 'easeOutQuart' } : false,
          animations: motionEnabled ? {
            y: {
              easing: 'easeOutQuart',
              duration: 900,
              from: (ctx) => ctx.chart.scales.y.getPixelForValue(ctx.chart.scales.y.min),
            },
          } : false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: { color: TICK_COLOR, maxTicksLimit: 6 },
              grid: { display: true, color: GRID_COLOR, drawTicks: true },
              border: { color: GRID_COLOR },
            },
            y: yScale,
          },
        }
        return (
          <div
            key={account.id}
            className={`${styles.card} ${motionEnabled ? styles.cardEnter : ''} ${isSelected ? styles.cardSelected : ''} ${isDimmed ? styles.cardDimmed : ''} ${threshold?.breached ? styles.cardBreached : ''}`}
            style={{ borderLeftColor: lineColor, animationDelay: motionEnabled ? `${index * 70}ms` : undefined }}
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
