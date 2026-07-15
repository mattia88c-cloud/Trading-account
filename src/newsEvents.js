// Date dei rilasci macro USA a impatto più alto su NAS100/XAUUSD: decisioni tassi Fed (FOMC),
// inflazione (CPI, PCE) e occupazione (NFP). FOMC/CPI/PCE sono liste statiche prese dai
// calendari ufficiali (federalreserve.gov, bls.gov, bea.gov) — vanno aggiornate a inizio anno
// con il nuovo calendario quando viene pubblicato. NFP invece si calcola sempre (primo venerdì
// del mese), non serve mantenerlo a mano.

const FOMC_DATES = {
  2026: ['2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17', '2026-07-29', '2026-09-16', '2026-10-28', '2026-12-09'],
}

const CPI_DATES = {
  2026: ['2026-01-13', '2026-02-13', '2026-03-11', '2026-04-10', '2026-05-12', '2026-06-10', '2026-07-14', '2026-08-12', '2026-09-11', '2026-10-14', '2026-11-10', '2026-12-10'],
}

const PCE_DATES = {
  2026: ['2026-04-09', '2026-04-30', '2026-05-28', '2026-06-25', '2026-07-30', '2026-08-26', '2026-09-30', '2026-10-29', '2026-11-25', '2026-12-23'],
}

function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getNfpDates(year) {
  const dates = []
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1)
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1)
    dates.push(toLocalDateStr(d))
  }
  return dates
}

// Mappa "YYYY-MM-DD" -> array di label (di solito una sola, es. ['FOMC']).
export function getHighImpactNewsByDate(year) {
  const map = {}
  function add(byYear, label) {
    (byYear[year] || []).forEach((date) => {
      if (!map[date]) map[date] = []
      map[date].push(label)
    })
  }
  add(FOMC_DATES, 'FOMC')
  add(CPI_DATES, 'CPI')
  add(PCE_DATES, 'PCE')
  getNfpDates(year).forEach((date) => {
    if (!map[date]) map[date] = []
    map[date].push('NFP')
  })
  return map
}
