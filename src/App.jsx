import { useEffect, useState } from 'react'
import { useTradingData } from './useTradingData'
import { useMissions, evaluateMission, MISSION_TYPES } from './useMissions'
import { useAuth } from './useAuth'
import { useLeaderboard } from './useLeaderboard'
import LoginPage from './components/LoginPage.jsx'
import SetPasswordPage from './components/SetPasswordPage.jsx'
import AccountForm from './components/AccountForm.jsx'
import AccountsOverview from './components/AccountsOverview.jsx'
import QuickEntryForm from './components/QuickEntryForm.jsx'
import DayEntryForm from './components/DayEntryForm.jsx'
import EquityCharts from './components/EquityCharts.jsx'
import CalendarView from './components/CalendarView.jsx'
import HistoryView from './components/HistoryView.jsx'
import AnalyticsView from './components/AnalyticsView.jsx'
import DataBackup from './components/DataBackup.jsx'
import CalculatorTab from './components/CalculatorTab.jsx'
import PropFirmFinder from './components/PropFirmFinder.jsx'
import WeeklyReview from './components/WeeklyReview.jsx'
import PayoutForm from './components/PayoutForm.jsx'
import CsvImportForm from './components/CsvImportForm.jsx'
import OvertradingForm from './components/OvertradingForm.jsx'
import OvertradingBanner from './components/OvertradingBanner.jsx'
import LegacyImportBanner from './components/LegacyImportBanner.jsx'
import RecoveryMissions from './components/RecoveryMissions.jsx'
import BehaviorProgress from './components/BehaviorProgress.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import SettingsMenu from './components/SettingsMenu.jsx'
import FriendsView from './components/FriendsView.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { TAB_ICONS } from './components/TabIcons.jsx'
import { isSfxMuted, setSfxMuted, playNav, playSave, playDelete, playClick } from './sounds'
import { isMotionDisabled, setMotionDisabled } from './motion'
import styles from './App.module.css'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'history', label: 'Cronologia' },
  { id: 'weekly', label: 'Weekly Review' },
  { id: 'missions', label: 'Missions' },
  { id: 'behavior', label: 'Progress' },
  { id: 'friends', label: 'Friends' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'propfirms', label: 'Prop Firm' },
]

// SOLO anteprima visiva temporanea per il tab Friends, prima del deploy reale su Supabase.
// TODO: rimuovere e ripristinare `rows={leaderboardRows}` una volta verificato il risultato.
const DEMO_ROWS = [
  {
    user_id: 'demo-you', username: 'mattia88c', balance: 53309, account_count: 4,
    daily_pct: [{ pct: 1.2 }, { pct: 0.8 }, { pct: -0.4 }, { pct: 2.1 }, { pct: 0.5 }],
    weekly_profit: 2226,
    discipline_score: 78,
    missions_summary: [{ type: 'overtrading', label: 'Overtrading', date: '2026-07-01', status: 'completed' }],
  },
  {
    user_id: 'demo-1', username: 'Marco', balance: 61200, account_count: 2,
    daily_pct: [{ pct: 2.5 }, { pct: 1.1 }, { pct: 0.9 }, { pct: 1.8 }, { pct: 0.6 }],
    weekly_profit: 4223,
    discipline_score: 91,
    missions_summary: [
      { type: 'revenge', label: 'Revenge Trading', date: '2026-06-20', status: 'completed' },
      { type: 'stoploss', label: 'Stop Loss', date: '2026-07-02', status: 'completed' },
    ],
  },
  {
    user_id: 'demo-2', username: 'Luca', balance: 48900, account_count: 3,
    daily_pct: [{ pct: -1.2 }, { pct: 0.4 }, { pct: -0.8 }, { pct: 1.5 }, { pct: null }],
    weekly_profit: -55,
    discipline_score: 54,
    missions_summary: [{ type: 'revenge', label: 'Revenge Trading', date: '2026-07-08', status: 'failed' }],
  },
  {
    user_id: 'demo-3', username: 'Sara', balance: 39500, account_count: 1,
    daily_pct: [{ pct: -2.1 }, { pct: -1.5 }, { pct: 0.3 }, { pct: -0.9 }, { pct: null }],
    weekly_profit: -1660,
    discipline_score: 38,
    missions_summary: [
      { type: 'overtrading', label: 'Overtrading', date: '2026-07-07', status: 'failed' },
      { type: 'stoploss', label: 'Stop Loss', date: '2026-07-09', status: 'failed' },
    ],
  },
]

