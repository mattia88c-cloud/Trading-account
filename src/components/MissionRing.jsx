const SIZE = 72
const STROKE = 6
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const STATUS_COLOR = {
  active: 'var(--accent)',
  completed: 'var(--green)',
  failed: 'var(--red)',
}

export default function MissionRing({ percent, icon, status }) {
  const offset = CIRCUMFERENCE - (Math.min(100, Math.max(0, percent)) / 100) * CIRCUMFERENCE
  const color = STATUS_COLOR[status] || 'var(--accent)'

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={STROKE}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="28"
      >
        {icon}
      </text>
    </svg>
  )
}
