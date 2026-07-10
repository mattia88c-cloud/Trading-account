// Parses a CSV export from a prop firm / broker platform into daily journal entries.
// Recognizes common column name variants (Italian/English) and aggregates
// multiple trade rows on the same date into a single day entry, matching the
// app's per-day data model. Unrecognized fields are simply left empty.

const DATE_ALIASES = ['date', 'data', 'trade date', 'close time', 'closetime', 'open time', 'opentime', 'giorno', 'day']
const PROFIT_ALIASES = ['profit', 'pnl', 'p&l', 'p/l', 'net profit', 'net p&l', 'result', 'risultato', 'profitto', 'guadagno', 'realized pnl', 'net']
const MARKET_ALIASES = ['symbol', 'market', 'strumento', 'instrument', 'product', 'pair', 'ticker', 'contract']
const SIDE_ALIASES = ['side', 'type', 'lato', 'direction', 'action']

function splitCsvLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

function parseCsv(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] !== undefined ? values[i].trim() : '' })
    return row
  })
}

// Tries an exact header match first (in alias priority order), then falls back to
// a "contains" match so compound broker headers (e.g. "Trade Date", "Total Realized PNL")
// are still recognized without short generic aliases (like "net") matching the wrong column.
function findColumn(headers, aliases) {
  for (const alias of aliases) {
    const exact = headers.find((h) => h === alias)
    if (exact) return exact
  }
  for (const alias of aliases) {
    const partial = headers.find((h) => h.includes(alias))
    if (partial) return partial
  }
  return undefined
}

// Formats a Date using its local calendar fields (never toISOString, which shifts
// to UTC and can roll the date back/forward a day depending on the browser's timezone).
function formatLocalDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDate(raw) {
  if (!raw) return null
  const cleaned = raw.trim()
  // Try DD/MM/YYYY or DD.MM.YYYY explicitly first (common in broker exports)
  const dmy = cleaned.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/)
  if (dmy) {
    let [, d, m, y] = dmy
    if (y.length === 2) y = `20${y}`
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    if (!isNaN(date.getTime())) return formatLocalDate(date)
  }
  const parsed = new Date(cleaned)
  if (!isNaN(parsed.getTime())) return formatLocalDate(parsed)
  return null
}

function parseProfit(raw) {
  if (!raw) return null
  const cleaned = raw.replace(/[^0-9.,-]/g, '').replace(',', '.')
  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

function normalizeSide(raw) {
  if (!raw) return null
  const v = raw.toLowerCase()
  if (v.includes('buy') || v.includes('long')) return 'long'
  if (v.includes('sell') || v.includes('short')) return 'short'
  return 'misto'
}

function mostFrequent(values) {
  const counts = {}
  values.forEach((v) => { if (v) counts[v] = (counts[v] || 0) + 1 })
  const entries = Object.entries(counts)
  if (entries.length === 0) return null
  return entries.reduce((best, e) => (e[1] > best[1] ? e : best), entries[0])[0]
}

// Returns { days: [{ date, profit, tradesOpened, tradesEffective, market, side }], skipped }
export function parseCsvToDailyEntries(text) {
  const rows = parseCsv(text)
  if (rows.length === 0) return { days: [], skipped: 0, totalRows: 0 }

  const headers = Object.keys(rows[0])
  const dateCol = findColumn(headers, DATE_ALIASES)
  const profitCol = findColumn(headers, PROFIT_ALIASES)
  const marketCol = findColumn(headers, MARKET_ALIASES)
  const sideCol = findColumn(headers, SIDE_ALIASES)

  if (!dateCol || !profitCol) {
    throw new Error('Il CSV deve contenere almeno una colonna data e una colonna profitto/P&L.')
  }

  const byDate = {}
  let skipped = 0

  rows.forEach((row) => {
    const date = parseDate(row[dateCol])
    const profit = parseProfit(row[profitCol])
    if (!date || profit === null) {
      skipped += 1
      return
    }
    if (!byDate[date]) byDate[date] = { profits: [], markets: [], sides: [] }
    byDate[date].profits.push(profit)
    if (marketCol && row[marketCol]) byDate[date].markets.push(row[marketCol].toUpperCase())
    if (sideCol && row[sideCol]) byDate[date].sides.push(normalizeSide(row[sideCol]))
  })

  const days = Object.entries(byDate).map(([date, d]) => ({
    date,
    profit: d.profits.reduce((s, p) => s + p, 0),
    tradesOpened: d.profits.length,
    tradesEffective: d.profits.length,
    market: mostFrequent(d.markets),
    side: mostFrequent(d.sides),
  }))

  return { days, skipped, totalRows: rows.length }
}
