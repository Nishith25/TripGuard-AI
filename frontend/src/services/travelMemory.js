const TRAVELLER_ID = /^[A-Za-z0-9_-]{3,32}$/;

export function buildTravelRequest(form) {
  const travellerId = form.traveller_id?.trim() || "";
  if (travellerId && !TRAVELLER_ID.test(travellerId)) {
    throw new Error("Use 3–32 letters, numbers, _ or - for the traveller ID.");
  }
  return {...form, traveller_id: travellerId || null};
}

export function buildManagerDecision({
  decision, reviewerName, note = "", feedbackReason = "", maxDistance = "",
}) {
  const result = {
    decision,
    reviewer_name: reviewerName.trim(),
    note: note.trim() || null,
    feedback_reason: decision === "rejected" ? feedbackReason || null : null,
    max_hotel_distance_km: null,
  };
  if (decision === "rejected" && feedbackReason === "hotel_too_far") {
    const value = Number(maxDistance);
    if (maxDistance === "" || !Number.isFinite(value) || value < 0.5 || value > 20) {
      throw new Error("Enter a maximum hotel distance between 0.5 and 20 km.");
    }
    result.max_hotel_distance_km = value;
  }
  return result;
}

export function memorySummary(memory) {
  if (memory?.status === "used") {
    return `Hindsight recalled a past manager preference: hotel within ${memory.max_hotel_distance_km} km of the workplace.`;
  }
  if (memory?.status === "unavailable") {
    return "Hindsight was unavailable. This trip was planned without past decisions.";
  }
  return "No matching past manager decision was found for this traveller and workplace.";
}
