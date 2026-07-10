export default function Sparkline({ series, color, height = 32 }) {
  if (!series || series.length < 2) return null

  const width = 100
  const values = series.map((p) => p.balance)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = width / (series.length - 1)
  const pad = 3

  const points = series
    .map((p, i) => {
      const x = i * step
      const y = pad + (1 - (p.balance - min) / range) * (height - pad * 2)
      return `${x},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
