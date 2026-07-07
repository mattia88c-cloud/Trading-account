# Note per la prossima sessione

Contesto e decisioni non ovvie dal solo codice, per chi riprende il lavoro su questo progetto.

## Cos'è
App React + Vite (dark theme, CSS Modules) per tracciare più conti di trading (personali e prop firm), con dashboard, calendario, analytics, review settimanale e un calcolatore di position size. Dati salvati solo in `localStorage` (nessun backend).

## Modello dati — IMPORTANTE
Il journal registra **una entry aggregata per conto per giorno**, non il singolo trade. Se in un giorno fai 3 trade, li sommi in un'unico `profit` giornaliero. Questo è stato deciso esplicitamente con l'utente (non un'omissione). Di conseguenza:
- "Average win/loss" in Analytics = media per *giorno*, non per singolo trade.
- Campi come size, rischio $, rischio in punti, R:R sono valori "del giorno" (se hai fatto più trade, rappresentano una sintesi).
- Se in futuro si vuole granularità per singolo trade, è un cambio di architettura vero e proprio (flaggato ma mai fatto).

## Threshold / drawdown trailing (`getThreshold` in `useTradingData.js`)
- Ogni conto ha un `maxDrawdown` ($) assegnato in automatico in base al preset di saldo (25k→1k, 50k→2k, 100k→3k, 150k→4.5k), modificabile solo se saldo "Custom".
- La soglia parte a `saldoIniziale - maxDrawdown`, sale solo con nuovi massimi (`highWaterMark`), non scende mai con le perdite, e si blocca (`locked`) una volta raggiunto il saldo iniziale.
- Il colore di "Distanza dal bruciarlo" è proporzionale al `maxDrawdown`: verde >100%, neutro 75-100%, arancione 50-75%, rosso 0-50%.

## Payout
- Un payout è un prelievo registrato separatamente (`payouts` in localStorage, non `entries`).
- **Scelta di design**: il payout riduce sia il saldo visualizzato sia la curva usata per calcolare `highWaterMark`/soglia (stesso `getAccountSeries` unificato). Cioè un prelievo "abbassa anche il record" ai fini della soglia — non è l'unica interpretazione possibile lato prop firm reali (alcuni firm non toccano la trailing drawdown sui payout), ma è quella scelta qui per semplicità. Segnalato esplicitamente all'utente.
- Sul grafico (`EquityCharts.jsx`), il segmento che porta a un payout è colorato diverso (viola, `PAYOUT_COLOR`) con marker più grande, per non confonderlo con una perdita di trading (uso di `segment.borderColor` di Chart.js).

## Import CSV (`csvImport.js`)
- Riconosce colonne per alias (case-insensitive, IT/EN): data, profit/pnl/risultato, symbol/market/strumento, side/lato/direction.
- Aggrega righe con la stessa data in un'unica entry giornaliera (somma profit, conta trade).
- Campi non presenti nel CSV restano `null` (sessione, emozioni, voto, ecc.) — è voluto.
- **Attenzione fuso orario**: qualunque conversione data→stringa DEVE passare da `getFullYear/getMonth/getDate` locali, MAI `toISOString()` (shifta al fuso UTC e sfasa la data di un giorno se il fuso locale è positivo). Bug capitato due volte in questa sessione (generazione dati demo + parsing CSV), sempre stessa causa.

## Analytics — scelte di visualizzazione
- Sezione "Riepilogo generale" (tutti i conti aggregati): usa componenti compatti in griglia (`RankedList`, `HeatmapTable`) per non avere barre lunghissime a schermo intero. L'utente ha esplicitamente **rifiutato** i grafici a colonne Chart.js (troppo vuoti/dispersivi) — non riproporli senza chiedere.
- Card dei singoli conti: restano con `BreakdownBars` (barre orizzontali semplici), voluto più semplice.
- `IdealTradeCard.jsx`: calcola automaticamente le condizioni migliori/peggiori storiche (mercato, sessione, giorno, lato, stato emotivo, lottaggio, punti di rischio) e le mostra come suggerimento. Il "lottaggio consigliato" scala il miglior lottaggio storico proporzionalmente a `currentBalance / initialBalance`.

## Cose esplicitamente NON fatte (richieste ma fuori scope o rimandate)
- Screenshot per trade: scartato per limiti di `localStorage` (~5-10MB), servirebbe storage cloud.
- Contesto di mercato dettagliato (trend, struttura, liquidity) e dettagli esecuzione per singolo trade (prezzo esatto, slippage): richiederebbero il modello per-trade, non implementati.
- Prop firm tracker avanzato (profit target, payout progress, consistency rule): scartato su richiesta esplicita dell'utente ("tutto tranne l'8").

## Deploy
- Repo GitHub: `mattia88c-cloud/Trading-account` (attenzione: il repo git ha root in `trading-accounts/`, NON nella cartella utente — non fare mai `git add` dalla home, altrimenti rischi di committare file personali).
- Deploy su Netlify, build command `npm run build`, publish dir `dist`.
- C'è ancora parecchio dato demo/di test da ripulire prima di considerare il sito "pronto per l'uso reale" (usare Esporta/Importa o svuotare `localStorage`).

## Dev server
- Preview locale: `.claude/launch.json` ha una config `trading-accounts` sulla porta 5174 (`vite.config.js` ha `server.port: 5174, strictPort: true`).
