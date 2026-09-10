// Conversioni camelCase (JS, usato in tutto il resto dell'app) <-> snake_case (colonne Postgres).
// Tenute in un file solo perché sia useTradingData.js che useMissions.js ne hanno bisogno.

export function accountFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    initialBalance: Number(row.initial_balance),
    maxDrawdown: Number(row.max_drawdown) || 0,
    fixedThreshold: row.fixed_threshold || false,
    thresholdValue: row.threshold_value !== null && row.threshold_value !== undefined ? Number(row.threshold_value) : null,
    targetProfit: row.target_profit !== null && row.target_profit !== undefined ? Number(row.target_profit) : null,
    accountStage: row.account_stage || 'challenge',
    color: row.color,
    active: row.active,
    burned: row.burned || false,
    burnedAt: row.burned_at || null,
    createdAt: row.created_at,
  }
}

export function accountToDb(a) {
  return {
    name: a.name,
    type: a.type,
    initial_balance: Number(a.initialBalance),
    max_drawdown: a.maxDrawdown ? Number(a.maxDrawdown) : 0,
    fixed_threshold: !!a.fixedThreshold,
    threshold_value: a.thresholdValue !== null && a.thresholdValue !== undefined && a.thresholdValue !== '' ? Number(a.thresholdValue) : null,
    account_stage: a.accountStage || 'challenge',
    color: a.color,
    active: a.active,
  }
}

export function entryFromDb(row) {
  return {
    id: row.id,
    date: row.date,
    accountId: row.account_id,
    profit: Number(row.profit),
    tradesOpened: row.trades_opened,
    tradesEffective: row.trades_effective,
    side: row.side,
    durationMinutes: row.duration_minutes,
    entryTime: row.entry_time,
    exitTime: row.exit_time,
    market: row.market,
    initialSizeMicro: row.initial_size_micro,
    finalSizeMicro: row.final_size_micro,
    sizeUnit: row.size_unit || 'micro',
    initialRisk: row.initial_risk,
    finalRisk: row.final_risk,
    reEntry: row.re_entry,
    hasNews: row.has_news,
    openSession: row.open_session,
    closeSession: row.close_session,
    followedStrategy: row.followed_strategy,
    wouldHaveHitTP: row.would_have_hit_tp,
    riskReward: row.risk_reward,
    outcome: row.outcome,
    closeType: row.close_type,
    grade: row.grade,
    emotionalState: row.emotional_state,
    confidenceLevel: row.confidence_level,
    mistake: row.mistake,
    whatWentWell: row.what_went_well,
    lesson: row.lesson,
    tags: row.tags || [],
    riskPoints: row.risk_points,
    resultPoints: row.result_points,
    tradesWon: row.trades_won,
    tradesLost: row.trades_lost,
    chartUrl: row.chart_url,
    strategy: row.strategy || null,
    overtradingDay: row.overtrading_day,
    estimatedTradeCount: row.estimated_trade_count,
    lostControlAtTrade: row.lost_control_at_trade,
    mainTrigger: row.main_trigger,
    dataQuality: row.data_quality,
    quickNote: row.quick_note,
    tomorrowCorrection: row.tomorrow_correction,
    createdAt: row.created_at,
  }
}

export function entryToDb(e) {
  return {
    account_id: e.accountId,
    date: e.date,
    profit: e.profit,
    trades_opened: e.tradesOpened,
    trades_effective: e.tradesEffective,
    side: e.side,
    duration_minutes: e.durationMinutes,
    entry_time: e.entryTime,
    exit_time: e.exitTime,
    market: e.market,
    initial_size_micro: e.initialSizeMicro,
    final_size_micro: e.finalSizeMicro,
    size_unit: e.sizeUnit || 'micro',
    initial_risk: e.initialRisk,
    final_risk: e.finalRisk,
    re_entry: e.reEntry,
    has_news: e.hasNews,
    open_session: e.openSession,
    close_session: e.closeSession,
    followed_strategy: e.followedStrategy,
    would_have_hit_tp: e.wouldHaveHitTP ?? null,
    risk_reward: e.riskReward,
    outcome: e.outcome,
    close_type: e.closeType,
    grade: e.grade,
    emotional_state: e.emotionalState,
    confidence_level: e.confidenceLevel,
    mistake: e.mistake,
    what_went_well: e.whatWentWell,
    lesson: e.lesson,
    tags: e.tags || [],
    risk_points: e.riskPoints,
    result_points: e.resultPoints,
    trades_won: e.tradesWon,
    trades_lost: e.tradesLost,
    chart_url: e.chartUrl || null,
    strategy: e.strategy || null,
    overtrading_day: e.overtradingDay || false,
    estimated_trade_count: e.estimatedTradeCount,
    lost_control_at_trade: e.lostControlAtTrade,
    main_trigger: e.mainTrigger,
    data_quality: e.dataQuality,
    quick_note: e.quickNote,
    tomorrow_correction: e.tomorrowCorrection,
  }
}

export function payoutFromDb(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    date: row.date,
    amount: Number(row.amount),
    isPhaseReset: row.is_phase_reset || false,
    resetKind: row.reset_kind || null,
    createdAt: row.created_at,
  }
}

export function payoutToDb(p) {
  return {
    account_id: p.accountId,
    date: p.date,
    amount: Number(p.amount),
    is_phase_reset: !!p.isPhaseReset,
    reset_kind: p.resetKind || null,
  }
}

export function propPurchaseFromDb(row) {
  return {
    id: row.id,
    firmName: row.firm_name,
    size: row.size !== null && row.size !== undefined ? Number(row.size) : null,
    cost: Number(row.cost),
    activationFee: row.activation_fee !== null && row.activation_fee !== undefined ? Number(row.activation_fee) : null,
    resetCost: row.reset_cost !== null && row.reset_cost !== undefined ? Number(row.reset_cost) : null,
    currency: row.currency || 'EUR',
    date: row.date,
    createdAt: row.created_at,
  }
}

export function propPurchaseToDb(p) {
  return {
    firm_name: p.firmName,
    size: p.size !== null && p.size !== undefined && p.size !== '' ? Number(p.size) : null,
    cost: p.cost !== null && p.cost !== undefined && p.cost !== '' ? Number(p.cost) : 0,
    activation_fee: p.activationFee !== null && p.activationFee !== undefined && p.activationFee !== '' ? Number(p.activationFee) : null,
    reset_cost: p.resetCost !== null && p.resetCost !== undefined && p.resetCost !== '' ? Number(p.resetCost) : null,
    currency: p.currency === 'USD' ? 'USD' : 'EUR',
    date: p.date,
  }
}

export function propPayoutFromDb(row) {
  return {
    id: row.id,
    firmName: row.firm_name,
    grossAmount: Number(row.gross_amount),
    taxEur: row.tax_eur !== null && row.tax_eur !== undefined ? Number(row.tax_eur) : null,
    netAmountEur: row.net_amount_eur !== null && row.net_amount_eur !== undefined ? Number(row.net_amount_eur) : null,
    date: row.date,
    createdAt: row.created_at,
  }
}

export function propPayoutToDb(p) {
  return {
    firm_name: p.firmName,
    gross_amount: Number(p.grossAmount),
    tax_eur: p.taxEur !== null && p.taxEur !== undefined && p.taxEur !== '' ? Number(p.taxEur) : null,
    net_amount_eur: p.netAmountEur !== null && p.netAmountEur !== undefined && p.netAmountEur !== '' ? Number(p.netAmountEur) : null,
    date: p.date,
  }
}
