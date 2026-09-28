export function describeDecisionMemory(
  memory,
  selectedHotel = {},
) {
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
    const selectedDistance = Number(
      selectedHotel
        ?.distance_from_work_location_km,
    );

    if (
      Number.isFinite(selectedDistance)
    ) {
      if (
        selectedDistance <= limit
      ) {
        return (
          `Your manager previously preferred hotels within `
          + `${limit} km of this workplace. `
          + `The selected hotel is ${selectedDistance} km away `
          + `and satisfies that remembered preference.`
        );
      }

      return (
        `Your manager previously preferred hotels within `
        + `${limit} km of this workplace. `
        + `The selected hotel is ${selectedDistance} km away, `
        + `so the preference was recalled but is not satisfied `
        + `by the current recommendation.`
      );
    }

    return (
      `Your manager previously preferred hotels within `
      + `${limit} km of this workplace. `
      + `TripGuard recalled that preference, but the current `
      + `hotel distance could not be verified.`
    );
  }

  const preferences =
    Array.isArray(memory?.preferences)
      ? memory.preferences
      : [];

  const preference =
    preferences.find(
      (item) => item?.reason,
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
