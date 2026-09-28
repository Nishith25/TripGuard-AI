export function describeDecisionMemory(memory) {
  if (memory?.status !== "used") {
    return null;
  }

  const limit = Number(
    memory?.max_hotel_distance_km,
  );

  if (
    Number.isFinite(limit)
    && limit > 0
  ) {
    return (
      `Your manager previously preferred a hotel within `
      + `${limit} km of this workplace. `
      + `This recommendation takes that into account.`
    );
  }

  const preferences =
    Array.isArray(memory?.preferences)
      ? memory.preferences
      : [];

  const preference =
    preferences.find(
      (item) =>
        item?.reason,
    );

  if (!preference) {
    return null;
  }

  const labels = {
    urgent_short_notice:
      "Urgent short-notice travel",
    cost_exception:
      "Cost exception context",
    other:
      "Manager travel preference",
  };

  const label =
    labels[preference.type]
    || "Manager preference";

  return (
    `${label}: `
    + `${preference.reason} `
    + `This is remembered context only; `
    + `current company policy still applies.`
  );
}


export function shouldShowPlanningStatus({
  running,
  started,
  error,
  result,
}) {
  return Boolean(
    !result
    && (
      running
      || started
      || error
    )
  );
}


export function getBudgetSummary(
  total,
  budget,
) {
  const difference =
    Math.round(
      Number(budget)
      - Number(total),
    );

  if (
    !Number.isFinite(
      difference,
    )
  ) {
    return "Budget unavailable";
  }

  const amount =
    new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      },
    ).format(
      Math.abs(difference),
    );

  return difference >= 0
    ? `${amount} remaining`
    : `${amount} over budget`;
}