const THEME_KEY = 'trading-accounts:theme'

// Gate di autenticazione: mostra login, poi (se necessario) il cambio password obbligatorio
// al primo accesso, poi l'app vera e propria (AppShell) — invariata rispetto a prima.
export default function App() {
  const {
    session, profile, loading, authError, profileError,
    signIn, signOut, resetPasswordForEmail, updatePassword, updateUsername, reauthenticate,
  } = useAuth()

  if (authError) {
    return (
      <div className={styles.authErrorScreen}>
        <p>Impossibile contattare il server di autenticazione.</p>
        <p className={styles.authErrorDetail}>{authError}</p>
      </div>
    )
  }
  if (loading) return <div className={styles.authLoadingScreen}>Caricamento…</div>
  if (!session) return <LoginPage onSignIn={signIn} onResetPassword={resetPasswordForEmail} />
  if (profileError) {
    return (
      <div className={styles.authErrorScreen}>
        <p>Impossibile caricare il tuo profilo. Accesso bloccato per sicurezza.</p>
        <p className={styles.authErrorDetail}>{profileError}</p>
        <button type="button" className={styles.logoutBtn} onClick={signOut}>Logout</button>
      </div>
    )
  }
  // must_change_password di default true (anche se il profilo non è ancora arrivato) così
  // non si corre mai il rischio di saltare il cambio password per un caricamento in ritardo.
  if (!profile || profile.must_change_password) {
    return (
      <SetPasswordPage
        onUpdatePassword={updatePassword}
        onUpdateUsername={updateUsername}
        initialUsername={profile?.username}
        onSignOut={signOut}
      />
    )
  }
  if (profile.status === 'disabled') {
    return (
      <div className={styles.authErrorScreen}>
        <p>Il tuo account è stato disattivato.</p>
        <button type="button" className={styles.logoutBtn} onClick={signOut}>Logout</button>
      </div>
    )
  }

  return (
    <AppShell
      profile={profile}
      onSignOut={signOut}
      updatePassword={updatePassword}
      updateUsername={updateUsername}
      reauthenticate={reauthenticate}
    />
  )
}

