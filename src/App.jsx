import { useState } from 'react'
import { useTradingData } from './useTradingData'
import AccountForm from './components/AccountForm.jsx'
import AccountsOverview from './components/AccountsOverview.jsx'
import DayEntryForm from './components/DayEntryForm.jsx'
import EquityCharts from './components/EquityCharts.jsx'
import CalendarView from './components/CalendarView.jsx'
import AnalyticsView from './components/AnalyticsView.jsx'
import styles from './App.module.css'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'analytics', label: 'Analytics' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const {
    accounts,
    entries,
    addAccount,
    deleteAccount,
    saveDayEntry,
    getAccountBalance,
    getAccountSeries,
    getAnalytics,
  } = useTradingData()

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Trading Accounts</h1>
        <nav className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        {tab === 'dashboard' && (
          <div className={styles.dashboardGrid}>
            <div className={styles.side}>
              <AccountForm onCreate={addAccount} />
              <DayEntryForm accounts={accounts} onSave={saveDayEntry} />
            </div>
            <div className={styles.content}>
              <AccountsOverview
                accounts={accounts}
                getAccountBalance={getAccountBalance}
                onDelete={deleteAccount}
              />
              <EquityCharts accounts={accounts} getAccountSeries={getAccountSeries} />
            </div>
          </div>
        )}

        {tab === 'calendar' && <CalendarView accounts={accounts} entries={entries} />}

        {tab === 'analytics' && <AnalyticsView accounts={accounts} getAnalytics={getAnalytics} />}
      </main>
    </div>
  )
}
