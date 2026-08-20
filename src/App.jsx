import { useEffect, useState } from 'react'
import { useTradingData } from './useTradingData'
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
  { id: 'behavior', label: 'Progress' },
  { id: 'friends', label: 'Friends' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'propfirms', label: 'Prop Firm' },
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
  const [showInactiveCalendar, setShowInactiveCalendar] = useState(false)
  const [showInactiveHistory, setShowInactiveHistory] = useState(false)
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
    markAccountBurned,
    unmarkAccountBurned,
    setAccountStage,
    updateAccountTarget,
    resetAccountPhase,
    saveDayEntry,
    updateEntry,
    saveOvertradingDay,
    deleteEntry,
    importCsvEntries,
    recordPayout,
    addCapital,
    getAccountBalance,
    getAccountSeries,
    getAnalytics,
    getSummaryAnalytics,
    getFundedTransition,
    getEntryStage,
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
    rows: leaderboardRows, loading: leaderboardLoading, publish: publishLeaderboard, remove: removeLeaderboardRow,
  } = useLeaderboard()

  // Reset completo su richiesta dell'utente da Impostazioni: cancella conti (+ entries/payout a
  // cascata) e la propria riga nella classifica condivisa. NON tocca login/profilo: l'account
  // resta valido, riparte solo con il journal vuoto.
  async function handleDeleteAllData() {
    await deleteAllAccounts()
    if (profile) await removeLeaderboardRow(profile.id)
  }

  // Pubblica lo snapshot (solo aggregati, mai trade/note) ogni volta che apri Friends, così i
  // tuoi amici vedono sempre i tuoi numeri aggiornati all'ultima volta che hai controllato.
  useEffect(() => {
    if (tab !== 'friends' || !profile) return
    const activeAccountIds = accounts.filter((a) => a.active).map((a) => a.id)
    const {
      balance, accountCount, dailyPct, weeklyProfit, monthlyProfit, monthlyPct, quarterlyProfit, quarterlyPct,
    } = getFriendsSnapshot(activeAccountIds)
    const disciplineScore = getBehaviorProgress(activeAccountIds).disciplineScore

    publishLeaderboard({
      userId: profile.id,
      username: profile.username,
      balance,
      accountCount,
      dailyPct,
      weeklyProfit,
      monthlyProfit,
      monthlyPct,
      quarterlyProfit,
      quarterlyPct,
      disciplineScore,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Paper Trading è un conto senza saldo reale: vive solo nel Journal trade (per registrarci le
  // operazioni non legate a un conto vero) e in Analytics (dove i suoi dati non mostrano mai
  // importi in denaro, vedi AnalyticsView) — mai in Dashboard/Calendario/Cronologia, che parlano
  // tutte di saldo/soglie reali.
  const dashboardAccounts = accounts.filter((a) => a.type !== 'paper' && (a.active || showInactiveDashboard))
  const analyticsAccounts = accounts.filter((a) => a.active || showInactiveAnalytics)
  const calendarAccounts = accounts.filter((a) => a.type !== 'paper' && (a.active || showInactiveCalendar))
  const historyAccounts = accounts.filter((a) => a.type !== 'paper' && (a.active || showInactiveHistory))

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
                <PayoutForm accounts={accounts.filter((a) => a.active && a.type !== 'paper')} onSave={recordPayout} />
                <CsvImportForm accounts={accounts.filter((a) => a.type !== 'paper')} onImport={importCsvEntries} />
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
                onMarkBurned={markAccountBurned}
                onUnmarkBurned={unmarkAccountBurned}
                onSetStage={setAccountStage}
                onUpdateTarget={updateAccountTarget}
                onAddCapital={addCapital}
                onResetPhase={resetAccountPhase}
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
              getFundedTransition={getFundedTransition}
              getEntryStage={getEntryStage}
              getOvertradingAnalytics={getOvertradingAnalytics}
              getAccountBalance={getAccountBalance}
              getThreshold={getThreshold}
            />
          </>
        )}

        {tab === 'calendar' && (
          <>
            <label className={styles.inactiveToggle}>
              <input
                type="checkbox"
                checked={showInactiveCalendar}
                onChange={(e) => setShowInactiveCalendar(e.target.checked)}
              />
              Mostra conti disattivati
            </label>
            <CalendarView accounts={calendarAccounts} entries={entries} />
          </>
        )}

        {tab === 'history' && (
          <>
            <label className={styles.inactiveToggle}>
              <input
                type="checkbox"
                checked={showInactiveHistory}
                onChange={(e) => setShowInactiveHistory(e.target.checked)}
              />
              Mostra conti disattivati
            </label>
            <HistoryView
              accounts={historyAccounts}
              entries={entries}
              onDeleteEntry={deleteEntry}
              onUpdateEntry={updateEntry}
              onSaveDayEntry={saveDayEntry}
            />
          </>
        )}

        {tab === 'weekly' && <WeeklyReview accounts={analyticsAccounts} getWeeklyAnalytics={getWeeklyAnalytics} />}

        {tab === 'behavior' && (
          // A differenza delle altre sezioni, Progress mostra sempre lo storico di TUTTI i conti,
          // anche disattivati: lo score disciplina e gli altri dati comportamentali hanno senso
          // solo se guardano l'intero percorso, non solo i conti ancora aperti in questo momento.
          <BehaviorProgress data={getBehaviorProgress(accounts.map((a) => a.id))} />
        )}

        {tab === 'friends' && (
          <FriendsView rows={leaderboardRows} currentUserId={profile?.id} loading={leaderboardLoading} />
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
