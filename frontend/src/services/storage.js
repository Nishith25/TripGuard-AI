import {
  getApprovalRequests,
  getTripRuns,
  updateTripRunApproval,
} from "./api";


const RUNS_KEY =
  "tripguard_agent_runs";

const APPROVALS_KEY =
  "tripguard_approval_decisions";

const MAX_STORED_ITEMS = 100;


function readCollection(key) {
  try {
    const rawValue =
      window.localStorage.getItem(
        key,
      );

    if (!rawValue) {
      return [];
    }

    const parsedValue =
      JSON.parse(rawValue);

    return Array.isArray(
      parsedValue,
    )
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}


function writeCollection(
  key,
  values,
) {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(
        values.slice(
          0,
          MAX_STORED_ITEMS,
        ),
      ),
    );
  } catch {
    // Browser storage can be unavailable
    // in private or restricted modes.
  }
}


function mergeById(
  primaryItems,
  fallbackItems,
) {
  const mergedItems = [];
  const knownIds = new Set();

  for (const item of [
    ...primaryItems,
    ...fallbackItems,
  ]) {
    if (!item?.id) {
      continue;
    }

    if (knownIds.has(item.id)) {
      continue;
    }

    knownIds.add(item.id);
    mergedItems.push(item);
  }

  return mergedItems;
}


function normaliseServerApproval(
  approval,
) {
  const origin =
    approval.trip?.origin;

  const destination =
    approval.trip?.destination;

  return {
    ...approval,

    route:
      origin && destination
        ? `${origin} → ${destination}`
        : null,

    total_cost:
      approval.cost_summary
        ?.total_cost || 0,

    stored_at:
      approval.updated_at ||
      approval.created_at ||
      new Date().toISOString(),
  };
}


export function getAgentRuns() {
  return readCollection(
    RUNS_KEY,
  );
}


export function saveAgentRun(
  run,
) {
  const existingRuns =
    getAgentRuns();

  const withoutDuplicate =
    existingRuns.filter(
      (item) =>
        item.id !== run.id,
    );

  writeCollection(
    RUNS_KEY,
    [
      run,
      ...withoutDuplicate,
    ],
  );

  return run;
}


export function updateAgentRunApproval(
  runId,
  approval,
) {
  if (!runId) {
    return null;
  }

  let updatedRun = null;

  const updatedRuns =
    getAgentRuns().map(
      (run) => {
        if (run.id !== runId) {
          return run;
        }

        updatedRun = {
          ...run,
          approval,
          approval_status:
            approval.status,
          updated_at:
            new Date().toISOString(),
        };

        return updatedRun;
      },
    );

  writeCollection(
    RUNS_KEY,
    updatedRuns,
  );

  updateTripRunApproval(
    runId,
    approval,
  ).catch((error) => {
    console.warn(
      "Trip approval could not be synchronized:",
      error,
    );
  });

  return updatedRun;
}


export function clearAgentRuns() {
  window.localStorage.removeItem(
    RUNS_KEY,
  );
}


export function getApprovalDecisions() {
  return readCollection(
    APPROVALS_KEY,
  );
}


export function saveApprovalDecision(
  approval,
  context = {},
) {
  const storedApproval = {
    ...approval,

    route:
      context.route ||
      approval.route ||
      null,

    total_cost:
      context.total_cost ||
      approval.cost_summary
        ?.total_cost ||
      0,

    trip_run_id:
      context.trip_run_id ||
      approval.trip_run_id ||
      null,

    stored_at:
      approval.updated_at ||
      approval.decision_at ||
      new Date().toISOString(),
  };

  const currentApprovals =
    getApprovalDecisions();

  const withoutDuplicate =
    currentApprovals.filter(
      (item) =>
        item.id !==
        storedApproval.id,
    );

  writeCollection(
    APPROVALS_KEY,
    [
      storedApproval,
      ...withoutDuplicate,
    ],
  );

  return storedApproval;
}


export function clearApprovalDecisions() {
  window.localStorage.removeItem(
    APPROVALS_KEY,
  );
}


export async function syncPersistentData() {
  const [
    tripResult,
    approvalResult,
  ] = await Promise.allSettled([
    getTripRuns(100),
    getApprovalRequests(100),
  ]);

  const localRuns =
    getAgentRuns();

  const localApprovals =
    getApprovalDecisions();

  if (
    tripResult.status ===
    "fulfilled"
  ) {
    const mergedRuns = mergeById(
      tripResult.value,
      localRuns,
    );

    writeCollection(
      RUNS_KEY,
      mergedRuns,
    );
  }

  if (
    approvalResult.status ===
    "fulfilled"
  ) {
    const serverApprovals =
      approvalResult.value.map(
        normaliseServerApproval,
      );

    const mergedApprovals =
      mergeById(
        serverApprovals,
        localApprovals,
      );

    writeCollection(
      APPROVALS_KEY,
      mergedApprovals,
    );
  }

  return {
    trips:
      getAgentRuns(),

    approvals:
      getApprovalDecisions(),

    serverTripsAvailable:
      tripResult.status ===
      "fulfilled",

    serverApprovalsAvailable:
      approvalResult.status ===
      "fulfilled",
  };
}