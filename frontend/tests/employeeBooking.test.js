import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTripRequest } from '../src/components/workspace/tripRequestValidation.js';
import { describeDecisionMemory, getBudgetSummary, shouldShowPlanningStatus } from '../src/components/workspace/decisionPresentation.js';

const validTrip = {
  traveller_id: 'EMP_123', origin: 'HYD', destination: 'BLR',
  destination_city: 'Bengaluru', departure_date: '2026-10-08',
  return_date: '2026-10-10', budget: 18000,
  work_location: 'Embassy Tech Village', purpose: 'Client meeting',
};

test('traveller identifier is required for personal decision memory', () => {
  assert.match(validateTripRequest({ ...validTrip, traveller_id: '' }).traveller_id, /traveller/i);
});

test('return must be after departure', () => {
  assert.match(validateTripRequest({ ...validTrip, return_date: '2026-10-07' }).return_date, /after/i);
});

test('budget must be positive', () => {
  assert.match(validateTripRequest({ ...validTrip, budget: 0 }).budget, /greater than zero/i);
});

test('valid employee request can proceed', () => {
  assert.deepEqual(validateTripRequest(validTrip), {});
});

test('invalid traveller ID has an inline error', () => {
  assert.match(validateTripRequest({ ...validTrip, traveller_id: 'bad id' }).traveller_id, /letters/i);
});

test('a recalled manager limit is explained in the recommendation', () => {
  assert.match(describeDecisionMemory({ status: 'used', max_hotel_distance_km: 2 }), /within 2 km/);
});

test('an empty or unavailable memory does not claim a past preference', () => {
  assert.equal(describeDecisionMemory({ status: 'none' }), null);
  assert.equal(describeDecisionMemory({ status: 'unavailable' }), null);
});

test('planning failures show a status even before the first agent event', () => {
  assert.equal(shouldShowPlanningStatus({ running: false, started: false, error: 'Failed to fetch', result: null }), true);
});

test('recommendation compares total with the employee budget', () => {
  assert.match(getBudgetSummary(17400, 18000), /₹600 remaining/);
  assert.match(getBudgetSummary(19000, 18000), /₹1,000 over budget/);
});
