import { useMemo, useState } from "react";
import ApprovalModal from "./components/ApprovalModal";
import PolicyUploadCard from "./components/PolicyUploadCard";


const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


function getFutureDate(daysFromToday) {
  const date = new Date();

  date.setDate(
    date.getDate() + daysFromToday,
  );

  return date.toISOString().split("T")[0];
}


const initialForm = {
  origin: "HYD",
  destination: "BLR",
  destination_city: "Bengaluru",
  departure_date: getFutureDate(4),
  return_date: getFutureDate(6),
  budget: 18000,
  arrival_before: "10:00",
  work_location: "Embassy Tech Village",
  purpose: "Important client meeting",
};


function formatCurrency(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
}


function formatStatus(status) {
  const labels = {
    compliant_recommendation:
      "Policy compliant",
    exception_required:
      "Exception required",
    no_inventory:
      "No inventory",
  };

  return (
    labels[status] ||
    "Recommendation generated"
  );
}


function App() {
  const [form, setForm] =
    useState(initialForm);

  const [steps, setSteps] =
    useState([]);

  const [result, setResult] =
    useState(null);

  const [running, setRunning] =
    useState(false);

  const [error, setError] =
    useState("");

  const [started, setStarted] =
    useState(false);

  const [approvalOpen, setApprovalOpen] =
    useState(false);

  const [
    approvalOutcome,
    setApprovalOutcome,
  ] = useState(null);

  const progress = useMemo(() => {
    const totalExpectedSteps = 6;

    return Math.min(
      Math.round(
        (steps.length /
          totalExpectedSteps) *
          100,
      ),
      100,
    );
  }, [steps]);

  function updateField(event) {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "budget"
          ? Number(value)
          : value,
    }));
  }

  function processStreamEvent(
    streamEvent,
  ) {
    if (
      streamEvent.type === "started"
    ) {
      setStarted(true);
      return;
    }

    if (
      streamEvent.type === "step"
    ) {
      setSteps((current) => [
        ...current,
        {
          ...streamEvent,
          timestamp:
            new Date().toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              },
            ),
        },
      ]);

      return;
    }

    if (
      streamEvent.type === "final"
    ) {
      setResult(streamEvent.result);
      return;
    }

    if (
      streamEvent.type === "error"
    ) {
      setError(
        streamEvent.message ||
          "The agent encountered an error.",
      );
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setRunning(true);
    setStarted(false);
    setSteps([]);
    setResult(null);
    setError("");
    setApprovalOpen(false);
    setApprovalOutcome(null);

    try {
      const response = await fetch(
        `${API_URL}/api/plan/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => null);

        throw new Error(
          payload?.detail ||
            `Backend returned HTTP ${response.status}.`,
        );
      }

      if (!response.body) {
        throw new Error(
          "Streaming is not supported by this browser.",
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let buffer = "";

      while (true) {
        const { done, value } =
          await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(
          value,
          {
            stream: true,
          },
        );

        const lines =
          buffer.split("\n");

        buffer =
          lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          try {
            processStreamEvent(
              JSON.parse(line),
            );
          } catch {
            console.error(
              "Invalid stream event:",
              line,
            );
          }
        }
      }

      if (buffer.trim()) {
        processStreamEvent(
          JSON.parse(buffer),
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to TripGuard AI.",
      );
    } finally {
      setRunning(false);
    }
  }

  function openApprovalReview() {
    if (
      !result ||
      result.status === "no_inventory"
    ) {
      return;
    }

    setApprovalOpen(true);
  }

  function handleApprovalCompleted(
    approval,
  ) {
    setApprovalOutcome(approval);
    setApprovalOpen(false);
  }

  const compliance =
    result?.compliance;

  const cost =
    result?.cost_summary;

  const flight =
    result?.selected_flight;

  const hotel =
    result?.selected_hotel;

  const hasRecommendation =
    Boolean(
      result &&
        result.status !==
          "no_inventory" &&
        flight &&
        hotel,
    );

  const approvalButtonText =
    compliance?.approval_required
      ? compliance?.is_compliant
        ? "Review approval"
        : "Review exception"
      : "Approve recommendation";

  return (
    <div className="app-shell">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />
      <div className="background-grid" />

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <span>TG</span>
          </div>

          <div>
            <h1>TripGuard AI</h1>

            <p>
              Autonomous corporate travel
              intelligence
            </p>
          </div>
        </div>

        <div className="system-status">
          <span className="status-dot" />
          Agent system online
        </div>
      </header>

      <main className="dashboard">
        <section className="panel request-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Travel request
              </span>

              <h2>
                Plan a business trip
              </h2>
            </div>

            <span className="panel-number">
              01
            </span>
          </div>

          <PolicyUploadCard
            apiUrl={API_URL}
          />

          <form onSubmit={handleSubmit}>
            <div className="route-row">
              <label>
                <span>From</span>

                <input
                  name="origin"
                  value={form.origin}
                  onChange={updateField}
                  maxLength="3"
                  required
                />
              </label>

              <div className="route-line">
                <span>→</span>
              </div>

              <label>
                <span>To</span>

                <input
                  name="destination"
                  value={
                    form.destination
                  }
                  onChange={updateField}
                  maxLength="3"
                  required
                />
              </label>
            </div>

            <label>
              <span>
                Destination city
              </span>

              <input
                name="destination_city"
                value={
                  form.destination_city
                }
                onChange={updateField}
                required
              />
            </label>

            <div className="field-grid">
              <label>
                <span>Departure</span>

                <input
                  type="date"
                  name="departure_date"
                  value={
                    form.departure_date
                  }
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                <span>Return</span>

                <input
                  type="date"
                  name="return_date"
                  value={
                    form.return_date
                  }
                  onChange={updateField}
                  required
                />
              </label>
            </div>

            <div className="field-grid">
              <label>
                <span>
                  Maximum budget
                </span>

                <input
                  type="number"
                  name="budget"
                  value={form.budget}
                  onChange={updateField}
                  min="1"
                  required
                />
              </label>

              <label>
                <span>
                  Arrive before
                </span>

                <input
                  type="time"
                  name="arrival_before"
                  value={
                    form.arrival_before
                  }
                  onChange={updateField}
                />
              </label>
            </div>

            <label>
              <span>Work location</span>

              <input
                name="work_location"
                value={
                  form.work_location
                }
                onChange={updateField}
                placeholder="Office or meeting location"
              />
            </label>

            <label>
              <span>Purpose</span>

              <textarea
                name="purpose"
                value={form.purpose}
                onChange={updateField}
                rows="3"
                placeholder="Describe the purpose of this trip"
              />
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={running}
            >
              {running ? (
                <>
                  <span className="button-loader" />
                  Agent is working
                </>
              ) : (
                <>
                  Run autonomous agent
                  <span>↗</span>
                </>
              )}
            </button>
          </form>
        </section>

        <section className="panel execution-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Live execution
              </span>

              <h2>Agent activity</h2>
            </div>

            <span className="panel-number">
              02
            </span>
          </div>

          <div className="progress-wrapper">
            <div className="progress-information">
              <span>
                {running
                  ? "Workflow in progress"
                  : result
                    ? "Workflow completed"
                    : "Waiting for request"}
              </span>

              <strong>
                {progress}%
              </strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-value"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <div className="execution-list">
            {!started &&
              steps.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">
                    ⌁
                  </div>

                  <h3>
                    Ready to reason
                  </h3>

                  <p>
                    Submit a request to watch
                    TripGuard retrieve policy,
                    call travel tools and make
                    a decision.
                  </p>
                </div>
              )}

            {started &&
              steps.length === 0 && (
                <div className="starting-agent">
                  <span className="agent-pulse" />
                  Initialising the agent
                  workflow…
                </div>
              )}

            {steps.map(
              (step, index) => (
                <article
                  className="execution-step"
                  key={`${step.tool}-${index}`}
                >
                  <div className="step-timeline">
                    <div className="step-check">
                      ✓
                    </div>

                    {index <
                      steps.length -
                        1 && (
                      <div className="timeline-line" />
                    )}
                  </div>

                  <div className="step-content">
                    <div className="step-header">
                      <strong>
                        {step.tool}
                      </strong>

                      <time>
                        {step.timestamp}
                      </time>
                    </div>

                    <p>
                      {step.message}
                    </p>

                    <span className="completed-label">
                      Completed
                    </span>
                  </div>
                </article>
              ),
            )}
          </div>

          {error && (
            <div className="error-message">
              <strong>
                Agent error
              </strong>

              <p>{error}</p>
            </div>
          )}
        </section>

        <section className="panel result-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Decision output
              </span>

              <h2>
                Recommended trip
              </h2>
            </div>

            <span className="panel-number">
              03
            </span>
          </div>

          {!result && (
            <div className="result-placeholder">
              <div className="placeholder-card">
                <span>
                  AI recommendation
                </span>

                <div className="placeholder-line large" />
                <div className="placeholder-line" />
                <div className="placeholder-line short" />
              </div>

              <p>
                The final itinerary, cost
                analysis and compliance
                decision will appear here.
              </p>
            </div>
          )}

          {result?.status ===
            "no_inventory" && (
            <div className="result-placeholder">
              <div className="error-message">
                <strong>
                  No matching inventory
                </strong>

                <p>
                  {result.message ||
                    "No suitable flight and hotel options were found."}
                </p>
              </div>
            </div>
          )}

          {hasRecommendation && (
            <div className="result-content">
              <div className="decision-header">
                <div>
                  <span
                    className={`decision-chip ${
                      compliance?.is_compliant
                        ? "compliant"
                        : "exception"
                    }`}
                  >
                    {compliance?.is_compliant
                      ? "✓"
                      : "!"}

                    {formatStatus(
                      result.status,
                    )}
                  </span>

                  <h3>
                    {result.trip?.origin}

                    <span>→</span>

                    {
                      result.trip
                        ?.destination
                    }
                  </h3>

                  <p>
                    {
                      result.trip
                        ?.departure_date
                    }{" "}
                    to{" "}
                    {
                      result.trip
                        ?.return_date
                    }
                  </p>
                </div>

                <div className="total-cost">
                  <span>Total</span>

                  <strong>
                    {formatCurrency(
                      cost?.total_cost,
                    )}
                  </strong>
                </div>
              </div>

              <div className="decision-explanation">
                <span>
                  Why this option?
                </span>

                <p>
                  {result.explanation}
                </p>
              </div>

              <div className="selection-card">
                <div className="selection-icon">
                  ✈
                </div>

                <div className="selection-details">
                  <span>
                    Selected flight
                  </span>

                  <strong>
                    {flight?.airline} ·{" "}
                    {flight?.id}
                  </strong>

                  <p>
                    {
                      flight?.departure_time
                    }{" "}
                    –{" "}
                    {
                      flight?.arrival_time
                    }{" "}
                    ·{" "}
                    {
                      flight?.travel_class
                    }
                  </p>
                </div>

                <strong className="selection-price">
                  {formatCurrency(
                    flight
                      ?.round_trip_price,
                  )}
                </strong>
              </div>

              <div className="selection-card">
                <div className="selection-icon">
                  ⌂
                </div>

                <div className="selection-details">
                  <span>
                    Selected hotel
                  </span>

                  <strong>
                    {hotel?.name}
                  </strong>

                  <p>
                    {
                      hotel
                        ?.distance_from_work_location_km
                    }{" "}
                    km from work · Rating{" "}
                    {hotel?.rating}
                  </p>
                </div>

                <strong className="selection-price">
                  {formatCurrency(
                    hotel
                      ?.price_per_night,
                  )}

                  <small>
                    /night
                  </small>
                </strong>
              </div>

              <div className="cost-grid">
                <div>
                  <span>Flight</span>

                  <strong>
                    {formatCurrency(
                      cost?.flight_cost,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Hotel</span>

                  <strong>
                    {formatCurrency(
                      cost?.hotel_cost,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Transport
                  </span>

                  <strong>
                    {formatCurrency(
                      cost
                        ?.transport_budget,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Budget remaining
                  </span>

                  <strong
                    className={
                      cost
                        ?.budget_remaining >=
                      0
                        ? "positive-value"
                        : "negative-value"
                    }
                  >
                    {formatCurrency(
                      cost
                        ?.budget_remaining,
                    )}
                  </strong>
                </div>
              </div>

              <div className="compliance-section">
                <div className="section-title">
                  <h4>
                    Policy assessment
                  </h4>

                  <span>
                    {
                      result.alternatives_evaluated
                    }{" "}
                    options evaluated
                  </span>
                </div>

                {compliance?.is_compliant && (
                  <div className="compliance-success">
                    <span>✓</span>

                    All traveller and
                    company-policy constraints
                    have been satisfied.
                  </div>
                )}

                {compliance?.violations?.map(
                  (
                    violation,
                    index,
                  ) => (
                    <div
                      className="policy-item violation"
                      key={`violation-${index}`}
                    >
                      <span>!</span>

                      {violation}
                    </div>
                  ),
                )}

                {compliance?.warnings?.map(
                  (
                    warning,
                    index,
                  ) => (
                    <div
                      className="policy-item warning"
                      key={`warning-${index}`}
                    >
                      <span>•</span>

                      {warning}
                    </div>
                  ),
                )}
              </div>

              <div className="approval-card">
                <div>
                  <span>
                    Human-in-the-loop
                    control
                  </span>

                  <strong>
                    {compliance
                      ?.approval_required
                      ? compliance
                          ?.is_compliant
                        ? "Manager approval required"
                        : "Policy exception approval required"
                      : "Ready for booking approval"}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={
                    openApprovalReview
                  }
                >
                  {
                    approvalButtonText
                  }
                </button>
              </div>

              {approvalOutcome && (
                <div
                  className={`approval-outcome ${approvalOutcome.status}`}
                >
                  <span>
                    {approvalOutcome.status ===
                    "approved"
                      ? "✓"
                      : "!"}
                  </span>

                  <div>
                    <strong>
                      Trip{" "}
                      {
                        approvalOutcome.status
                      }
                    </strong>

                    <p>
                      Reviewed by{" "}
                      {
                        approvalOutcome.reviewer_name
                      }

                      {approvalOutcome.review_note
                        ? ` — ${approvalOutcome.review_note}`
                        : ""}
                    </p>

                    <p>
                      Approval ID:{" "}
                      {
                        approvalOutcome.id
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer>
        <span>
          TripGuard AI · Explainable
          travel decisions
        </span>

        <span>
          LangGraph workflow · Policy
          engine · Human approval
        </span>
      </footer>

      <ApprovalModal
        open={approvalOpen}
        result={result}
        apiUrl={API_URL}
        onClose={() =>
          setApprovalOpen(false)
        }
        onCompleted={
          handleApprovalCompleted
        }
      />
    </div>
  );
}


export default App;