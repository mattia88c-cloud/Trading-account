import { useState } from 'react'
import { useTradingData } from './useTradingData'
import AccountForm from './components/AccountForm.jsx'
import AccountsOverview from './components/AccountsOverview.jsx'
import DayEntryForm from './components/DayEntryForm.jsx'
import EquityCharts from './components/EquityCharts.jsx'
import CalendarView from './components/CalendarView.jsx'
import AnalyticsView from './components/AnalyticsView.jsx'
import DataBackup from './components/DataBackup.jsx'
import CalculatorTab from './components/CalculatorTab.jsx'
import WeeklyReview from './components/WeeklyReview.jsx'
import PayoutForm from './components/PayoutForm.jsx'
import CsvImportForm from './components/CsvImportForm.jsx'
import styles from './App.module.css'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'weekly', label: 'Weekly Review' },
  { id: 'calculator', label: 'Calculator' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [showInactiveDashboard, setShowInactiveDashboard] = useState(false)
  const [showInactiveAnalytics, setShowInactiveAnalytics] = useState(false)
  const {
    accounts,
    entries,
    payouts,
    addAccount,
    deleteAccount,
    toggleAccountActive,
    saveDayEntry,
    importCsvEntries,
    recordPayout,
    getAccountBalance,
    getAccountSeries,
    getAnalytics,
    getSummaryAnalytics,
    getWeeklyAnalytics,
    getThreshold,
    exportData,
    importData,
  } = useTradingData()

  const dashboardAccounts = accounts.filter((a) => a.active || showInactiveDashboard)
  const analyticsAccounts = accounts.filter((a) => a.active || showInactiveAnalytics)

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
              <DayEntryForm accounts={accounts.filter((a) => a.active)} onSave={saveDayEntry} />
            </div>
            <div className={styles.content}>
              <div className={styles.toolbar}>
                <DataBackup exportData={exportData} importData={importData} />
                <PayoutForm accounts={accounts.filter((a) => a.active)} onSave={recordPayout} />
                <CsvImportForm accounts={accounts} onImport={importCsvEntries} />
              </div>
              <label className={styles.inactiveToggle}>
                <input
                  type="checkbox"
                  checked={showInactiveDashboard}
                  onChange={(e) => setShowInactiveDashboard(e.target.checked)}
                />
                Mostra conti disattivati
              </label>
              <AccountsOverview
                accounts={dashboardAccounts}
                getAccountBalance={getAccountBalance}
                getThreshold={getThreshold}
                payouts={payouts}
                onDelete={deleteAccount}
                onToggleActive={toggleAccountActive}
                selectedId={selectedAccountId}
                onSelect={setSelectedAccountId}
              />
              <EquityCharts
                accounts={dashboardAccounts}
                getAccountSeries={getAccountSeries}
                getThreshold={getThreshold}
                selectedId={selectedAccountId}
                onSelect={setSelectedAccountId}
              />
            </div>
          </div>
        )}

        {tab === 'analytics' && (
          <>
            <label className={styles.inactiveToggle}>
              <input
                type="checkbox"
                checked={showInactiveAnalytics}
                onChange={(e) => setShowInactiveAnalytics(e.target.checked)}
              />
              Mostra conti disattivati
            </label>
            <AnalyticsView accounts={analyticsAccounts} entries={entries} getAnalytics={getAnalytics} getSummaryAnalytics={getSummaryAnalytics} />
          </>
        )}

        {tab === 'calendar' && <CalendarView accounts={accounts} entries={entries} />}

        {tab === 'weekly' && <WeeklyReview accounts={analyticsAccounts} getWeeklyAnalytics={getWeeklyAnalytics} />}

        {tab === 'calculator' && <CalculatorTab />}
      </main>
    </div>
  )
}
