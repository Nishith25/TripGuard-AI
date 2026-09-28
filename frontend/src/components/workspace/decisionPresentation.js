export function describeDecisionMemory(memory) {
  const limit = Number(memory?.max_hotel_distance_km);
  if (memory?.status !== 'used' || !Number.isFinite(limit) || limit <= 0) return null;
  return `Your manager previously preferred a hotel within ${limit} km of this workplace. This recommendation takes that into account.`;
}

export function shouldShowPlanningStatus({ running, started, error, result }) {
  return Boolean(!result && (running || started || error));
}

export function getBudgetSummary(total, budget) {
  const difference = Math.round(Number(budget) - Number(total));
  if (!Number.isFinite(difference)) return 'Budget unavailable';
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(difference));
  return difference >= 0 ? `${amount} remaining` : `${amount} over budget`;
}
