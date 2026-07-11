import MarketCalculator from './MarketCalculator.jsx'
import nas100Logo from '../assets/markets/nas100.jpg'
import xauusdLogo from '../assets/markets/xauusd.jpg'
import styles from './CalculatorTab.module.css'

const NAS100_PRESETS = Array.from({ length: 10 }, (_, i) => ({ micro: i + 1, ppp: (i + 1) * 2 }))
const XAUUSD_PRESETS = Array.from({ length: 10 }, (_, i) => ({ micro: i + 1, ppp: (i + 1) * 10 }))

export default function CalculatorTab() {
  return (
    <div className={styles.layout}>
      <div className={styles.marketGroup}>
        <MarketCalculator
          market="NAS100"
          logo={nas100Logo}
          defaultPpp={2}
          pppHint="MNQ = $2/punto · ES = $50/punto · NQ = $20/punto"
          tableTitle="Tabella di riferimento — MNQ ($2/punto)"
          tickInfo="1 punto = 4 tick (tick = 0,25 punti = $0,50)"
          presets={NAS100_PRESETS}
        />
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