function AppShell({ profile, onSignOut, updatePassword, updateUsername, reauthenticate }) {
  const isAdmin = profile?.role === 'admin'
  const [tab, setTab] = useState('dashboard')
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [showInactiveDashboard, setShowInactiveDashboard] = useState(false)
  const [showInactiveAnalytics, setShowInactiveAnalytics] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  const [sfxMuted, setSfxMutedState] = useState(() => isSfxMuted())
  const [motionDisabled, setMotionDisabledState] = useState(() => isMotionDisabled())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.motion = motionDisabled ? 'reduced' : 'full'
  }, [motionDisabled])

  function handleSfxToggle(muted) {
    setSfxMuted(muted)
    setSfxMutedState(muted)
  }

  function handleMotionToggle(disabled) {
    setMotionDisabled(disabled)
    setMotionDisabledState(disabled)
  }

  // Sfx + effetto visivo "burst" delegati su tutta l'app: un solo listener invece di richiamare
  // playX()/spawnBurst() in ogni form/pulsante. Il tipo si sceglie dal contesto del bottone
  // (dentro la nav = cambio sezione, submit = salvataggio, testo "elimina"/"conferma" = azione
  // distruttiva, resto = click generico) — stessa classificazione per suono e colore del burst.
  useEffect(() => {
    function spawnBurst(x, y, color) {
      const el = document.createElement('span')
      el.className = 'click-burst'
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.style.borderColor = color
      document.body.appendChild(el)
      el.addEventListener('animationend', () => el.remove())
      setTimeout(() => el.remove(), 500)
    }

    function handleClick(e) {
      const btn = e.target.closest('button')
      if (!btn || btn.disabled) return
      const text = (btn.textContent || '').trim().toLowerCase()
      let color = 'var(--text-muted)'
      if (btn.closest(`.${styles.tabs}`)) {
        playNav()
        color = 'var(--accent)'
      } else if (text.includes('elimina') || text === 'conferma') {
        playDelete()
        color = 'var(--red)'
      } else if (btn.type === 'submit') {
        playSave()
        color = 'var(--green)'
      } else {
        playClick()
      }
      if (!isMotionDisabled()) spawnBurst(e.clientX, e.clientY, color)
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])
  const {
    accounts,
    entries,
    payouts,
    addAccount,
    deleteAccount,
    toggleAccountActive,
    saveDayEntry,
    updateEntry,
    saveOvertradingDay,
    deleteEntry,
    importCsvEntries,
    recordPayout,
    getAccountBalance,
    getAccountSeries,
    getAnalytics,
    getSummaryAnalytics,
    getOvertradingAnalytics,
    getBehaviorProgress,
    getWeeklyAnalytics,
    getFriendsSnapshot,
    getThreshold,
    exportData,
    importData,
    deleteAllAccounts,
  } = useTradingData()

  const {
    missions, generateMissions, dismissMission, setMissionOutcome, clearMissionOutcome, deleteAllMissions,
  } = useMissions(entries)
  const {
    rows: leaderboardRows, loading: leaderboardLoading, publish: publishLeaderboard, remove: removeLeaderboardRow,
  } = useLeaderboard()

  // Reset completo su richiesta dell'utente da Impostazioni: cancella conti (+ entries/payout a
  // cascata), missioni, e la propria riga nella classifica condivisa. NON tocca login/profilo:
  // l'account resta valido, riparte solo con il journal vuoto.
  async function handleDeleteAllData() {
    await deleteAllAccounts()
    await deleteAllMissions()
    if (profile) await removeLeaderboardRow(profile.id)
  }

  // Pubblica lo snapshot (solo aggregati, mai trade/note) ogni volta che apri Friends, così i
  // tuoi amici vedono sempre i tuoi numeri aggiornati all'ultima volta che hai controllato.
  useEffect(() => {
    if (tab !== 'friends' || !profile) return
    const activeAccountIds = accounts.filter((a) => a.active).map((a) => a.id)
    const { balance, accountCount, dailyPct, weeklyProfit } = getFriendsSnapshot(activeAccountIds)
    const disciplineScore = getBehaviorProgress(activeAccountIds).disciplineScore
    const missionsSummary = missions
      .map((m) => ({ ...evaluateMission(m, entries), type: m.type }))
      .filter((m) => m.status === 'failed' || m.status === 'completed')
      .map((m) => ({ type: m.type, label: MISSION_TYPES[m.type].label, date: m.startDate, status: m.status }))

    publishLeaderboard({
      userId: profile.id,
      username: profile.username,
      balance,
      accountCount,
      dailyPct,
      weeklyProfit,
      disciplineScore,
      missionsSummary,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const dashboardAccounts = accounts.filter((a) => a.active || showInactiveDashboard)
  const analyticsAccounts = accounts.filter((a) => a.active || showInactiveAnalytics)

  return (
    <div className={styles.app}>
      <div className={styles.ambientGlow} aria-hidden="true">
        <span className={styles.glowA} />
        <span className={styles.glowB} />
        <span className={styles.glowC} />
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>
          <img src="/favicon.svg" alt="" className={styles.logo} />
          Stratton Account Manager
        </h1>
        <nav className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className={styles.tabIcon}>{TAB_ICONS[t.id]}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className={styles.userBadge}>
          <span className={styles.userName}>{profile?.username}</span>
        </div>
        <ThemeToggle theme={theme} onChange={setTheme} />
        <SettingsMenu
          profile={profile}
          isAdmin={isAdmin}
          onUpdatePassword={updatePassword}
          onUpdateUsername={updateUsername}
          onReauthenticate={reauthenticate}
          onOpenAdmin={() => setTab('admin')}
          onDeleteAllData={handleDeleteAllData}
          onSignOut={onSignOut}
          sfxMuted={sfxMuted}
          onToggleSfx={handleSfxToggle}
          motionDisabled={motionDisabled}
          onToggleMotion={handleMotionToggle}
        />
      </header>

      <main className={styles.main}>
        <div key={tab} className={styles.tabContent}>
        {tab === 'dashboard' && (
          <div className={styles.dashboardGrid}>
            <div className={styles.side}>
              <AccountForm onCreate={addAccount} />
              <OvertradingForm accounts={accounts.filter((a) => a.active)} onSave={saveOvertradingDay} />
              <QuickEntryForm accounts={accounts.filter((a) => a.active)} onSave={saveDayEntry} />
              <DayEntryForm accounts={accounts.filter((a) => a.active)} onSave={saveDayEntry} />
            </div>
            <div className={styles.content}>
              <div className={styles.toolbar}>
                <DataBackup exportData={exportData} importData={importData} />
                <PayoutForm accounts={accounts.filter((a) => a.active)} onSave={recordPayout} />
                <CsvImportForm accounts={accounts} onImport={importCsvEntries} />
              </div>
              <LegacyImportBanner importData={importData} />
              <OvertradingBanner accounts={accounts} entries={entries} />
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
                getAccountSeries={getAccountSeries}
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
                theme={theme}
                motionEnabled={!motionDisabled}
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
            <AnalyticsView
              accounts={analyticsAccounts}
              entries={entries}
              getAnalytics={getAnalytics}
              getSummaryAnalytics={getSummaryAnalytics}
              getOvertradingAnalytics={getOvertradingAnalytics}
              getAccountBalance={getAccountBalance}
              getThreshold={getThreshold}
            />
          </>
        )}

        {tab === 'calendar' && <CalendarView accounts={accounts} entries={entries} />}

        {tab === 'history' && (
          <HistoryView
            accounts={accounts}
            entries={entries}
            onDeleteEntry={deleteEntry}
            onUpdateEntry={updateEntry}
            onSaveDayEntry={saveDayEntry}
          />
        )}

        {tab === 'weekly' && <WeeklyReview accounts={analyticsAccounts} getWeeklyAnalytics={getWeeklyAnalytics} />}

        {tab === 'missions' && (
          <RecoveryMissions
            accounts={analyticsAccounts}
            entries={entries}
            missions={missions}
            onGenerate={generateMissions}
            onDismiss={dismissMission}
            onSetOutcome={setMissionOutcome}
            onClearOutcome={clearMissionOutcome}
          />
        )}

        {tab === 'behavior' && (
          <BehaviorProgress data={getBehaviorProgress(analyticsAccounts.map((a) => a.id))} />
        )}

        {tab === 'friends' && (
          <FriendsView rows={DEMO_ROWS} currentUserId="demo-you" loading={false} />
        )}

        {tab === 'calculator' && <CalculatorTab />}

        {tab === 'propfirms' && <PropFirmFinder />}

        {tab === 'admin' && isAdmin && (
          <div className={styles.adminWrap}>
            <button type="button" className={styles.backLink} onClick={() => setTab('dashboard')}>← Torna</button>
            <AdminPanel />
          </div>
        )}
        </div>
      </main>
    </div>
  )
}
