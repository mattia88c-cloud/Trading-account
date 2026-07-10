// Icone a linea minimali (stile Feather), stroke="currentColor" così ereditano sempre lo
// stesso colore del testo del tab (muted normalmente, on-accent quando attivo) invece di
// spiccare come sticker colorati fuori tema.
const common = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const TAB_ICONS = {
  dashboard: (
    <svg {...common}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" />
    </svg>
  ),
  analytics: (
    <svg {...common}>
      <line x1="4" y1="20" x2="4" y2="13" />
      <line x1="10" y1="20" x2="10" y2="7" />
      <line x1="16" y1="20" x2="16" y2="10" />
      <line x1="22" y1="20" x2="22" y2="4" />
    </svg>
  ),
  calendar: (
    <svg {...common}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  ),
  history: (
    <svg {...common}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9 2h6" />
    </svg>
  ),
  weekly: (
    <svg {...common}>
      <polyline points="3,17 9,10 13,14 21,5" />
      <polyline points="15,5 21,5 21,11" />
    </svg>
  ),
  missions: (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  ),
  behavior: (
    <svg {...common}>
      <polyline points="3,12 8,12 10,6 14,18 16,12 21,12" />
    </svg>
  ),
  calculator: (
    <svg {...common}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <circle cx="8" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  propfirms: (
    <svg {...common}>
      <path d="M3 9.5 12 4l9 5.5" />
      <line x1="4.5" y1="9.5" x2="19.5" y2="9.5" />
      <line x1="5.5" y1="9.5" x2="5.5" y2="18" />
      <line x1="9.5" y1="9.5" x2="9.5" y2="18" />
      <line x1="14.5" y1="9.5" x2="14.5" y2="18" />
      <line x1="18.5" y1="9.5" x2="18.5" y2="18" />
      <line x1="3.5" y1="20" x2="20.5" y2="20" />
    </svg>
  ),
  friends: (
    <svg {...common}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5.3 5.5-5.3s5.5 2.3 5.5 5.3" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.2 13.9c2.5.4 4.3 2.4 4.3 5.1" />
    </svg>
  ),
}
