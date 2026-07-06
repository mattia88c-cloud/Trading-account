import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'
import styles from './EquityCharts.module.css'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler)

export default function EquityCharts({ accounts, getAccountSeries }) {
  if (accounts.length === 0) return null

  return (
    <div className={styles.grid}>
      {accounts.map((account) => {
        const series = getAccountSeries(account.id)
        const data = {
          labels: series.map((p) => p.date),
          datasets: [
            {
              label: account.name,
              data: series.map((p) => p.balance),
              borderColor: '#4f8cff',
              backgroundColor: 'rgba(79, 140, 255, 0.15)',
              fill: true,
              tension: 0.25,
              pointRadius: 2,
            },
          ],
        }
        const options = {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#8b8f9c', maxTicksLimit: 6 }, grid: { color: '#2a2e3a' } },
            y: { ticks: { color: '#8b8f9c' }, grid: { color: '#2a2e3a' } },
          },
        }
        return (
          <div key={account.id} className={styles.card}>
            <div className={styles.header}>{account.name}</div>
            <Line data={data} options={options} />
          </div>
        )
      })}
    </div>
  )
}
