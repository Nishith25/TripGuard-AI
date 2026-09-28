/* eslint-disable react-hooks/set-state-in-effect */
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

    "Employee requests a trip",

    "AI checks rules",

    "AI recommends options",

    "Manager decides",

    "Feedback becomes memory",

    "Next trip improves",

  ];

  const workflowDescriptions = [

    "The employee enters route, dates, budget and business purpose.",

    "The agent checks travel policy, budget limits and approval rules.",

    "Flights, hotels, distance, weather risk and total cost are compared.",

    "A human manager approves, rejects or gives a correction.",

    "The decision reason is saved as persistent travel memory.",

    "Future recommendations use the remembered manager preference.",

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

              Travel approval agent

            </small>

          </div>

        </button>

        <nav>

          <button

            type="button"

            onClick={() =>

              navigate(

                "/app",

              )

            }

          >

            Product Flow

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

            Start request

          </button>

        </nav>

      </header>

      <main>

        <section className="landing-hero">

          <div className="landing-hero-copy">

            <span className="landing-kicker">

              AI agent · policy checks · decision memory

            </span>

            <h1>

              Travel approvals

              <em>

                that remember decisions.

              </em>

            </h1>

            <p>

              TripGuard helps teams approve business travel faster. The agent checks policy, budget, travel options and weather risk, then learns from manager feedback for future trips.

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

                Start trip request

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

                View Product Flow

              </button>

            </div>

            <div className="landing-trust-row">

              <span>

                ✓ AI agent workflow

              </span>

              <span>

                ✓ Persistent memory

              </span>

              <span>

                ✓ Human approval

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

                Employee travel agent

              </small>

            </div>

            <div className="preview-request-card">

              <span>

                Employee request

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

                Client meeting · Budget ₹18,000 · Traveller EMP_123

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

                          ? "Saved to memory"

                          : "Completed"}

                      </small>

                    </div>

                  ),

                )}

            </div>

            <div className="preview-decision-card">

              <span>

                Memory-aware recommendation

              </span>

              <strong>

                Hotel within manager limit

              </strong>

              <p>

                Recalled a past rejection for hotels too far from the office

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

              One request becomes a recommendation, a manager decision and reusable memory.

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

                    {workflowDescriptions[index]}

                  </p>

                </article>

              ),

            )}

          </div>

        </section>

        <section className="landing-final-cta">

          <div>

            <span>

              Persistent decision memory

            </span>

            <h2>

              The key feature: manager feedback becomes memory.

            </h2>

            <p>

              If a manager rejects a hotel for distance or cost, TripGuard remembers that preference and explains better choices next time.

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

            Try the workflow

            <span>

              ↗

            </span>

          </button>

        </section>

      </main>

      <footer className="landing-footer">

        <span>

          TripGuard AI · AI travel approval platform

        </span>

        <span>

          React · FastAPI · LangGraph · Hindsight memory

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

            Product overview

          </span>

          <h2>

            What TripGuard does

          </h2>

          <p>

            TripGuard turns an employee travel request into an approval-ready recommendation, then saves manager feedback as memory.

          </p>

          <button

            type="button"

            onClick={() =>

              navigate(

                "/app/trips/new",

              )

            }

          >

            Start request

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

              Policy checks, travel options and manager memory in one flow.

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

            Policy setup

          </span>

          <h2>

            Give the agent travel rules

          </h2>

          <p>

            Upload a travel-policy PDF so TripGuard can check limits, booking rules and approval thresholds.

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

            Rules used by the agent

          </span>

          <h3>

            Policy fields

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

              Manager memory

            </span>

            <h2>

              Review travel decisions

            </h2>

            <p>

              Approve, reject or correct a recommendation. TripGuard saves useful feedback for the next trip.

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

                Needs review

              </span>

              <h3>

                Pending decisions

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

              description="Trips needing manager approval will appear here."

              actionLabel="Create request"

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

                Memory history

              </span>

              <h3>

                Saved decisions

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

              description="Manager decisions saved for future trips will appear here."

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

                        {approval.feedback_reason === "hotel_too_far" && (

                          <p>

                            {approval.memory_saved === true

                              ? "Hindsight saved this hotel-distance decision for future trips."

                              : "Hindsight did not save this decision; check the backend memory connection."}

                          </p>

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

export function MemoryPage({

  navigate,

}) {

  const decisions = getApprovalDecisions()
    .filter((approval) => approval.status !== "pending");

  const memoryDecisions =
    decisions.filter(
      (approval) =>
        approval.memory_saved === true,
    );

  const latestMemory = memoryDecisions[0];

  const memoryLabels = {
    hotel_too_far: {
      learning: "Hotel distance",
      impact: "Prefer closer hotels",
    },

    urgent_short_notice: {
      learning: "Short-notice urgency",
      impact:
        "Consider urgent trips even inside the normal advance-booking window",
    },

    cost_exception: {
      learning: "Cost exceptions",
      impact:
        "Consider similar justified budget exceptions",
    },

    other: {
      learning: "Manager preference",
      impact:
        "Use the manager's saved reason on similar future trips",
    },
  };

  const latestMemoryLabel =
    memoryLabels[
      latestMemory?.feedback_reason
    ] || {
      learning: "Manager preference",
      impact:
        "Use saved manager feedback on future trips",
    };

  return (

    <div className="page-stack">

      <div className="page-introduction page-introduction-actions">

        <div>

          <span>

            Decision Memory

          </span>

          <h2>

            What TripGuard remembers

          </h2>

          <p>

            Manager decisions become reusable travel preferences. TripGuard can recall why a trip was approved or rejected and use that context for future recommendations.

          </p>

        </div>

        <button
          type="button"
          className="secondary-action-button"
          onClick={() => navigate("/app/trips/new")}
        >
          Create Trip Request
        </button>

      </div>

      <div className="dashboard-metric-grid">

        <article>

          <span>

            Saved decisions

          </span>

          <strong>

            {decisions.length}

          </strong>

          <small>

            Manager approvals and rejections

          </small>

        </article>

        <article>

          <span>

            Memory signals

          </span>

          <strong>

            {memoryDecisions.length}

          </strong>

          <small>

            Decisions with reusable feedback

          </small>

        </article>

        <article>

          <span>

            Main learning

          </span>

          <strong>

            {memoryDecisions.length > 0
              ? latestMemoryLabel.learning
              : "No memory yet"}

          </strong>

          <small>

            {memoryDecisions.length > 0
              ? "Latest reusable manager preference"
              : "Approve or reject a trip and save reusable feedback"}

          </small>

        </article>

        <article>

          <span>

            Future use

          </span>

          <strong>

            {memoryDecisions.length > 0
              ? latestMemoryLabel.impact
              : "No saved preference"}

          </strong>

          <small>

            {memoryDecisions.length > 0
              ? "Used as context for future recommendations"
              : "Future recommendations have no saved manager preference yet"}

          </small>

        </article>

      </div>

      <section className="page-surface">

        <div className="page-surface-heading">

          <div>

            <span>

              Memory example

            </span>

            <h3>

              Manager preference captured

            </h3>

          </div>

        </div>

        <div className="policy-summary-grid">

          <div>

            <span>

              Traveller

            </span>

            <strong>

              {latestMemory?.traveller_id
                || latestMemory?.trip?.traveller_id
                || "—"}

            </strong>

          </div>

          <div>

            <span>

              Decision

            </span>

            <strong className="capitalize">

              {latestMemory?.status || "—"}

            </strong>

          </div>

          <div>

            <span>

              Reason

            </span>

            <strong>

              {latestMemory?.review_note
                || latestMemoryLabel.learning}

            </strong>

          </div>

          <div>

            <span>

              Future impact

            </span>

            <strong>

              {latestMemoryLabel.impact}

            </strong>

          </div>

        </div>

      </section>

      <section className="page-surface">

        <div className="page-surface-heading">

          <div>

            <span>

              Saved manager feedback

            </span>

            <h3>

              Memory history

            </h3>

          </div>

          <span>

            {memoryDecisions.length}
            {" items"}

          </span>

        </div>

        {memoryDecisions.length === 0 ? (

          <EmptyList
            icon="◷"
            title="No memory saved yet"
            description="Review a trip in Manager Review and add a reason. Saved feedback will appear here."
            actionLabel="Open Manager Review"
            onAction={() => navigate("/app/approvals")}
          />

        ) : (

          <div className="records-list">

            {memoryDecisions.map((approval) => {
              const route = approval.route
                || (
                  approval.trip?.origin && approval.trip?.destination
                    ? `${approval.trip.origin} → ${approval.trip.destination}`
                    : "Business trip"
                );

              return (

                <article
                  key={approval.id}
                  className="record-row"
                >

                  <div className={`record-status-icon ${approval.status}`}>
                    {approval.status === "approved" ? "✓" : "!"}
                  </div>

                  <div className="record-main">

                    <div>

                      <span className={`record-status ${approval.status}`}>
                        {approval.status}
                      </span>

                      <h3>
                        {route}
                      </h3>

                    </div>

                    <p>
                      {approval.review_note || "Manager decision saved as memory for future trips."}
                    </p>

                    {approval.feedback_reason && (
                      <blockquote>
                        Learned preference:{" "}
                        {
                          memoryLabels[
                            approval.feedback_reason
                          ]?.learning
                          || approval.feedback_reason
                            .replaceAll("_", " ")
                        }
                      </blockquote>
                    )}

                  </div>

                  <div className="record-meta">

                    <strong>
                      {formatCurrency(
                        approval.total_cost
                        || approval.cost_summary?.total_cost,
                      )}
                    </strong>

                    <span>
                      Memory
                    </span>

                  </div>

                </article>

              );
            })}

          </div>

        )}

      </section>

    </div>

  );

}

