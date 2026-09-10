import { useState } from 'react'
import CalendarView from './CalendarView.jsx'
import WeeklyReview from './WeeklyReview.jsx'
import styles from './CalendarPage.module.css'

export default function CalendarPage({
  calendarAccounts, entries, showInactiveCalendar, onToggleShowInactive,
  analyticsAccounts, getWeeklyAnalytics, inactiveToggleClassName,
}) {
  const [subTab, setSubTab] = useState('calendar')

  return (
    <div className={styles.wrap}>
      <div className={styles.subTabs}>
        <button
          type="button"
          className={`${styles.subTab} ${subTab === 'calendar' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('calendar')}
        >
          Calendario
        </button>
        <button
          type="button"
          className={`${styles.subTab} ${subTab === 'weekly' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('weekly')}
        >
          Weekly Review
        </button>
      </div>

      {subTab === 'calendar' && (
        <>
          <label className={inactiveToggleClassName}>
            <input
              type="checkbox"
              checked={showInactiveCalendar}
              onChange={(e) => onToggleShowInactive(e.target.checked)}
            />
            Mostra conti disattivati
          </label>
          <CalendarView accounts={calendarAccounts} entries={entries} />
        </>
      )}

      {subTab === 'weekly' && (
        <WeeklyReview accounts={analyticsAccounts} getWeeklyAnalytics={getWeeklyAnalytics} />
      )}
    </div>
  )
}
