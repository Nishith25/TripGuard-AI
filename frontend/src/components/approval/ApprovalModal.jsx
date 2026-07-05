import {
  useEffect,
  useState,
} from "react";

import ApprovalModal from "../components/approval/ApprovalModal";
import PolicyUploadCard from "../components/policy/PolicyUploadCard";

import {
  API_URL,
  getCurrentPolicy,
  getSystemStatus,
} from "../services/api";

import {
  clearAgentRuns,
  clearApprovalDecisions,
  getAgentRuns,
  getApprovalDecisions,
  saveApprovalDecision,
  updateAgentRunApproval,
} from "../services/storage";


function formatCurrency(
  value,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(
    Number(value || 0),
  );
}


function formatDate(
  value,
) {
  if (!value) {
    return "—";
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    parsedDate,
  );
}


function EmptyList({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="page-empty-list">
      <span>
        {icon}
      </span>

      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>

      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}


export function LandingPage({
  navigate,
}) {
  const workflow = [
    "Understand the request",
    "Retrieve company policy",
    "Search travel inventory",
    "Check live weather",
    "Evaluate every option",
    "Explain the decision",
    "Request human approval",
  ];

  return (
    <div className="landing-page">
      <div className="landing-background-grid" />

      <div className="landing-orb landing-orb-one" />

      <div className="landing-orb landing-orb-two" />

      <header className="landing-header">
        <button
          type="button"
          className="landing-brand"
          onClick={() =>
            navigate("/")
          }
        >
          <span>
            TG
          </span>

          <div>
            <strong>
              TripGuard AI
            </strong>

            <small>
              Agentic travel intelligence
            </small>
          </div>
        </button>

        <nav>
          <button
            type="button"
            onClick={() =>
              navigate(
                "/app/architecture",
              )
            }
          >
            Architecture
          </button>

          <button
            type="button"
            className="landing-nav-cta"
            onClick={() =>
              navigate(
                "/app/trips/new",
              )
            }
          >
            Open workspace
          </button>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-kicker">
              Agentic AI that makes real
              business decisions
            </span>

            <h1>
              Corporate travel planning,

              <em>
                governed by policy.
              </em>
            </h1>

            <p>
              TripGuard AI transforms a
              travel request into an
              explainable itinerary by
              retrieving company rules,
              calling travel and weather
              tools, evaluating alternatives
              and escalating approvals to a
              human manager.
            </p>

            <div className="landing-hero-actions">
              <button
                type="button"
                className="landing-primary-button"
                onClick={() =>
                  navigate(
                    "/app/trips/new",
                  )
                }
              >
                Run the live agent

                <span>
                  ↗
                </span>
              </button>

              <button
                type="button"
                className="landing-secondary-button"
                onClick={() =>
                  navigate("/app")
                }
              >
                Explore dashboard
              </button>
            </div>

            <div className="landing-trust-row">
              <span>
                ✓ Explainable decisions
              </span>

              <span>
                ✓ Human approval
              </span>

              <span>
                ✓ Live tool calls
              </span>
            </div>
          </div>

          <div className="landing-agent-preview">
            <div className="preview-window-bar">
              <div>
                <span />
                <span />
                <span />
              </div>

              <small>
                TripGuard agent run
              </small>
            </div>

            <div className="preview-request-card">
              <span>
                Travel request
              </span>

              <div>
                <strong>
                  HYD
                </strong>

                <i>
                  →
                </i>

                <strong>
                  BLR
                </strong>
              </div>

              <p>
                Important client meeting ·
                Budget ₹18,000
              </p>
            </div>

            <div className="preview-agent-steps">
              {workflow
                .slice(
                  0,
                  5,
                )
                .map(
                  (
                    step,
                    index,
                  ) => (
                    <div key={step}>
                      <span>
                        ✓
                      </span>

                      <p>
                        {step}
                      </p>

                      <small>
                        {index === 4
                          ? "12 options"
                          : "Completed"}
                      </small>
                    </div>
                  ),
                )}
            </div>

            <div className="preview-decision-card">
              <span>
                Policy compliant
              </span>

              <strong>
                Recommended total ₹17,200
              </strong>

              <p>
                Manager approval required
              </p>
            </div>
          </div>
        </section>

        <section className="landing-value-section">
          <div className="landing-section-heading">
            <span>
              How it works
            </span>

            <h2>
              One request. Seven agent
              decisions. One accountable
              outcome.
            </h2>
          </div>

          <div className="landing-workflow-grid">
            {workflow.map(
              (
                step,
                index,
              ) => (
                <article key={step}>
                  <span>
                    {String(
                      index + 1,
                    ).padStart(
                      2,
                      "0",
                    )}
                  </span>

                  <h3>
                    {step}
                  </h3>

                  <p>
                    {
                      [
                        "Extract route, dates, budget, timing and business purpose.",
                        "Read structured rules from the uploaded corporate policy.",
                        "Call flight and hotel tools to retrieve matching options.",
                        "Retrieve destination conditions from a live weather API.",
                        "Compare cost, timing, distance, policy and risk constraints.",
                        "Return the best option with transparent reasoning.",
                        "Keep a manager in control when approval is required.",
                      ][index]
                    }
                  </p>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="landing-final-cta">
          <div>
            <span>
              Agentic travel platform
            </span>

            <h2>
              See the complete agent
              workflow running live.
            </h2>

            <p>
              Upload a policy PDF, enter a
              business trip and watch
              TripGuard call tools, reason
              through constraints and create
              an auditable recommendation.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/app/trips/new",
              )
            }
          >
            Open TripGuard

            <span>
              ↗
            </span>
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <span>
          TripGuard AI · Nishith Reddy
        </span>

        <span>
          LangGraph · FastAPI · React ·
          Open-Meteo
        </span>
      </footer>
    </div>
  );
}


export function DashboardPage({
  navigate,
}) {
  const [
    runs,
    setRuns,
  ] = useState([]);

  const [
    approvals,
    setApprovals,
  ] = useState([]);

  const [
    policySummary,
    setPolicySummary,
  ] = useState(null);

  const [
    backendOnline,
    setBackendOnline,
  ] = useState(false);

  useEffect(() => {
    setRuns(
      getAgentRuns(),
    );

    setApprovals(
      getApprovalDecisions(),
    );

    async function loadStatus() {
      const status =
        await getSystemStatus();

      setBackendOnline(
        status.online,
      );

      try {
        const policy =
          await getCurrentPolicy();

        setPolicySummary(
          policy,
        );
      } catch {
        setPolicySummary(
          null,
        );
      }
    }

    loadStatus();
  }, []);

  const approvedCount =
    approvals.filter(
      (item) =>
        item.status ===
        "approved",
    ).length;

  const pendingApprovalCount =
    approvals.filter(
      (item) =>
        item.status ===
        "pending",
    ).length;

  const pendingRunCount =
    runs.filter(
      (run) =>
        run.approval_status ===
        "pending",
    ).length;

  const pendingCount = Math.max(
    pendingApprovalCount,
    pendingRunCount,
  );

  const latestRun =
    runs[0];

  return (
    <div className="page-stack">
      <div className="dashboard-hero">
        <div>
          <span>
            Agent operations centre
          </span>

          <h2>
            Good to see you, Nishith.
          </h2>

          <p>
            Review system health, active
            policy, recent agent runs and
            approval decisions.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/app/trips/new",
              )
            }
          >
            Plan a new trip

            <span>
              ↗
            </span>
          </button>
        </div>

        <div className="dashboard-hero-visual">
          <span className="dashboard-agent-pulse">
            AI
          </span>

          <div>
            <strong>
              Agent ready
            </strong>

            <p>
              Seven tools available for the
              next travel request.
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-metric-grid">
        <article>
          <span>
            Agent runs
          </span>

          <strong>
            {runs.length}
          </strong>

          <small>
            Stored in this browser
          </small>
        </article>

        <article>
          <span>
            Approved trips
          </span>

          <strong>
            {approvedCount}
          </strong>

          <small>
            Human-reviewed decisions
          </small>
        </article>

        <article>
          <span>
            Awaiting review
          </span>

          <strong>
            {pendingCount}
          </strong>

          <small>
            Requests requiring approval
          </small>
        </article>

        <article>
          <span>
            Backend status
          </span>

          <strong
            className={
              backendOnline
                ? "positive-text"
                : "negative-text"
            }
          >
            {backendOnline
              ? "Online"
              : "Offline"}
          </strong>

          <small>
            FastAPI agent service
          </small>
        </article>
      </div>

      <div className="dashboard-content-grid">
        <section className="page-surface">
          <div className="page-surface-heading">
            <div>
              <span>
                Current policy
              </span>

              <h3>
                Corporate travel controls
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/app/policies",
                )
              }
            >
              Manage
            </button>
          </div>

          {policySummary?.policy ? (
            <div className="policy-summary-grid">
              <div>
                <span>
                  Source
                </span>

                <strong>
                  {policySummary.source ===
                  "uploaded_pdf"
                    ? "Uploaded PDF"
                    : "Built-in policy"}
                </strong>
              </div>

              <div>
                <span>
                  Flight limit
                </span>

                <strong>
                  {policySummary
                    .policy
                    .maximum_round_trip_flight_price
                    ? formatCurrency(
                        policySummary
                          .policy
                          .maximum_round_trip_flight_price,
                      )
                    : "Not specified"}
                </strong>
              </div>

              <div>
                <span>
                  Hotel/night
                </span>

                <strong>
                  {policySummary
                    .policy
                    .maximum_hotel_price_per_night
                    ? formatCurrency(
                        policySummary
                          .policy
                          .maximum_hotel_price_per_night,
                      )
                    : "Not specified"}
                </strong>
              </div>

              <div>
                <span>
                  Approval above
                </span>

                <strong>
                  {policySummary
                    .policy
                    .manager_approval_above
                    ? formatCurrency(
                        policySummary
                          .policy
                          .manager_approval_above,
                      )
                    : "Not specified"}
                </strong>
              </div>
            </div>
          ) : (
            <div className="inline-error">
              Unable to load the active
              policy.
            </div>
          )}
        </section>

        <section className="page-surface">
          <div className="page-surface-heading">
            <div>
              <span>
                Latest agent run
              </span>

              <h3>
                Most recent decision
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/app/activity",
                )
              }
            >
              View all
            </button>
          </div>

          {latestRun ? (
            <div className="latest-run-card">
              <div>
                <span>
                  {
                    latestRun
                      .result
                      ?.status
                  }
                </span>

                <h4>
                  {
                    latestRun
                      .request
                      ?.origin
                  }
                  {" → "}
                  {
                    latestRun
                      .request
                      ?.destination
                  }
                </h4>

                <p>
                  {formatDate(
                    latestRun
                      .created_at,
                  )}
                </p>
              </div>

              <strong>
                {formatCurrency(
                  latestRun
                    .result
                    ?.cost_summary
                    ?.total_cost,
                )}
              </strong>
            </div>
          ) : (
            <EmptyList
              icon="⌁"
              title="No agent runs yet"
              description="Run your first business-trip workflow to populate this dashboard."
              actionLabel="Start a trip"
              onAction={() =>
                navigate(
                  "/app/trips/new",
                )
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}


export function PoliciesPage() {
  return (
    <div className="page-stack">
      <div className="page-introduction">
        <div>
          <span>
            Policy intelligence
          </span>

          <h2>
            Convert company policy into
            agent-readable controls
          </h2>

          <p>
            Upload a text-based corporate
            travel-policy PDF. TripGuard
            extracts limits, booking rules
            and approval thresholds for use
            in every decision.
          </p>
        </div>
      </div>

      <div className="policy-page-grid">
        <section className="page-surface">
          <PolicyUploadCard
            apiUrl={API_URL}
          />
        </section>

        <aside className="page-surface policy-explanation-card">
          <span>
            What the agent reads
          </span>

          <h3>
            Structured policy fields
          </h3>

          <div>
            <p>
              <strong>
                Travel class
              </strong>

              Domestic flight class
              permitted by the company.
            </p>

            <p>
              <strong>
                Price limits
              </strong>

              Maximum flight and nightly
              hotel prices.
            </p>

            <p>
              <strong>
                Location controls
              </strong>

              Maximum hotel distance from
              the workplace.
            </p>

            <p>
              <strong>
                Approval threshold
              </strong>

              Total trip cost requiring
              manager review.
            </p>

            <p>
              <strong>
                Advance booking
              </strong>

              Minimum recommended booking
              period.
            </p>
          </div>

          <div className="information-callout">
            <span>
              !
            </span>

            <p>
              Scanned image-only PDFs
              require OCR and are outside
              the current release scope.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}


function buildResultFromApproval(
  approval,
) {
  const trip =
    approval?.trip || {
      origin:
        approval?.origin
        || null,

      destination:
        approval?.destination
        || null,

      destination_city:
        approval
          ?.destination_city
        || null,

      departure_date:
        approval
          ?.departure_date
        || null,

      return_date:
        approval
          ?.return_date
        || null,

      purpose:
        approval?.purpose
        || null,
    };

  const costSummary =
    approval?.cost_summary || {
      flight_cost:
        Number(
          approval
            ?.flight_cost
          || 0,
        ),

      hotel_cost:
        Number(
          approval
            ?.hotel_cost
          || 0,
        ),

      transport_budget:
        Number(
          approval
            ?.transport_budget
          || 0,
        ),

      total_cost:
        Number(
          approval
            ?.total_cost
          || 0,
        ),

      traveller_budget:
        Number(
          approval
            ?.traveller_budget
          || 0,
        ),

      budget_remaining:
        Number(
          approval
            ?.budget_remaining
          || 0,
        ),

      exception_amount:
        Number(
          approval
            ?.exception_amount
          || 0,
        ),
    };

  const compliance =
    approval?.compliance
    || {};

  return {
    status:
      approval
        ?.recommendation_status
      || (
        compliance.is_compliant
          ? "compliant_recommendation"
          : "exception_required"
      ),

    trip,

    selected_flight:
      approval
        ?.selected_flight
      || {},

    selected_hotel:
      approval
        ?.selected_hotel
      || {},

    cost_summary:
      costSummary,

    compliance,

    policy_coverage:
      approval
        ?.policy_coverage
      || {},

    explanation:
      approval?.explanation
      || approval
        ?.recommendation_explanation
      || "",

    approval_request: {
      prepared:
        true,

      reason:
        approval
          ?.approval_reason
        || (
          "This trip requires "
          + "manager review."
        ),
    },
  };
}


export function ApprovalsPage({
  navigate,
}) {
  const [
    approvals,
    setApprovals,
  ] = useState(
    getApprovalDecisions(),
  );

  const [
    selectedApproval,
    setSelectedApproval,
  ] = useState(null);

  useEffect(() => {
    function refreshApprovals() {
      setApprovals(
        getApprovalDecisions(),
      );
    }

    refreshApprovals();

    window.addEventListener(
      "storage",
      refreshApprovals,
    );

    window.addEventListener(
      "focus",
      refreshApprovals,
    );

    return () => {
      window.removeEventListener(
        "storage",
        refreshApprovals,
      );

      window.removeEventListener(
        "focus",
        refreshApprovals,
      );
    };
  }, []);

  const pendingApprovals =
    approvals.filter(
      (approval) =>
        approval.status ===
        "pending",
    );

  const completedApprovals =
    approvals.filter(
      (approval) =>
        approval.status !==
        "pending",
    );

  function clearHistory() {
    clearApprovalDecisions();

    setApprovals([]);

    setSelectedApproval(
      null,
    );
  }

  function handleApprovalCompleted(
    approval,
  ) {
    const currentRequest =
      selectedApproval;

    const storedApproval =
      saveApprovalDecision(
        approval,
        {
          route:
            currentRequest
              ?.route
            || approval?.route
            || null,

          total_cost:
            currentRequest
              ?.total_cost
            || currentRequest
              ?.cost_summary
              ?.total_cost
            || approval
              ?.cost_summary
              ?.total_cost
            || 0,

          trip_run_id:
            currentRequest
              ?.trip_run_id
            || approval
              ?.trip_run_id
            || null,
        },
      );

    const tripRunId =
      storedApproval
        .trip_run_id;

    if (tripRunId) {
      updateAgentRunApproval(
        tripRunId,
        storedApproval,
      );
    }

    setApprovals(
      getApprovalDecisions(),
    );

    setSelectedApproval(
      null,
    );
  }

  return (
    <>
      <div className="page-stack">
        <div className="page-introduction page-introduction-actions">
          <div>
            <span>
              Manager workspace
            </span>

            <h2>
              Travel approval queue
            </h2>

            <p>
              Review pending employee
              travel requests, inspect
              policy exceptions and record
              an auditable approval or
              rejection decision.
            </p>
          </div>

          {approvals.length > 0 && (
            <button
              type="button"
              className="secondary-action-button"
              onClick={
                clearHistory
              }
            >
              Clear local history
            </button>
          )}
        </div>

        <section className="page-surface">
          <div className="page-surface-heading">
            <div>
              <span>
                Awaiting manager review
              </span>

              <h3>
                Pending requests
              </h3>
            </div>

            <span>
              {
                pendingApprovals
                  .length
              }
              {" pending"}
            </span>
          </div>

          {pendingApprovals.length ===
          0 ? (
            <EmptyList
              icon="✓"
              title="No pending approvals"
              description="Employee travel requests requiring manager review will appear here."
              actionLabel="Open employee workspace"
              onAction={() =>
                navigate(
                  "/app/trips/new",
                )
              }
            />
          ) : (
            <div className="records-list">
              {pendingApprovals.map(
                (approval) => {
                  const compliance =
                    approval
                      .compliance
                    || {};

                  const violations =
                    compliance
                      .violations
                    || [];

                  const route =
                    approval.route
                    || (
                      approval.trip
                        ?.origin
                      && approval.trip
                        ?.destination
                        ? (
                            `${approval.trip.origin}`
                            + " → "
                            + `${approval.trip.destination}`
                          )
                        : "Business trip"
                    );

                  return (
                    <article
                      key={
                        approval.id
                      }
                      className="record-row"
                    >
                      <div className="record-status-icon pending">
                        …
                      </div>

                      <div className="record-main">
                        <div>
                          <span className="record-status pending">
                            Pending review
                          </span>

                          <h3>
                            {route}
                          </h3>
                        </div>

                        <p>
                          Submitted{" "}

                          {formatDate(
                            approval
                              .created_at
                            || approval
                              .stored_at,
                          )}
                        </p>

                        {violations.length >
                          0 && (
                          <blockquote>
                            {
                              violations[0]
                            }

                            {violations.length >
                            1
                              ? (
                                  ` +${
                                    violations.length
                                    - 1
                                  } more`
                                )
                              : ""}
                          </blockquote>
                        )}

                        {violations.length ===
                          0
                          && approval
                            .compliance
                            ?.manual_policy_review_required
                          && (
                            <blockquote>
                              Manual policy
                              review required.
                            </blockquote>
                          )}
                      </div>

                      <div className="record-meta">
                        <strong>
                          {formatCurrency(
                            approval
                              .total_cost
                            || approval
                              .cost_summary
                              ?.total_cost,
                          )}
                        </strong>

                        <span>
                          {approval.id}
                        </span>

                        <button
                          type="button"
                          className="secondary-action-button"
                          onClick={() => {
                            setSelectedApproval(
                              approval,
                            );
                          }}
                        >
                          Review request
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>

        <section className="page-surface">
          <div className="page-surface-heading">
            <div>
              <span>
                Audit history
              </span>

              <h3>
                Completed decisions
              </h3>
            </div>

            <span>
              {
                completedApprovals
                  .length
              }
              {" decisions"}
            </span>
          </div>

          {completedApprovals.length ===
          0 ? (
            <EmptyList
              icon="◷"
              title="No completed decisions"
              description="Approved and rejected travel requests will appear here."
            />
          ) : (
            <div className="records-list">
              {completedApprovals.map(
                (approval) => {
                  const route =
                    approval.route
                    || (
                      approval.trip
                        ?.origin
                      && approval.trip
                        ?.destination
                        ? (
                            `${approval.trip.origin}`
                            + " → "
                            + `${approval.trip.destination}`
                          )
                        : "Business trip"
                    );

                  return (
                    <article
                      key={
                        approval.id
                      }
                      className="record-row"
                    >
                      <div
                        className={
                          `record-status-icon ${
                            approval.status
                          }`
                        }
                      >
                        {approval.status ===
                        "approved"
                          ? "✓"
                          : "!"}
                      </div>

                      <div className="record-main">
                        <div>
                          <span
                            className={
                              `record-status ${
                                approval.status
                              }`
                            }
                          >
                            {
                              approval.status
                            }
                          </span>

                          <h3>
                            {route}
                          </h3>
                        </div>

                        <p>
                          Reviewed by{" "}

                          {approval
                            .reviewer_name
                            || "Manager"}

                          {" · "}

                          {formatDate(
                            approval
                              .decision_at
                            || approval
                              .updated_at
                            || approval
                              .stored_at,
                          )}
                        </p>

                        {approval
                          .review_note
                          && (
                            <blockquote>
                              {
                                approval
                                  .review_note
                              }
                            </blockquote>
                          )}
                      </div>

                      <div className="record-meta">
                        <strong>
                          {formatCurrency(
                            approval
                              .total_cost
                            || approval
                              .cost_summary
                              ?.total_cost,
                          )}
                        </strong>

                        <span>
                          {approval.id}
                        </span>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>

      <ApprovalModal
        open={
          Boolean(
            selectedApproval,
          )
        }
        result={
          selectedApproval
            ? buildResultFromApproval(
                selectedApproval,
              )
            : null
        }
        approvalRequest={
          selectedApproval
        }
        apiUrl={API_URL}
        tripRunId={
          selectedApproval
            ?.trip_run_id
          || null
        }
        onClose={() => {
          setSelectedApproval(
            null,
          );
        }}
        onCompleted={
          handleApprovalCompleted
        }
      />
    </>
  );
}


export function ActivityPage({
  navigate,
}) {
  const [
    runs,
    setRuns,
  ] = useState(
    getAgentRuns(),
  );

  function clearHistory() {
    clearAgentRuns();

    setRuns([]);
  }

  return (
    <div className="page-stack">
      <div className="page-introduction page-introduction-actions">
        <div>
          <span>
            Agent history
          </span>

          <h2>
            Previous workflow runs
          </h2>

          <p>
            Inspect past routes, costs,
            compliance outcomes, weather
            risk and approval status.
          </p>
        </div>

        {runs.length > 0 && (
          <button
            type="button"
            className="secondary-action-button"
            onClick={
              clearHistory
            }
          >
            Clear local history
          </button>
        )}
      </div>

      <section className="page-surface">
        {runs.length === 0 ? (
          <EmptyList
            icon="◷"
            title="No activity recorded"
            description="Completed TripGuard workflows will be saved locally in this browser."
            actionLabel="Run the agent"
            onAction={() =>
              navigate(
                "/app/trips/new",
              )
            }
          />
        ) : (
          <div className="records-list">
            {runs.map(
              (run) => {
                const weatherRisk =
                  run.result
                    ?.weather
                    ?.risk_level
                  || "unknown";

                const compliant =
                  run.result
                    ?.compliance
                    ?.is_compliant;

                return (
                  <article
                    key={
                      run.id
                    }
                    className="activity-card"
                  >
                    <div className="activity-route">
                      <span>
                        {
                          run.request
                            ?.origin
                        }
                      </span>

                      <i>
                        →
                      </i>

                      <span>
                        {
                          run.request
                            ?.destination
                        }
                      </span>
                    </div>

                    <div className="activity-details">
                      <div>
                        <span>
                          Agent decision
                        </span>

                        <strong
                          className={
                            compliant
                              ? "positive-text"
                              : "warning-text"
                          }
                        >
                          {compliant
                            ? "Policy compliant"
                            : "Exception required"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Total cost
                        </span>

                        <strong>
                          {formatCurrency(
                            run.result
                              ?.cost_summary
                              ?.total_cost,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Weather risk
                        </span>

                        <strong className="capitalize">
                          {weatherRisk}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Approval
                        </span>

                        <strong className="capitalize">
                          {
                            run.approval_status
                            || "not required"
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="activity-footer">
                      <span>
                        {formatDate(
                          run.created_at,
                        )}
                      </span>

                      <span>
                        {
                          run.trace
                            ?.length
                          || 0
                        }
                        {" tool events"}
                      </span>

                      <span>
                        {run.id}
                      </span>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
    </div>
  );
}


export function ArchitecturePage() {
  const architectureSteps = [
    {
      number:
        "01",

      title:
        "Requirement Planner",

      description:
        "Converts the traveller's input into structured route, date, budget, timing and purpose constraints.",
    },
    {
      number:
        "02",

      title:
        "Policy Retrieval Tool",

      description:
        "Loads company rules extracted from the uploaded corporate travel-policy PDF.",
    },
    {
      number:
        "03",

      title:
        "Flight Search Tool",

      description:
        "Retrieves matching round-trip flight inventory for the requested route.",
    },
    {
      number:
        "04",

      title:
        "Hotel Search Tool",

      description:
        "Finds hotels in the destination and checks price, rating and workplace distance.",
    },
    {
      number:
        "05",

      title:
        "Weather Intelligence Tool",

      description:
        "Calls Open-Meteo to retrieve live forecast conditions and assess disruption risk.",
    },
    {
      number:
        "06",

      title:
        "Policy Compliance Tool",

      description:
        "Evaluates every flight-hotel combination against traveller and company constraints.",
    },
    {
      number:
        "07",

      title:
        "Decision Agent",

      description:
        "Selects the best option, explains the decision and prepares an approval request.",
    },
    {
      number:
        "08",

      title:
        "Human Manager",

      description:
        "Retains final authority to approve or reject qualifying recommendations.",
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-introduction">
        <div>
          <span>
            System architecture
          </span>

          <h2>
            How TripGuard reasons from
            request to approval
          </h2>

          <p>
            The workflow separates
            planning, retrieval, external
            tool use, policy evaluation and
            human control into explicit
            stages.
          </p>
        </div>
      </div>

      <section className="architecture-hero">
        <div>
          <span>
            User request
          </span>

          <strong>
            HYD → BLR
          </strong>

          <p>
            Dates · Budget · Purpose ·
            Arrival constraint
          </p>
        </div>

        <i>
          →
        </i>

        <div className="architecture-agent-core">
          <span>
            LangGraph
          </span>

          <strong>
            TripGuard Agent
          </strong>

          <p>
            Stateful multi-step workflow
          </p>
        </div>

        <i>
          →
        </i>

        <div>
          <span>
            Human-controlled outcome
          </span>

          <strong>
            Approved trip
          </strong>

          <p>
            Explainable recommendation and
            audit ID
          </p>
        </div>
      </section>

      <div className="architecture-flow">
        {architectureSteps.map(
          (
            step,
            index,
          ) => (
            <article
              key={
                step.number
              }
            >
              <div>
                <span>
                  {step.number}
                </span>

                {index <
                  architectureSteps.length
                  - 1
                  && (
                    <i />
                  )}
              </div>

              <section>
                <h3>
                  {step.title}
                </h3>

                <p>
                  {
                    step.description
                  }
                </p>
              </section>
            </article>
          ),
        )}
      </div>

      <section className="technology-grid">
        <article>
          <span>
            Orchestration
          </span>

          <strong>
            LangGraph
          </strong>

          <p>
            Stateful tool execution and
            deterministic workflow control.
          </p>
        </article>

        <article>
          <span>
            Backend
          </span>

          <strong>
            FastAPI
          </strong>

          <p>
            Streaming APIs, policy
            processing and approval
            endpoints.
          </p>
        </article>

        <article>
          <span>
            Intelligence
          </span>

          <strong>
            Policy + Weather
          </strong>

          <p>
            PDF rule extraction and live
            destination risk data.
          </p>
        </article>

        <article>
          <span>
            Experience
          </span>

          <strong>
            React
          </strong>

          <p>
            Responsive execution dashboard
            for mobile and desktop.
          </p>
        </article>
      </section>
    </div>
  );
}