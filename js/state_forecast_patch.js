// js/state_forecast_patch.js — Drop-in helper to connect forecastWeekday/predictedPortions in js/state.js to the self-learning forecaster

import { forecastPlannedPortionsForDate, relearnPortionBaseline } from './november_menu_import.js';

export function smartForecastWeekday(dateStr) {
  if (!dateStr) return relearnPortionBaseline().learnedBaseline;
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  // Community lunch runs Mon/Tue/Wed/Fri (Thu/Sat/Sun default to 0 unless scheduled)
  if (![1, 2, 3, 5].includes(dow)) return 0;
  return forecastPlannedPortionsForDate(dateStr, 1.0, false).plannedPortions;
}