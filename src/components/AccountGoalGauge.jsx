import styles from './AccountGoalGauge.module.css'

// Quanto della "riserva" di rischio è stata bruciata rispetto al massimo storico, o quanta
// strada verso il traguardo di profitto — MAI un semplice saldo attuale vs saldo iniziale,
// perché con un threshold trailing quello mentirebbe: un conto può essere "in positivo" rispetto
// al saldo di partenza e allo stesso tempo vicinissimo al bruciarsi, se è sceso molto rispetto al
// suo massimo storico (che ha già fatto salire il floor). Vedi getThreshold in useTradingData.js.
function computeFill({ initialBalance, maxDrawdown, threshold, currentBalance, targetProfit }) {
  const nominalBudget = threshold.fixed
    ? initialBalance - threshold.threshold
    : (maxDrawdown || (initialBalance - threshold.threshold))

  if (!nominalBudget || nominalBudget <= 0) return null

  // Il threshold fisso non insegue mai un massimo storico: qui basta saldo vs soglia vs traguardo.
  if (threshold.fixed) {
    if (currentBalance >= initialBalance) {
      return { side: 'green', fraction: clamp((currentBalance - initialBalance) / targetProfit), nominalBudget }
    }
    return { side: 'red', fraction: clamp((initialBalance - currentBalance) / nominalBudget), nominalBudget }
  }

  // Trailing: ricostruisce il massimo storico che ha determinato il threshold attuale
  // (threshold = massimoStorico - nominalBudget, finché non si blocca al saldo iniziale).
  const highWaterMark = threshold.locked
    ? Math.max(currentBalance, initialBalance + nominalBudget)
    : threshold.threshold + nominalBudget

  const belowPeak = highWaterMark - currentBalance
  if (belowPeak > 0.01) {
    return { side: 'red', fraction: clamp(belowPeak / nominalBudget), nominalBudget }
  }
  return { side: 'green', fraction: clamp((currentBalance - initialBalance) / targetProfit), nominalBudget }
}

function clamp(n) {
  return Math.min(1, Math.max(0, n))
}

export default function AccountGoalGauge({ account, threshold, currentBalance }) {
  if (!threshold || !account.targetProfit) return null

  const fill = computeFill({
    initialBalance: account.initialBalance,
    maxDrawdown: account.maxDrawdown,
    threshold,
    currentBalance,
    targetProfit: account.targetProfit,
  })
  if (!fill) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        <span className={styles.neutralMark} />
        {fill.side === 'red' ? (
          <span className={styles.redFill} style={{ width: `${fill.fraction * 50}%` }} />
        ) : (
          <span className={styles.greenFill} style={{ width: `${fill.fraction * 50}%` }} />
        )}
      </div>
      <div className={styles.labels}>
        <span className={styles.labelLoss}>-{fill.nominalBudget.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</span>
        <span className={styles.labelTarget}>+{account.targetProfit.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</span>
      </div>
    </div>
  )
}
