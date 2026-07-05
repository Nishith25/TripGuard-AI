const RUNS_KEY =
  "tripguard_agent_runs";

const APPROVALS_KEY =
  "tripguard_approval_decisions";

const MAX_STORED_ITEMS = 50;


function readCollection(key) {
  try {
    const rawValue =
      window.localStorage.getItem(key);

    if (!rawValue) {
      return [];
    }

    const parsedValue =
      JSON.parse(rawValue);

    return Array.isArray(parsedValue)
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
    // Local storage can be unavailable in
    // private or restricted browser modes.
  }
}


export function getAgentRuns() {
  return readCollection(RUNS_KEY);
}


export function saveAgentRun(run) {
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
    return;
  }

  const updatedRuns =
    getAgentRuns().map(
      (run) =>
        run.id === runId
          ? {
              ...run,
              approval,
              approval_status:
                approval.status,
            }
          : run,
    );

  writeCollection(
    RUNS_KEY,
    updatedRuns,
  );
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
      context.route || null,
    total_cost:
      context.total_cost || 0,
    trip_run_id:
      context.trip_run_id || null,
    stored_at:
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