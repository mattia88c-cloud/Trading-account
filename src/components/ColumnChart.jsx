import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import styles from './ColumnChart.module.css'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

export default function ColumnChart({ title, entries, formatLabel }) {
  if (!entries || entries.length === 0) return null

  const labels = entries.map(([key]) => (formatLabel ? formatLabel(key) : key))
  const values = entries.map(([, v]) => v.pnl)

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: values.map((v) => (v >= 0 ? 'rgba(46, 204, 113, 0.75)' : 'rgba(231, 76, 60, 0.75)')),
        borderRadius: 4,
        maxBarThickness: 48,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = entries[ctx.dataIndex][1]
            return `${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toLocaleString('it-IT')} · ${v.days}g · ${v.winRate !== undefined ? v.winRate.toFixed(0) + '% win' : ''}`
          },
        },
      },
    },
    scales: {
      x: { ticks: { color: '#8a8a80', font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: '#8a8a80', font: { size: 10 } }, grid: { display: true, color: 'rgba(245, 245, 240, 0.08)' } },
    },
  }

  return (
    <div className={styles.block}>
      <div className={styles.title}>{title}</div>
      <div className={styles.chartWrap}>
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}
