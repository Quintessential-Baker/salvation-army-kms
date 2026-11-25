// js/november_menu_import.js — Self-Learning Portion Forecaster (Waste-Tight Buffer & Feedback Loop) + November 2026 Menu Scheduler

import { uid, cleanItemName } from './utils.js';
import { state, saveState, logActivity } from './state.js';

export const SEED_PORTION_BASELINE = 65;
export const FULL_LEARNING_SAMPLE_SIZE = 12;

export const NOVEMBER_2026_SCHEDULE = [
  { date: '2026-11-02', title: 'Hamburgers', sides: 'French Fries & Chips', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-03', title: 'CLOSED - ELECTION DAY', sides: '', status: 'CLOSED', circumstance: 'Closed / Federal Holiday', eventBoost: 0 },
  { date: '2026-11-04', title: 'Mac & Cheese', sides: 'Green Beans', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-06', title: 'Soup and Ham & Cheese Sandwich', sides: '', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-09', title: 'Ravioli', sides: 'Bread Sticks (2)', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-10', title: 'Sausage gravy over Biscuits and cheese omelet', sides: '', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-11', title: 'KITCHEN CLOSED', sides: '', status: 'CLOSED', circumstance: 'Closed / Federal Holiday', eventBoost: 0 },
  { date: '2026-11-13', title: 'Fish Sticks', sides: 'Tater Tots & Cole Slaw', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-16', title: 'Chicken Sandwich', sides: 'Chips', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-17', title: 'Goulash', sides: 'Bread Sticks (2)', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-18', title: 'Hot Dogs', sides: 'Hot Dogs (2) & Baked Beans', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-20', title: 'Beef Stew over noodles', sides: '', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-23', title: 'Tuna Salad Sandwich', sides: 'Tuna Salad Sandwich & chips', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-24', title: 'Thanksgiving Dinner', sides: '', status: 'PLANNED', circumstance: 'Holiday Week', eventBoost: 1.15 },
  { date: '2026-11-25', title: 'Leftovers', sides: '', status: 'PLANNED', circumstance: 'Normal Day', eventBoost: 1.0 },
  { date: '2026-11-26', title: 'CLOSED - THANKSGIVING DAY', sides: '', status: 'CLOSED', circumstance: 'Closed / Federal Holiday', eventBoost: 0 },
  { date: '2026-11-27', title: 'CLOSED - OFFICE CLOSED', sides: '', status: 'CLOSED', circumstance: 'Closed / Federal Holiday', eventBoost: 0 }
];

function avg(nums) {
  if (!nums || !nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Rounds a predicted count UP to the nearest 5 portions (e.g., 33 -> 35)
 * so there is a small safety cushion without cooking excessive surplus.
 */
export function roundUpToNearest5(val) {
  if (!val || val <= 0) return 0;
  return Math.max(10, Math.ceil(val / 5) * 5);
}

/**
 * Computes a self-refining cushion factor from recent Planned vs. Served pairs:
 * - If actuals run above planned, slightly raises cushion (up to +14%).
 * - If actuals run below planned, tightens cushion toward 0% (or -3% on heavy surplus) to cut waste.
 */
export function computeRefinedBufferFactor(history) {
  const paired = (history || []).filter(m =>
    m.planned_portions != null &&
    Number(m.planned_portions) > 0 &&
    m.served_portions != null &&
    Number(m.served_portions) > 0 &&
    !['Snow / Cold Snap', 'Heavy Rain / Storm', 'Closed / Federal Holiday'].includes(m.circumstance || '')
  ).slice(-10);

  if (!paired.length) return 1.04;

  const avgDeltaRatio = avg(
    paired.map(m => (Number(m.served_portions) - Number(m.planned_portions)) / Number(m.planned_portions))
  ) ?? 0;

  // Center around +3% baseline cushion, shifting up if short or down if over-planned
  return clamp(1.03 + avgDeltaRatio * 0.65, 0.97, 1.14);
}

/**
 * Recalculates the learned kitchen portion baseline from historical served_portions,
 * phasing out the initial 65-portion seed as real service data accumulates.
 */
export function relearnPortionBaseline(beforeDateStr = null) {
  const servedHistory = (state.menuPlan || [])
    .filter(m =>
      (!beforeDateStr || m.service_date < beforeDateStr) &&
      m.status !== 'CLOSED' &&
      m.served_portions != null &&
      !isNaN(Number(m.served_portions)) &&
      Number(m.served_portions) > 0
    )
    .sort((a, b) => a.service_date.localeCompare(b.service_date));

  const count = servedHistory.length;
  if (!count) {
    return {
      learnedBaseline: SEED_PORTION_BASELINE,
      overallMean: SEED_PORTION_BASELINE,
      recentMean: SEED_PORTION_BASELINE,
      bufferFactor: 1.04,
      sampleCount: 0,
      weight: 0,
      history: []
    };
  }

  const normalHistory = servedHistory.filter(
    m => !['Snow / Cold Snap', 'Heavy Rain / Storm', 'Closed / Federal Holiday'].includes(m.circumstance || '')
  );
  const pool = normalHistory.length >= 3 ? normalHistory : servedHistory;

  const overallMean = avg(pool.map(m => Number(m.served_portions)));
  const recentMean = avg(pool.slice(-8).map(m => Number(m.served_portions))) ?? overallMean;
  const weight = clamp(count / FULL_LEARNING_SAMPLE_SIZE, 0, 1);
  const bufferFactor = computeRefinedBufferFactor(pool);
  const learnedBaseline = Math.round(((1 - weight) * SEED_PORTION_BASELINE + weight * overallMean) * 10) / 10;

  state.learnedPortionBaseline = learnedBaseline;
  state.portionBaselineMeta = {
    learned_from_count: count,
    overall_mean: Math.round(overallMean * 10) / 10,
    recent_mean: Math.round(recentMean * 10) / 10,
    buffer_factor: Math.round(bufferFactor * 1000) / 1000,
    seed_weight: Math.round((1 - weight) * 100) / 100
  };

  return {
    learnedBaseline,
    overallMean,
    recentMean,
    bufferFactor,
    sampleCount: count,
    weight,
    history: pool
  };
}

/**
 * Predicts raw turnout and returns waste-controlled planned_portions (rounded up to nearest 5)
 * for any target date across November, December, and future months.
 */
export function forecastPlannedPortionsForDate(dateStr, eventBoost = 1.0, isClosed = false) {
  if (isClosed || eventBoost === 0) {
    return { rawPredicted: 0, plannedPortions: 0 };
  }

  const { learnedBaseline, overallMean, recentMean, bufferFactor, sampleCount, history } = relearnPortionBaseline(dateStr);
  if (!sampleCount) {
    const raw = SEED_PORTION_BASELINE * eventBoost;
    return { rawPredicted: Math.round(raw), plannedPortions: roundUpToNearest5(raw) };
  }

  const targetDow = new Date(dateStr + 'T12:00:00').getDay();
  const sameDowRows = history.filter(m => new Date(m.service_date + 'T12:00:00').getDay() === targetDow);
  const weekdayMean = avg(sameDowRows.map(m => Number(m.served_portions))) ?? learnedBaseline;

  const coreEstimate = weekdayMean * 0.45 + recentMean * 0.35 + learnedBaseline * 0.2;
  const trendRatio = overallMean > 0 ? clamp(recentMean / overallMean, 0.75, 1.25) : 1.0;
  const rawPredicted = coreEstimate * (0.5 + 0.5 * trendRatio) * bufferFactor * eventBoost;

  return {
    rawPredicted: Math.round(rawPredicted * 10) / 10,
    plannedPortions: roundUpToNearest5(rawPredicted)
  };
}

export function findMatchingRecipe(dishTitle) {
  const clean = cleanItemName(dishTitle).toLowerCase();
  if (!clean || clean.startsWith('closed')) return null;

  const recipes = state.recipes || [];
  let match = recipes.find(r => {
    const rn = String(r.name || '').toLowerCase();
    return rn === clean || rn.includes(clean) || clean.includes(rn);
  });
  if (match) return match;

  const tokens = clean.split(/[^a-z0-9]+/).filter(t => t.length > 2 && !['and', 'with', 'over', 'the'].includes(t));
  let best = null;
  let bestScore = 0;
  recipes.forEach(r => {
    const rn = String(r.name || '').toLowerCase();
    const score = tokens.reduce((acc, tok) => acc + (rn.includes(tok) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  });
  return bestScore > 0 ? best : null;
}

export function applyNovember2026MenuForecast() {
  if (!Array.isArray(state.menuPlan)) state.menuPlan = [];
  const uName = (state.users || []).find(u => u.id === state.activeUserId)?.name || 'System Forecast';
  const baselineInfo = relearnPortionBaseline();
  let updatedCount = 0;

  NOVEMBER_2026_SCHEDULE.forEach(entry => {
    const isClosed = entry.status === 'CLOSED';
    const { plannedPortions } = forecastPlannedPortionsForDate(entry.date, entry.eventBoost, isClosed);
    const rec = isClosed ? null : findMatchingRecipe(entry.title);

    let mp = state.menuPlan.find(m => m.service_date === entry.date);
    if (!mp) {
      mp = {
        id: uid('mp'),
        service_date: entry.date,
        menu_type: 'RECIPE',
        served_portions: isClosed ? 0 : null,
        logged_by: uName
      };
      state.menuPlan.push(mp);
    }

    mp.recipe_id = rec ? rec.id : '';
    mp.custom_title = rec ? rec.name : entry.title;
    mp.planned_portions = plannedPortions;
    mp.status = isClosed ? 'CLOSED' : (mp.status === 'SERVED' ? 'SERVED' : 'PLANNED');
    mp.circumstance = entry.circumstance;
    if (entry.sides) {
      mp.note = mp.note ? `${mp.note} · Sides: ${entry.sides}` : `Sides: ${entry.sides}`;
    }
    updatedCount++;
  });

  logActivity(
    'NOVEMBER MENU FORECAST',
    `Scheduled ${updatedCount} November 2026 days (learned baseline: ${baselineInfo.learnedBaseline}, buffer: ${baselineInfo.bufferFactor}x)`
  );
  saveState();
  return updatedCount;
}

export function recalculateScheduledPortions(startDateStr, endDateStr) {
  if (!Array.isArray(state.menuPlan)) return 0;
  let updated = 0;

  state.menuPlan.forEach(mp => {
    if (mp.service_date < startDateStr || mp.service_date > endDateStr) return;
    if (mp.status === 'SERVED') return;

    const isClosed = mp.status === 'CLOSED' || /closed|holiday/i.test(mp.custom_title || '');
    const boost = /thanksgiving|christmas|easter|holiday/i.test(mp.custom_title || '') && !isClosed ? 1.15 : 1.0;
    const { plannedPortions } = forecastPlannedPortionsForDate(mp.service_date, boost, isClosed);
    mp.planned_portions = plannedPortions;
    updated++;
  });

  if (updated) {
    logActivity('PORTIONS RECALCULATED', `Updated ${updated} planned menu day(s) (${startDateStr} to ${endDateStr}) with self-learning forecast`);
    saveState();
  }
  return updated;
}