// Conversioni camelCase (JS, usato in tutto il resto dell'app) <-> snake_case (colonne Postgres).
// Tenute in un file solo perché sia useTradingData.js che useMissions.js ne hanno bisogno.

export function accountFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    initialBalance: Number(row.initial_balance),
    maxDrawdown: Number(row.max_drawdown) || 0,
    color: row.color,
    active: row.active,
    createdAt: row.created_at,
  }
}

export function accountToDb(a) {
  return {
    name: a.name,
    type: a.type,
    initial_balance: Number(a.initialBalance),
    max_drawdown: a.maxDrawdown ? Number(a.maxDrawdown) : 0,
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
    initialRisk: row.initial_risk,
    finalRisk: row.final_risk,
    reEntry: row.re_entry,
    hasNews: row.has_news,
    openSession: row.open_session,
    closeSession: row.close_session,
    followedStrategy: row.followed_strategy,
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
    chartUrl: row.chart_url,
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
    initial_risk: e.initialRisk,
    final_risk: e.finalRisk,
    re_entry: e.reEntry,
    has_news: e.hasNews,
    open_session: e.openSession,
    close_session: e.closeSession,
    followed_strategy: e.followedStrategy,
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
    chart_url: e.chartUrl || null,
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
    createdAt: row.created_at,
  }
}

export function payoutToDb(p) {
  return {
    account_id: p.accountId,
    date: p.date,
    amount: Number(p.amount),
  }
}

export function missionFromDb(row) {
  return {
    id: row.id,
    type: row.type,
    accountIds: row.account_ids || [],
    startDate: row.start_date,
    durationDays: row.duration_days,
    problemDescription: row.problem_description,
    goal: row.goal,
    rulesText: row.rules_text,
    manualStatus: row.manual_status,
    createdAt: row.created_at,
  }
}

export function missionToDb(m) {
  return {
    type: m.type,
    account_ids: m.accountIds,
    start_date: m.startDate,
    duration_days: m.durationDays,
    problem_description: m.problemDescription,
    goal: m.goal,
    rules_text: m.rulesText,
    manual_status: m.manualStatus ?? null,
  }
}
