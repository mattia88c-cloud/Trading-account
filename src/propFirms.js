import toponeLogo from './assets/logos/topone.png'
import topstepLogo from './assets/logos/topstep.png'
import tradeifyLogo from './assets/logos/tradeify.png'
import mffLogo from './assets/logos/mff.png'
import apexLogo from './assets/logos/apex.png'

// Dati statici raccolti manualmente (ricerca web + screenshot ufficiali, luglio 2026).
// Non si aggiornano da soli: le prop firm cambiano prezzi/promo di continuo, quindi qui
// teniamo solo il prezzo di listino (senza sconto) e lasciamo che sia l'utente a inserire
// lo sconto % o il prezzo attuale visto sul sito, tramite gli override in usePropFirmOverrides.
export const PROP_FIRM_OFFERS = [
  // ---------------- TopOneFutures ----------------
  ...[
    { size: 25000, profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: 500, maxContracts: '1 mini / 10 micro', resetFee: 79, activationFee: 0, listinoPrice: 178 },
    { size: 50000, profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: 1000, maxContracts: '3 mini / 30 micro', resetFee: 99, activationFee: 0, listinoPrice: 218 },
    { size: 100000, profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: 1250, maxContracts: '5 mini / 50 micro', resetFee: 189, activationFee: 0, listinoPrice: 398 },
    { size: 150000, profitTarget: 9000, maxDrawdown: 4500, dailyLossLimit: 1850, maxContracts: '7 mini / 70 micro', resetFee: 265, activationFee: 0, listinoPrice: 549 },
  ].map((s) => ({
    id: `topone-elite-daily-${s.size}`,
    firmId: 'topone',
    firmName: 'TopOneFutures',
    accountType: 'Elite Daily',
    ...s,
    drawdownType: 'EOD',
    consistencyEval: 40,
    consistencyFunded: 0,
    minTradingDays: null,
    payoutFrequency: 'Giornaliero',
    payoutFrequencyDays: 1,
    profitSplit: 90,
    priceType: 'monthly',
    notes: 'Nessuna activation fee. Consistency 40% solo in challenge, nessuna da funded.',
  })),
  ...[
    { size: 25000, profitTarget: 1500, maxDrawdown: 1000, maxContracts: '1 mini / 10 micro', activationFee: 139, resetFee: 35, listinoPrice: 139 },
    { size: 50000, profitTarget: 3000, maxDrawdown: 2000, maxContracts: '3 mini / 30 micro', activationFee: 189, resetFee: 35, listinoPrice: 218 },
    { size: 100000, profitTarget: 6000, maxDrawdown: 3000, maxContracts: '5 mini / 50 micro', activationFee: 259, resetFee: 35, listinoPrice: 259 },
    { size: 150000, profitTarget: 9000, maxDrawdown: 4000, maxContracts: '7 mini / 70 micro', activationFee: 359, resetFee: 35, listinoPrice: 369 },
  ].map((s) => ({
    id: `topone-elite-access-${s.size}`,
    firmId: 'topone',
    firmName: 'TopOneFutures',
    accountType: 'Elite Access',
    ...s,
    dailyLossLimit: null,
    drawdownType: 'EOD',
    consistencyEval: 0,
    consistencyFunded: 40,
    minTradingDays: 1,
    payoutFrequency: 'Min 5 giorni, no cadenza fissa (7-10gg tipico)',
    payoutFrequencyDays: 7,
    profitSplit: 90,
    priceType: 'one-time',
    notes: 'Reset fee eval $35 flat; reset fee da funded più alto ($299-$1.349 a seconda size).',
  })),
  ...[
    { size: 25000, maxDrawdown: 1000, dailyLossLimit: 625, maxContracts: '1 mini / 10 micro', listinoPrice: 419 },
    { size: 50000, maxDrawdown: 2000, dailyLossLimit: 1250, maxContracts: '3 mini / 30 micro', listinoPrice: 679 },
    { size: 100000, maxDrawdown: 4000, dailyLossLimit: 2500, maxContracts: '5 mini / 50 micro', listinoPrice: 821 },
    { size: 150000, maxDrawdown: 6000, dailyLossLimit: 3750, maxContracts: '7 mini / 70 micro', listinoPrice: 939 },
  ].map((s) => ({
    id: `topone-instant-sim-${s.size}`,
    firmId: 'topone',
    firmName: 'TopOneFutures',
    accountType: 'Instant Sim Funded',
    ...s,
    profitTarget: null,
    drawdownType: 'EOD',
    consistencyEval: null,
    consistencyFunded: 20,
    minTradingDays: null,
    activationFee: 0,
    resetFee: null,
    payoutFrequency: 'Standard, no cadenza fissa',
    payoutFrequencyDays: 7,
    profitSplit: 90,
    priceType: 'one-time',
    notes: 'Nessuna valutazione, funded istantaneo. Max 3 conti.',
  })),
  ...[
    { size: 25000, maxDrawdown: 1000, dailyLossLimit: 500, maxContracts: '1 mini / 10 micro', listinoPrice: 218 },
    { size: 50000, maxDrawdown: 2000, dailyLossLimit: 1000, maxContracts: '3 mini / 30 micro', listinoPrice: 398 },
    { size: 100000, maxDrawdown: 4000, dailyLossLimit: 2000, maxContracts: '5 mini / 50 micro', listinoPrice: 563 },
    { size: 150000, maxDrawdown: 6000, dailyLossLimit: 3000, maxContracts: '7 mini / 70 micro', listinoPrice: 799 },
  ].map((s) => ({
    id: `topone-ignite-${s.size}`,
    firmId: 'topone',
    firmName: 'TopOneFutures',
    accountType: 'Ignite Instant Funding',
    ...s,
    profitTarget: null,
    drawdownType: 'EOD',
    consistencyEval: null,
    consistencyFunded: 15,
    minTradingDays: null,
    activationFee: 0,
    resetFee: null,
    payoutFrequency: '1 payout alla volta per conto (max 3 conti in parallelo)',
    payoutFrequencyDays: 7,
    profitSplit: 90,
    priceType: 'one-time',
    notes: 'Nessuna valutazione, funded istantaneo. Consistency più severa del gruppo (15%).',
  })),

  // ---------------- Topstep ----------------
  ...[
    { size: 50000, profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: 1000, maxContracts: '5 contratti / 50 micro', listinoPrice: 49 },
    { size: 100000, profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: 2000, maxContracts: '10 contratti / 100 micro', listinoPrice: 99 },
    { size: 150000, profitTarget: 9000, maxDrawdown: 4500, dailyLossLimit: 3000, maxContracts: '15 contratti / 150 micro', listinoPrice: 199 },
  ].flatMap((s) => ([
    {
      id: `topstep-standard-${s.size}`,
      firmId: 'topstep',
      firmName: 'Topstep',
      accountType: 'Trading Combine → Payout Standard',
      ...s,
      drawdownType: 'EOD-trailing',
      consistencyEval: 50,
      consistencyFunded: null,
      minTradingDays: null,
      activationFee: 149,
      resetFee: null,
      payoutFrequency: 'A discrezione dopo min 5 giorni vincenti ($150+/gg)',
      payoutFrequencyDays: 7,
      profitSplit: 90,
      priceType: 'monthly',
      notes: `Path Standard: cap payout XFA $2.000/$3.000/$5.000 a seconda size. Consistency eval: miglior giorno ≤50% del profit target. Esiste anche path "No Activation Fee" più caro al mese (95/149/229) ma senza i $149 di activation. Min payout $125.`,
    },
    {
      id: `topstep-consistency-${s.size}`,
      firmId: 'topstep',
      firmName: 'Topstep',
      accountType: 'Trading Combine → Payout Consistency',
      ...s,
      drawdownType: 'EOD-trailing',
      consistencyEval: 50,
      consistencyFunded: 40,
      minTradingDays: null,
      activationFee: 149,
      resetFee: null,
      payoutFrequency: 'A discrezione dopo min 5 giorni vincenti ($150+/gg)',
      payoutFrequencyDays: 7,
      profitSplit: 90,
      priceType: 'monthly',
      notes: 'Path Consistency: cap payout più alto ($3.000/$4.000/$6.000) ma consistency 40% (miglior giorno ≤40% profitto totale). Min payout $125.',
    },
  ])),

  // ---------------- Tradeify ----------------
  ...[
    { size: 25000, profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: 600, maxContracts: '1 mini / 10 micro', resetFee: 60, listinoPrice: 99 },
    { size: 50000, profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: 1250, maxContracts: '4 mini / 40 micro', resetFee: 95, listinoPrice: 145 },
    { size: 100000, profitTarget: 6000, maxDrawdown: 3500, dailyLossLimit: 2500, maxContracts: '8 mini / 80 micro', resetFee: 169, listinoPrice: 255 },
    { size: 150000, profitTarget: 9000, maxDrawdown: 5000, dailyLossLimit: 3750, maxContracts: '12 mini / 120 micro', resetFee: 229, listinoPrice: 369 },
  ].map((s) => ({
    id: `tradeify-growth-${s.size}`,
    firmId: 'tradeify',
    firmName: 'Tradeify',
    accountType: 'Growth',
    ...s,
    drawdownType: 'EOD',
    consistencyEval: 0,
    consistencyFunded: 35,
    minTradingDays: null,
    activationFee: 0,
    payoutFrequency: 'Ogni 5 giorni',
    payoutFrequencyDays: 5,
    profitSplit: 90,
    priceType: 'one-time',
    notes: 'Pass in 1 giorno possibile. Nessuna consistency in eval.',
  })),
  ...[
    { size: 25000, profitTarget: 1500, maxDrawdown: 1000, maxContracts: '1 mini / 10 micro', resetFee: 65, listinoPrice: 109 },
    { size: 50000, profitTarget: 3000, maxDrawdown: 2000, maxContracts: '4 mini / 40 micro', resetFee: 99, listinoPrice: 165 },
    { size: 100000, profitTarget: 6000, maxDrawdown: 3000, maxContracts: '8 mini / 80 micro', resetFee: 155, listinoPrice: 265 },
    { size: 150000, profitTarget: 9000, maxDrawdown: 4500, maxContracts: '12 mini / 120 micro', resetFee: 215, listinoPrice: 369 },
  ].map((s) => ({
    id: `tradeify-select-eval-${s.size}`,
    firmId: 'tradeify',
    firmName: 'Tradeify',
    accountType: 'Select (valutazione)',
    ...s,
    dailyLossLimit: null,
    drawdownType: 'EOD',
    consistencyEval: 40,
    consistencyFunded: null,
    minTradingDays: null,
    activationFee: 0,
    payoutFrequency: 'Da scegliere a funded: Daily o Flex',
    payoutFrequencyDays: null,
    profitSplit: 90,
    priceType: 'one-time',
    notes: 'Pass in 3 giorni. Da funded si sceglie il path Daily o Flex (vedi righe separate).',
  })),
  ...[
    { size: 25000, maxDrawdown: 1000, dailyLossLimit: 500, maxPayout: 600 },
    { size: 50000, maxDrawdown: 2000, dailyLossLimit: 1000, maxPayout: 1000 },
    { size: 100000, maxDrawdown: 2500, dailyLossLimit: 1250, maxPayout: 1500 },
    { size: 150000, maxDrawdown: 3500, dailyLossLimit: 1750, maxPayout: 2500 },
  ].map((s) => ({
    id: `tradeify-select-daily-${s.size}`,
    firmId: 'tradeify',
    firmName: 'Tradeify',
    accountType: 'Select → Funded Daily',
    ...s,
    profitTarget: null,
    drawdownType: 'EOD',
    consistencyEval: null,
    consistencyFunded: 0,
    minTradingDays: null,
    activationFee: 0,
    resetFee: null,
    maxContracts: null,
    payoutFrequency: 'Giornaliero',
    payoutFrequencyDays: 1,
    profitSplit: 90,
    listinoPrice: null,
    priceType: 'one-time',
    notes: `Path Daily: payout ogni giorno ma con Daily Loss Limit attivo, cap payout $${s.maxPayout}.`,
  })),
  ...[
    { size: 25000, maxDrawdown: 1000, maxPayout: 1250 },
    { size: 50000, maxDrawdown: 2000, maxPayout: 3000 },
    { size: 100000, maxDrawdown: 3000, maxPayout: 4000 },
    { size: 150000, maxDrawdown: 4500, maxPayout: 5000 },
  ].map((s) => ({
    id: `tradeify-select-flex-${s.size}`,
    firmId: 'tradeify',
    firmName: 'Tradeify',
    accountType: 'Select → Funded Flex',
    ...s,
    profitTarget: null,
    dailyLossLimit: null,
    drawdownType: 'EOD',
    consistencyEval: null,
    consistencyFunded: 0,
    minTradingDays: null,
    activationFee: 0,
    resetFee: null,
    maxContracts: null,
    payoutFrequency: 'Ogni 5 giorni vincenti',
    payoutFrequencyDays: 5,
    profitSplit: 90,
    listinoPrice: null,
    priceType: 'one-time',
    notes: `Path Flex: nessun Daily Loss Limit, payout ogni 5 giorni vincenti, cap payout $${s.maxPayout} (più alto del path Daily).`,
  })),
  ...[
    { size: 25000, maxDrawdown: 1000, dailyLossLimit: null, listinoPrice: 345 },
    { size: 50000, maxDrawdown: 2000, dailyLossLimit: 1250, listinoPrice: 492 },
    { size: 100000, maxDrawdown: 4000, dailyLossLimit: 2500, listinoPrice: 660 },
    { size: 150000, maxDrawdown: 5250, dailyLossLimit: 3000, listinoPrice: 796 },
  ].map((s) => ({
    id: `tradeify-lightning-${s.size}`,
    firmId: 'tradeify',
    firmName: 'Tradeify',
    accountType: 'Lightning (istantaneo)',
    ...s,
    profitTarget: null,
    maxContracts: null,
    drawdownType: 'EOD',
    consistencyEval: null,
    consistencyFunded: 20,
    minTradingDays: null,
    activationFee: 0,
    resetFee: null,
    payoutFrequency: 'Ogni 5 giorni',
    payoutFrequencyDays: 5,
    profitSplit: 90,
    priceType: 'one-time',
    notes: 'Nessuna valutazione. Consistency progressiva: 20% al 1° payout, 25% al 2°, 30% dal 3° in poi. Max 5 conti.',
  })),

  // ---------------- MyFundedFutures ----------------
  ...[
    { size: 25000, profitTarget: 1500, maxDrawdown: 1000, maxContracts: '3 contratti', listinoPrice: 109 },
    { size: 50000, profitTarget: 3000, maxDrawdown: 2000, maxContracts: '5 contratti', listinoPrice: 157 },
    { size: 100000, profitTarget: 6000, maxDrawdown: 3000, maxContracts: '8 contratti', listinoPrice: 267 },
    { size: 150000, profitTarget: 9000, maxDrawdown: 4500, maxContracts: '10 contratti', listinoPrice: 347 },
  ].map((s) => ({
    id: `mff-rapid-${s.size}`,
    firmId: 'mff',
    firmName: 'My Funded Futures',
    accountType: 'Rapid',
    ...s,
    dailyLossLimit: null,
    drawdownType: 'EOD (eval) / Intraday realtime (funded)',
    consistencyEval: 50,
    consistencyFunded: 0,
    minTradingDays: 2,
    activationFee: 0,
    resetFee: null,
    payoutFrequency: 'Giornaliero (buffer $2.100 profitti realizzati richiesto)',
    payoutFrequencyDays: 1,
    profitSplit: 90,
    priceType: 'monthly',
    notes: 'Nessun Daily Loss Limit né in eval né funded. Min payout $500.',
  })),
  ...[
    { size: 50000, profitTarget: 3000, maxDrawdown: 2000, maxContracts: '5 contratti', listinoPrice: 227 },
    { size: 100000, profitTarget: 6000, maxDrawdown: 3000, maxContracts: '6 contratti (10 funded)', listinoPrice: 344 },
    { size: 150000, profitTarget: 9000, maxDrawdown: 4500, maxContracts: '9 contratti (15 funded)', listinoPrice: 477 },
  ].map((s) => ({
    id: `mff-pro-${s.size}`,
    firmId: 'mff',
    firmName: 'My Funded Futures',
    accountType: 'Pro',
    ...s,
    dailyLossLimit: null,
    drawdownType: 'EOD',
    consistencyEval: 50,
    consistencyFunded: 0,
    minTradingDays: 2,
    activationFee: 0,
    resetFee: null,
    payoutFrequency: 'Ogni 14 giorni',
    payoutFrequencyDays: 14,
    profitSplit: 80,
    priceType: 'monthly',
    notes: 'Non disponibile in 25k. Add-on gratuito "One Day to Pass": rimuove consistency, target fisso $4.000.',
  })),
  {
    id: 'mff-builder-50000',
    firmId: 'mff',
    firmName: 'My Funded Futures',
    accountType: 'Builder',
    size: 50000,
    profitTarget: 3000,
    maxDrawdown: 2000,
    dailyLossLimit: 1000,
    maxContracts: '4 contratti',
    drawdownType: 'EOD',
    consistencyEval: 0,
    consistencyFunded: 50,
    minTradingDays: 1,
    activationFee: 0,
    resetFee: null,
    payoutFrequency: 'Ogni 2 giorni, cap $2.000/richiesta',
    payoutFrequencyDays: 2,
    profitSplit: 80,
    listinoPrice: 153,
    priceType: 'monthly',
    notes: 'Solo 50k. Variante $1.500 max loss disponibile a -$28/mese. Il più veloce da passare (1 giorno).',
  },
  ...[
    { size: 25000, profitTarget: 1500, maxDrawdown: 1000, maxContracts: '2 contratti', maxPayout: 1000, listinoPrice: 95 },
    { size: 50000, profitTarget: 3000, maxDrawdown: 2000, maxContracts: '3 contratti', maxPayout: 2000, listinoPrice: 153 },
  ].map((s) => ({
    id: `mff-flex-${s.size}`,
    firmId: 'mff',
    firmName: 'My Funded Futures',
    accountType: 'Flex',
    ...s,
    dailyLossLimit: null,
    drawdownType: 'EOD',
    consistencyEval: 50,
    consistencyFunded: 0,
    minTradingDays: 2,
    activationFee: 0,
    resetFee: null,
    payoutFrequency: 'Ogni 5 giorni vincenti',
    payoutFrequencyDays: 5,
    profitSplit: 80,
    priceType: 'monthly',
    notes: `Solo 25k/50k. Nessun buffer richiesto, regola inattività 7gg. Cap payout $${s.maxPayout}, max 5 payout sim poi passa a live.`,
  })),

  // ---------------- Apex Trader Funding ----------------
  ...[
    { size: 25000, profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: 500, maxContracts: '4 mini / 40 micro', listinoPrice: 89 },
    { size: 50000, profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: 1000, maxContracts: '6 mini / 60 micro', listinoPrice: 109 },
    { size: 100000, profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: 1500, maxContracts: '8 mini / 80 micro', listinoPrice: 139 },
    { size: 150000, profitTarget: 9000, maxDrawdown: 4000, dailyLossLimit: 2000, maxContracts: '12 mini / 120 micro', listinoPrice: 229 },
  ].map((s) => ({
    id: `apex-eod-${s.size}`,
    firmId: 'apex',
    firmName: 'Apex Trader Funding',
    accountType: 'EOD Trail',
    ...s,
    drawdownType: 'EOD',
    consistencyEval: 0,
    consistencyFunded: 50,
    minTradingDays: 1,
    activationFee: null,
    resetFee: null,
    payoutFrequency: '2 volte al mese, min 5 giorni qualificanti',
    payoutFrequencyDays: 15,
    profitSplit: 90,
    priceType: 'one-time',
    notes: 'Prezzo mostrato: variante "No Activation Fee". Esiste anche path "Standard" più economico in eval ma con PA activation fee dopo il pass (~$89-149). 100% dei primi $25k di profitto per conto, poi 90/10. Scaletta a 6 payout per PA.',
  })),
  ...[
    { size: 25000, profitTarget: 1500, maxDrawdown: 1000, maxContracts: '4 mini / 40 micro', listinoPrice: 69 },
    { size: 50000, profitTarget: 3000, maxDrawdown: 2000, maxContracts: '6 mini / 60 micro', listinoPrice: 79 },
    { size: 100000, profitTarget: 6000, maxDrawdown: 3000, maxContracts: '8 mini / 80 micro', listinoPrice: 109 },
    { size: 150000, profitTarget: 9000, maxDrawdown: 4000, maxContracts: '12 mini / 120 micro', listinoPrice: 169 },
  ].map((s) => ({
    id: `apex-intraday-${s.size}`,
    firmId: 'apex',
    firmName: 'Apex Trader Funding',
    accountType: 'Intraday Trail',
    ...s,
    dailyLossLimit: null,
    drawdownType: 'Intraday',
    consistencyEval: 0,
    consistencyFunded: 50,
    minTradingDays: 1,
    activationFee: null,
    resetFee: null,
    payoutFrequency: '2 volte al mese, min 5 giorni qualificanti',
    payoutFrequencyDays: 15,
    profitSplit: 90,
    priceType: 'one-time',
    notes: 'Nessun Daily Loss Limit (drawdown già in tempo reale). Prezzo: variante "No Activation Fee".',
  })),
]

