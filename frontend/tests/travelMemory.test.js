import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTravelRequest,
  buildManagerDecision,
  memorySummary,
} from "../src/services/travelMemory.js";

test("a demo traveller ID is included without modifying trip details", () => {
  const payload = buildTravelRequest({traveller_id: "DEMO_01", origin: "HYD", budget: 18000});
  assert.deepEqual(payload, {traveller_id: "DEMO_01", origin: "HYD", budget: 18000});
  assert.throws(() => buildTravelRequest({traveller_id: "../shared", origin: "HYD"}));
});

test("manager hotel rejection sends a validated preference", () => {
  assert.deepEqual(buildManagerDecision({
    decision: "rejected", reviewerName: "Manager", note: "Early meeting",
    feedbackReason: "hotel_too_far", maxDistance: "2",
  }), {
    decision: "rejected", reviewer_name: "Manager", note: "Early meeting",
    feedback_reason: "hotel_too_far", max_hotel_distance_km: 2,
  });
  assert.throws(() => buildManagerDecision({
    decision: "rejected", reviewerName: "Manager", feedbackReason: "hotel_too_far",
    maxDistance: "",
  }));
});

test("memory summary never claims a recall on an empty or unavailable bank", () => {
  assert.match(memorySummary({status: "none"}), /No matching past/i);
  assert.match(memorySummary({status: "unavailable"}), /unavailable/i);
  assert.match(memorySummary({status: "used", max_hotel_distance_km: 2}), /2 km/i);
});
