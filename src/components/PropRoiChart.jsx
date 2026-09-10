import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const THEME_COLORS = {
  dark: { grid: 'rgba(245, 245, 240, 0.08)', tick: '#8a8a80' },
  light: { grid: 'rgba(44, 40, 30, 0.1)', tick: '#6f6a5c' },
}

export default function PropRoiChart({ rows, theme = 'dark' }) {
  if (rows.length === 0) return null
  const colors = THEME_COLORS[theme] || THEME_COLORS.dark

  const data = {
    labels: rows.map((r) => r.firmName),
    datasets: [
      {
        label: 'Speso (€+$)',
        data: rows.map((r) => r.spentTotal),
        backgroundColor: 'rgba(217, 99, 92, 0.75)',
        borderRadius: 4,
      },
      {
        label: 'Incassato netto (€)',
        data: rows.map((r) => r.netEarned),
        backgroundColor: 'rgba(96, 179, 128, 0.75)',
        borderRadius: 4,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: colors.tick, boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('it-IT')}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: colors.tick, font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: colors.tick, font: { size: 11 } },
        grid: { color: colors.grid },
      },
    },
  }

  return <Bar data={data} options={options} />
}