export const FIRM_LIST = [
  { id: 'topone', name: 'TopOneFutures', logo: toponeLogo },
  { id: 'topstep', name: 'Topstep', logo: topstepLogo },
  { id: 'tradeify', name: 'Tradeify', logo: tradeifyLogo },
  { id: 'mff', name: 'My Funded Futures', logo: mffLogo },
  { id: 'apex', name: 'Apex Trader Funding', logo: apexLogo },
]

export const FIRM_BY_ID = Object.fromEntries(FIRM_LIST.map((f) => [f.id, f]))

export const ACCOUNT_SIZES = [25000, 50000, 100000, 150000]

// Derivato dai dati stessi (non hardcoded) così resta accurato anche se in futuro aggiungiamo
// offerte con un tipo di drawdown diverso dai soliti EOD/Intraday/EOD-trailing.
export const DRAWDOWN_TYPES = [...new Set(PROP_FIRM_OFFERS.map((o) => o.drawdownType))]

// Calcola il prezzo effettivo di un'offerta applicando l'eventuale override utente
// (sconto % sul listino, oppure prezzo scritto a mano). Senza override, torna il listino.
export function computeEffectivePrice(offer, override) {
  if (!override || !override.mode) return offer.listinoPrice
  if (override.mode === 'manual') {
    const v = Number(override.manualPrice)
    return Number.isFinite(v) && v > 0 ? v : offer.listinoPrice
  }
  if (override.mode === 'discount') {
    const pct = Number(override.discountPercent)
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100 || offer.listinoPrice == null) return offer.listinoPrice
    return Math.round(offer.listinoPrice * (1 - pct / 100) * 100) / 100
  }
  return offer.listinoPrice
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// Punteggio euristico 0-100 (più alto = più difficile passare la valutazione/entrare funded).
// Pesa: target% del saldo, quanto è stretto il drawdown relativo al saldo, severità della
// consistency rule in eval (percentuali basse sono più restrittive) e presenza/strettezza del DLL.
// È una stima nostra per confrontare le firm, non un dato dichiarato dalle prop firm stesse.
export function computeChallengeDifficulty(offer) {
  if (offer.profitTarget == null) return 5 // funded istantaneo, niente valutazione da superare
  const targetPct = (offer.profitTarget / offer.size) * 100
  const drawdownPct = (offer.maxDrawdown / offer.size) * 100
  const scoreTarget = clamp((targetPct / 6) * 40, 0, 40)
  const scoreDrawdown = clamp(((4 - drawdownPct) / 4) * 30, 0, 30)
  const consistency = offer.consistencyEval || 0
  const scoreConsistency = consistency > 0 ? clamp(((50 - consistency) / 50) * 20, 0, 20) : 0
  let scoreDll = 0
  if (offer.dailyLossLimit) {
    const ratio = offer.dailyLossLimit / offer.maxDrawdown
    scoreDll = clamp((1 - ratio) * 10, 0, 10)
  }
  return Math.round(clamp(scoreTarget + scoreDrawdown + scoreConsistency + scoreDll, 0, 100))
}

// Punteggio euristico 0-100 (più alto = più difficile ottenere/massimizzare i payout una volta funded).
// Pesa: severità della consistency rule a funded, quanto è basso il profit split, quanto è
// dilatata la cadenza payout e quanti giorni minimi di trading richiede.
export function computePayoutDifficulty(offer) {
  const consistency = offer.consistencyFunded || 0
  const scoreConsistency = consistency > 0 ? clamp(((50 - consistency) / 50) * 30, 0, 30) : 0
  const split = offer.profitSplit || 90
  const scoreSplit = clamp(((95 - split) / 95) * 20, 0, 20)
  const days = offer.payoutFrequencyDays ?? 7
  const scoreFrequency = clamp((days / 15) * 30, 0, 30)
  const minDays = offer.minTradingDays || 3
  const scoreMinDays = clamp((minDays / 10) * 10, 0, 10)
  return Math.round(clamp(scoreConsistency + scoreSplit + scoreFrequency + scoreMinDays, 0, 100))
}
