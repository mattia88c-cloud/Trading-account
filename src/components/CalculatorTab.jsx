import MarketCalculator from './MarketCalculator.jsx'
import nas100Logo from '../assets/markets/nas100.jpg'
import xauusdLogo from '../assets/markets/xauusd.jpg'
import styles from './CalculatorTab.module.css'

const NAS100_PRESETS = Array.from({ length: 10 }, (_, i) => ({ micro: i + 1, ppp: (i + 1) * 2 }))
const XAUUSD_PRESETS = Array.from({ length: 10 }, (_, i) => ({ micro: i + 1, ppp: (i + 1) * 10 }))
// Prop firm CFD: si opera in lotti, non in micro/mini contract futures. 1,00 lotto = $1/punto
// (standard broker CFD su NAS100) è lineare, quindi $/punto = lotti × 1 — modificabile nel
// calcolatore se il tuo broker usa un valore diverso.
const NAS100_LOTS_PRESETS = [0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 1, 2, 5, 10].map((lots) => ({ micro: lots, ppp: lots }))

const NAS100_MODES = [
  {
    key: 'micro',
    label: 'Micro/Mini (futures)',
    defaultPpp: 2,
    pppHint: 'MNQ = $2/punto · ES = $50/punto · NQ = $20/punto',
    tableTitle: 'Tabella di riferimento — MNQ ($2/punto)',
    tickInfo: '1 punto = 4 tick (tick = 0,25 punti = $0,50)',
    unitLabel: 'Micro Contracts',
    unitShort: 'contracts',
    tableUnitLabel: 'Micro',
    presets: NAS100_PRESETS,
  },
  {
    key: 'lotti',
    label: 'Lotti (CFD)',
    defaultPpp: 1,
    pppHint: 'Standard CFD: 1,00 lotto = $1/punto (verifica col tuo broker)',
    tableTitle: 'Tabella di riferimento — CFD ($1/punto per lotto)',
    tickInfo: null,
    unitLabel: 'Lotti',
    unitShort: 'lotti',
    tableUnitLabel: 'Lotti',
    presets: NAS100_LOTS_PRESETS,
  },
]

export default function CalculatorTab() {
  return (
    <div className={styles.layout}>
      <div className={styles.marketGroup}>
        <MarketCalculator market="NAS100" logo={nas100Logo} unitModes={NAS100_MODES} />
      </div>

      <div className={styles.marketGroup}>
        <MarketCalculator
          market="XAUUSD"
          logo={xauusdLogo}
          defaultPpp={10}
          pppHint="MGC (Micro Gold) = $10/punto"
          tableTitle="Tabella di riferimento — MGC ($10/punto)"
          tickInfo="1 punto = 10 tick (tick = 0,10 punti = $1,00)"
          presets={XAUUSD_PRESETS}
        />
      </div>
    </div>
  )
}
