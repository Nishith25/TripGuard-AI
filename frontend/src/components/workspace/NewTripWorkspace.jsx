import {
  useState,
} from "react";

import ApprovalModal from "../approval/ApprovalModal";
import PolicyUploadCard from "../policy/PolicyUploadCard";
import WeatherInsightCard from "../weather/WeatherInsightCard";

import useTripAgent from "../../hooks/useTripAgent";

import {
  API_URL,
} from "../../services/api";

import {
  saveApprovalDecision,
  updateAgentRunApproval,
} from "../../services/storage";


function getFutureDate(
  daysFromToday,
) {
  const date = new Date();

  date.setDate(
    date.getDate() +
      daysFromToday,
  );

  return date
    .toISOString()
    .split("T")[0];
}


const initialForm = {
  origin: "HYD",
  destination: "BLR",
  destination_city: "Bengaluru",
  departure_date:
    getFutureDate(4),
  return_date:
    getFutureDate(6),
  budget: 18000,
  arrival_before: "10:00",
  work_location:
    "Embassy Tech Village",
  purpose:
    "Important client meeting",
};


function formatCurrency(value) {
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


function TripRequestForm({
  form,
  setForm,
  running,
  onSubmit,
}) {
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

  return (
    <form
      className="trip-request-form"
      onSubmit={onSubmit}
    >
      <div className="route-input-row">
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

        <div className="route-direction">
          →
        </div>

        <label>
          <span>To</span>

          <input
            name="destination"
            value={form.destination}
            onChange={updateField}
            maxLength="3"
            required
          />
        </label>
      </div>

      <label>
        <span>Destination city</span>

        <input
          name="destination_city"
          value={
            form.destination_city
          }
          onChange={updateField}
          required
        />
      </label>

      <div className="form-grid-two">
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

      <div className="form-grid-two">
        <label>
          <span>Maximum budget</span>

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
          <span>Arrive before</span>

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
        <span>Business purpose</span>

        <textarea
          name="purpose"
          value={form.purpose}
          onChange={updateField}
          rows="3"
          placeholder="Describe the purpose of this trip"
        />
      </label>

      <button
        className="primary-action-button"
        type="submit"
        disabled={running}
      >
        {running ? (
          <>
            <span className="button-spinner" />
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
  );
}


function AgentTimeline({
  steps,
  running,
  started,
  result,
  progress,
  error,
}) {
  return (
    <section className="workspace-surface agent-execution-surface">
      <div className="surface-heading">
        <div>
          <span className="surface-eyebrow">
            Live execution
          </span>

          <h2>
            Agent activity
          </h2>
        </div>

        <span className="surface-number">
          02
        </span>
      </div>

      <div className="execution-progress">
        <div>
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

        <div className="execution-progress-track">
          <span
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      <div className="agent-timeline">
        {!started &&
          steps.length === 0 && (
            <div className="workspace-empty-state">
              <div>⌁</div>

              <h3>
                Ready to reason
              </h3>

              <p>
                Submit a travel request to
                watch TripGuard call its
                tools and make an
                explainable decision.
              </p>
            </div>
          )}

        {started &&
          steps.length === 0 && (
            <div className="agent-starting">
              <span />
              Initialising agent workflow…
            </div>
          )}

        {steps.map(
          (step, index) => (
            <article
              className="agent-step"
              key={`${step.tool}-${index}`}
            >
              <div className="agent-step-marker">
                <span>✓</span>

                {index <
                  steps.length - 1 && (
                  <i />
                )}
              </div>

              <div className="agent-step-content">
                <div>
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

                <small>
                  {step.status ===
                  "warning"
                    ? "Completed with warning"
                    : "Completed"}
                </small>
              </div>
            </article>
          ),
        )}
      </div>

      {error && (
        <div className="inline-error">
          <strong>
            Agent error
          </strong>

          <p>{error}</p>
        </div>
      )}
    </section>
  );
}


function RecommendationPanel({
  result,
  approvalOutcome,
  onReviewApproval,
}) {
  if (!result) {
    return (
      <section className="workspace-surface recommendation-surface">
        <div className="surface-heading">
          <div>
            <span className="surface-eyebrow">
              Decision output
            </span>

            <h2>
              Recommended trip
            </h2>
          </div>

          <span className="surface-number">
            03
          </span>
        </div>

        <div className="recommendation-placeholder">
          <div>
            <span>
              AI recommendation
            </span>

            <i className="placeholder-large" />
            <i />
            <i className="placeholder-short" />
          </div>

          <p>
            The itinerary, costs, weather
            and policy decision will
            appear here.
          </p>
        </div>
      </section>
    );
  }

  if (
    result.status ===
    "no_inventory"
  ) {
    return (
      <section className="workspace-surface recommendation-surface">
        <div className="surface-heading">
          <div>
            <span className="surface-eyebrow">
              Decision output
            </span>

            <h2>
              No recommendation
            </h2>
          </div>
        </div>

        <div className="inline-error">
          <strong>
            No matching inventory
          </strong>

          <p>
            {result.message ||
              "No suitable flight and hotel options were found."}
          </p>
        </div>
      </section>
    );
  }

  const compliance =
    result.compliance || {};

  const cost =
    result.cost_summary || {};

  const flight =
    result.selected_flight || {};

  const hotel =
    result.selected_hotel || {};

  const approvalButtonText =
    compliance.approval_required
      ? compliance.is_compliant
        ? "Review approval"
        : "Review exception"
      : "Approve recommendation";

  return (
    <section className="workspace-surface recommendation-surface">
      <div className="surface-heading">
        <div>
          <span className="surface-eyebrow">
            Decision output
          </span>

          <h2>
            Recommended trip
          </h2>
        </div>

        <span className="surface-number">
          03
        </span>
      </div>

      <div className="recommendation-header">
        <div>
          <span
            className={`decision-status ${
              compliance.is_compliant
                ? "compliant"
                : "exception"
            }`}
          >
            {compliance.is_compliant
              ? "✓"
              : "!"}

            {formatStatus(
              result.status,
            )}
          </span>

          <h3>
            {result.trip?.origin}
            <span>→</span>
            {result.trip?.destination}
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

        <div className="recommendation-total">
          <span>Total</span>

          <strong>
            {formatCurrency(
              cost.total_cost,
            )}
          </strong>
        </div>
      </div>

      <div className="decision-explanation">
        <span>Why this option?</span>
        <p>{result.explanation}</p>
      </div>

      <WeatherInsightCard
        weather={result.weather}
        advisories={
          result.travel_advisories ||
          []
        }
      />

      <div className="itinerary-selection-card">
        <div className="itinerary-icon">
          ✈
        </div>

        <div>
          <span>
            Selected flight
          </span>

          <strong>
            {flight.airline} ·{" "}
            {flight.id}
          </strong>

          <p>
            {flight.departure_time} –{" "}
            {flight.arrival_time} ·{" "}
            {flight.travel_class}
          </p>
        </div>

        <b>
          {formatCurrency(
            flight.round_trip_price,
          )}
        </b>
      </div>

      <div className="itinerary-selection-card">
        <div className="itinerary-icon">
          ⌂
        </div>

        <div>
          <span>
            Selected hotel
          </span>

          <strong>
            {hotel.name}
          </strong>

          <p>
            {
              hotel.distance_from_work_location_km
            }{" "}
            km from work · Rating{" "}
            {hotel.rating}
          </p>
        </div>

        <b>
          {formatCurrency(
            hotel.price_per_night,
          )}

          <small>/night</small>
        </b>
      </div>

      <div className="cost-summary-grid">
        <div>
          <span>Flight</span>
          <strong>
            {formatCurrency(
              cost.flight_cost,
            )}
          </strong>
        </div>

        <div>
          <span>Hotel</span>
          <strong>
            {formatCurrency(
              cost.hotel_cost,
            )}
          </strong>
        </div>

        <div>
          <span>Transport</span>
          <strong>
            {formatCurrency(
              cost.transport_budget,
            )}
          </strong>
        </div>

        <div>
          <span>Budget remaining</span>

          <strong
            className={
              cost.budget_remaining >= 0
                ? "positive-text"
                : "negative-text"
            }
          >
            {formatCurrency(
              cost.budget_remaining,
            )}
          </strong>
        </div>
      </div>

      <div className="policy-assessment">
        <div className="policy-assessment-heading">
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

        {compliance.is_compliant && (
          <div className="policy-message-row success">
            <span>✓</span>

            All traveller and
            company-policy constraints
            have been satisfied.
          </div>
        )}

        {compliance.violations?.map(
          (violation, index) => (
            <div
              className="policy-message-row error"
              key={`violation-${index}`}
            >
              <span>!</span>
              {violation}
            </div>
          ),
        )}

        {compliance.warnings?.map(
          (warning, index) => (
            <div
              className="policy-message-row warning"
              key={`warning-${index}`}
            >
              <span>•</span>
              {warning}
            </div>
          ),
        )}
      </div>

      <div className="approval-control-card">
        <div>
          <span>
            Human-in-the-loop control
          </span>

          <strong>
            {compliance.approval_required
              ? compliance.is_compliant
                ? "Manager approval required"
                : "Policy exception approval required"
              : "Ready for booking approval"}
          </strong>
        </div>

        <button
          type="button"
          onClick={onReviewApproval}
        >
          {approvalButtonText}
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
              {approvalOutcome.status}
            </strong>

            <p>
              Reviewed by{" "}
              {
                approvalOutcome.reviewer_name
              }
            </p>

            <p>
              Approval ID:{" "}
              {approvalOutcome.id}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}


function NewTripWorkspace() {
  const [form, setForm] =
    useState(initialForm);

  const [
    approvalOpen,
    setApprovalOpen,
  ] = useState(false);

  const [
    approvalOutcome,
    setApprovalOutcome,
  ] = useState(null);

  const {
    steps,
    result,
    running,
    started,
    error,
    progress,
    currentRunId,
    runTrip,
  } = useTripAgent();

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();

    setApprovalOpen(false);
    setApprovalOutcome(null);

    await runTrip(form);
  }

  function handleApprovalCompleted(
    approval,
  ) {
    const route =
      result?.trip
        ? `${result.trip.origin} → ${result.trip.destination}`
        : null;

    const storedApproval =
      saveApprovalDecision(
        approval,
        {
          route,
          total_cost:
            result?.cost_summary
              ?.total_cost || 0,
          trip_run_id:
            currentRunId,
        },
      );

    updateAgentRunApproval(
      currentRunId,
      storedApproval,
    );

    setApprovalOutcome(
      storedApproval,
    );

    setApprovalOpen(false);
  }

  return (
    <>
      <div className="page-introduction">
        <div>
          <span>
            Autonomous travel planning
          </span>

          <h2>
            Plan, evaluate and approve a
            business trip
          </h2>

          <p>
            TripGuard retrieves policy,
            calls travel and weather tools,
            evaluates alternatives and
            explains its final decision.
          </p>
        </div>

        <div className="prototype-label">
          <span>●</span>
          Prototype inventory · Live weather
        </div>
      </div>

      <div className="trip-workspace-grid">
        <section className="workspace-surface trip-request-surface">
          <div className="surface-heading">
            <div>
              <span className="surface-eyebrow">
                Travel request
              </span>

              <h2>
                Trip requirements
              </h2>
            </div>

            <span className="surface-number">
              01
            </span>
          </div>

          <PolicyUploadCard
            apiUrl={API_URL}
          />

          <div className="form-section-divider">
            <span>
              Traveller requirements
            </span>
          </div>

          <TripRequestForm
            form={form}
            setForm={setForm}
            running={running}
            onSubmit={handleSubmit}
          />
        </section>

        <AgentTimeline
          steps={steps}
          running={running}
          started={started}
          result={result}
          progress={progress}
          error={error}
        />

        <RecommendationPanel
          result={result}
          approvalOutcome={
            approvalOutcome
          }
          onReviewApproval={() =>
            setApprovalOpen(true)
          }
        />
      </div>

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
    </>
  );
}


export default NewTripWorkspace;