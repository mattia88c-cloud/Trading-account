import { useMemo, useState } from 'react'
import DayEntryForm from './DayEntryForm.jsx'
import styles from './HistoryView.module.css'

export default function HistoryView({ accounts, entries, onDeleteEntry, onUpdateEntry }) {
  const [accountFilter, setAccountFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)

  const accountById = useMemo(() => {
    const map = {}
    accounts.forEach((a) => {
      map[a.id] = a
    })
    return map
  }, [accounts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries
      .filter((e) => accountFilter === 'all' || e.accountId === accountFilter)
      .filter((e) => !dateFrom || e.date >= dateFrom)
      .filter((e) => !dateTo || e.date <= dateTo)
      .filter((e) => {
        if (!q) return true
        const accountName = accountById[e.accountId]?.name?.toLowerCase() || ''
        const tags = (e.tags || []).join(' ').toLowerCase()
        return (
          accountName.includes(q) ||
          tags.includes(q) ||
          (e.market || '').toLowerCase().includes(q) ||
          (e.mistake || '').toLowerCase().includes(q) ||
          (e.lesson || '').toLowerCase().includes(q) ||
          (e.whatWentWell || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [entries, accountFilter, dateFrom, dateTo, search, accountById])

  const totalPnl = filtered.reduce((sum, e) => sum + e.profit, 0)

  if (accounts.length === 0) {
    return <p className={styles.empty}>Crea un conto per vedere lo storico.</p>
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filters}>
        <select className={styles.select} value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
          <option value="all">Tutti i conti</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <input
          className={styles.input}
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <span className={styles.rangeSep}>→</span>
        <input
          className={styles.input}
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Cerca per conto, mercato, tag, nota..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className={styles.count}>
          {filtered.length} entry &middot; {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className={styles.list}>
        <div className={styles.rowHeader}>
          <span>Data</span>
          <span>Conto</span>
          <span>Mercato</span>
          <span>Sessione</span>
          <span>Voto</span>
          <span>Tag</span>
          <span>Link</span>
          <span className={styles.alignRight}>P/L</span>
          <span></span>
        </div>
        {filtered.map((e) => {
          const account = accountById[e.accountId]
          return (
            <div key={e.id} className={styles.row}>
              <span>{e.date}</span>
              <span className={styles.accountCell}>
                <span className={styles.dot} style={{ background: account?.color }} />
                {account?.name || '—'}
              </span>
              <span>{e.market || '—'}</span>
              <span>{e.openSession || '—'}</span>
              <span>{e.grade || '—'}</span>
              <span className={styles.tags}>{(e.tags || []).map((t) => `#${t}`).join(' ') || '—'}</span>
              <span className={styles.linkCell}>
                {e.chartUrl ? (
                  <a
                    className={styles.chartLink}
                    href={e.chartUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Apri screenshot TradingView"
                  >
                    Chart
                  </a>
                ) : '—'}
              </span>
              <span className={`${styles.alignRight} ${e.profit >= 0 ? styles.pnlPositive : styles.pnlNegative}`}>
                {e.profit >= 0 ? '+' : ''}{e.profit.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
              </span>
              <span className={styles.actions}>
                {confirmId === e.id ? (
                  <>
                    <button className={styles.cancelBtn} onClick={() => setConfirmId(null)}>Annulla</button>
                    <button
                      className={styles.confirmBtn}
                      onClick={() => {
                        onDeleteEntry(e.id)
                        setConfirmId(null)
                      }}
                    >
                      Conferma
                    </button>
                  </>
                ) : (
                  <>
                    <button className={styles.editBtn} onClick={() => setEditingEntry(e)}>Modifica</button>
                    <button className={styles.deleteBtn} onClick={() => setConfirmId(e.id)}>Elimina</button>
                  </>
                )}
              </span>
            </div>
          )
        })}
        {filtered.length === 0 && <p className={styles.empty}>Nessuna entry trovata con questi filtri.</p>}
      </div>

      {editingEntry && (
        <div className={styles.modalOverlay} onClick={() => setEditingEntry(null)}>
          <div className={styles.modalBox} onClick={(ev) => ev.stopPropagation()}>
            <DayEntryForm
              accounts={accounts}
              initialEntry={editingEntry}
              accountName={accountById[editingEntry.accountId]?.name}
              onSave={(formData) => onUpdateEntry(editingEntry.id, formData)}
              onClose={() => setEditingEntry(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
