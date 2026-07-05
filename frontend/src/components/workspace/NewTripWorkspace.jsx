import {
  useState,
} from "react";

import PolicyUploadCard from "../policy/PolicyUploadCard";
import WeatherInsightCard from "../weather/WeatherInsightCard";

import useTripAgent from "../../hooks/useTripAgent";

import {
  API_URL,
} from "../../services/api";


const PENDING_APPROVALS_STORAGE_KEY =
  "tripguard_pending_approval_requests";


function getFutureDate(
  daysFromToday,
) {
  const futureDate = new Date();

  futureDate.setDate(
    futureDate.getDate()
      + daysFromToday,
  );

  return futureDate
    .toISOString()
    .split("T")[0];
}


function createEmptyForm() {
  return {
    origin: "",
    destination: "",
    destination_city: "",
    departure_date: "",
    return_date: "",
    budget: "",
    arrival_before: "",
    work_location: "",
    purpose: "",
  };
}


function createDemoForm() {
  return {
    origin: "HYD",
    destination: "BLR",
    destination_city:
      "Bengaluru",
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
}


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


function formatStatus(
  status,
) {
  const labels = {
    compliant_recommendation:
      "Policy compliant",
    exception_required:
      "Exception required",
    no_inventory:
      "No inventory",
  };

  return (
    labels[status]
    || "Recommendation generated"
  );
}


function formatPolicyField(
  fieldName,
) {
  if (!fieldName) {
    return "";
  }

  return fieldName
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}


function getFlightDisplayNumber(
  flight,
) {
  const airlineFlightNumber =
    String(
      flight?.flight_number
      || "",
    ).trim();

  if (airlineFlightNumber) {
    return airlineFlightNumber;
  }

  return String(
    flight?.id
    || "N/A",
  );
}


function hasSeparateFlightReference(
  flight,
) {
  const flightId = String(
    flight?.id
    || "",
  ).trim();

  if (!flightId) {
    return false;
  }

  return (
    flightId
    !== getFlightDisplayNumber(
      flight,
    )
  );
}


function readPendingApprovalRequests() {
  try {
    const storedValue =
      window.localStorage.getItem(
        PENDING_APPROVALS_STORAGE_KEY,
      );

    if (!storedValue) {
      return [];
    }

    const parsedValue =
      JSON.parse(storedValue);

    return Array.isArray(
      parsedValue,
    )
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}


function generateApprovalRequestId() {
  if (
    globalThis.crypto
      ?.randomUUID
  ) {
    return (
      `APR-${globalThis.crypto
        .randomUUID()
        .slice(0, 8)
        .toUpperCase()}`
    );
  }

  return (
    `APR-${Date.now()}-`
    + Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()
  );
}


function savePendingApprovalRequest({
  result,
  tripRunId,
}) {
  if (!result) {
    throw new Error(
      "No trip recommendation is available.",
    );
  }

  const submittedAt =
    new Date().toISOString();

  const approvalRequest = {
    id:
      generateApprovalRequestId(),
    status:
      "pending",
    trip_run_id:
      tripRunId || null,
    submitted_at:
      submittedAt,
    updated_at:
      submittedAt,

    route:
      result.trip
        ? (
            `${result.trip.origin}`
            + " → "
            + `${result.trip.destination}`
          )
        : "Route unavailable",

    origin:
      result.trip?.origin
      || null,

    destination:
      result.trip?.destination
      || null,

    destination_city:
      result.trip
        ?.destination_city
      || null,

    departure_date:
      result.trip
        ?.departure_date
      || null,

    return_date:
      result.trip
        ?.return_date
      || null,

    purpose:
      result.trip?.purpose
      || null,

    total_cost:
      Number(
        result
          .cost_summary
          ?.total_cost
        || 0,
      ),

    traveller_budget:
      Number(
        result
          .cost_summary
          ?.traveller_budget
        || 0,
      ),

    budget_remaining:
      Number(
        result
          .cost_summary
          ?.budget_remaining
        || 0,
      ),

    exception_amount:
      Number(
        result
          .cost_summary
          ?.exception_amount
        || 0,
      ),

    selected_flight:
      result.selected_flight
      || null,

    selected_hotel:
      result.selected_hotel
      || null,

    compliance:
      result.compliance
      || {},

    policy_coverage:
      result.policy_coverage
      || {},

    approval_reason:
      result
        .approval_request
        ?.reason
      || (
        "Manager review is "
        + "required."
      ),

    recommendation_status:
      result.status
      || null,

    recommendation_explanation:
      result.explanation
      || null,

    reviewer_name:
      "",

    review_note:
      "",

    decision:
      null,
  };

  const existingRequests =
    readPendingApprovalRequests();

  const requestsWithoutCurrentRun =
    existingRequests.filter(
      (request) => {
        if (
          tripRunId
          && request.trip_run_id
        ) {
          return (
            request.trip_run_id
            !== tripRunId
          );
        }

        return (
          request.id
          !== approvalRequest.id
        );
      },
    );

  const updatedRequests = [
    approvalRequest,
    ...requestsWithoutCurrentRun,
  ];

  window.localStorage.setItem(
    PENDING_APPROVALS_STORAGE_KEY,
    JSON.stringify(
      updatedRequests,
    ),
  );

  return approvalRequest;
}


function TripRequestForm({
  form,
  setForm,
  running,
  onSubmit,
  onLoadDemo,
  onClearForm,
}) {
  function updateField(
    event,
  ) {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "budget"
          ? (
              value === ""
                ? ""
                : Number(value)
            )
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
            placeholder="HYD"
            autoComplete="off"
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
            value={
              form.destination
            }
            onChange={updateField}
            maxLength="3"
            placeholder="BLR"
            autoComplete="off"
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
          placeholder="Bengaluru"
          autoComplete="off"
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
            min={
              form.departure_date
              || undefined
            }
            onChange={updateField}
            required
          />
        </label>
      </div>

      <div className="form-grid-two">
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
            step="1"
            placeholder="18000"
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
        <span>
          Work location
        </span>

        <input
          name="work_location"
          value={
            form.work_location
          }
          onChange={updateField}
          placeholder="Office or meeting location"
          autoComplete="off"
        />
      </label>

      <label>
        <span>
          Business purpose
        </span>

        <textarea
          name="purpose"
          value={form.purpose}
          onChange={updateField}
          rows="3"
          placeholder="Describe the purpose of this trip"
        />
      </label>

      <div className="trip-form-demo-helper">
        <div>
          <span>
            Demo helper
          </span>

          <p>
            Enter the requirements manually
            or load a prepared sample request.
          </p>
        </div>

        <div className="trip-form-demo-actions">
          <button
            type="button"
            onClick={onClearForm}
            disabled={running}
          >
            Clear form
          </button>

          <button
            type="button"
            onClick={onLoadDemo}
            disabled={running}
          >
            Load demo request
          </button>
        </div>
      </div>

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
              width:
                `${progress}%`,
            }}
          />
        </div>
      </div>

      <div className="agent-timeline">
        {!started
          && steps.length === 0
          && (
            <div className="workspace-empty-state">
              <div>⌁</div>

              <h3>
                Ready to reason
              </h3>

              <p>
                Submit a travel request
                to watch TripGuard call
                its tools and make an
                explainable decision.
              </p>
            </div>
          )}

        {started
          && steps.length === 0
          && (
            <div className="agent-starting">
              <span />

              Initialising agent
              workflow…
            </div>
          )}

        {steps.map(
          (
            step,
            index,
          ) => (
            <article
              className="agent-step"
              key={
                `${step.tool}-${index}`
              }
            >
              <div className="agent-step-marker">
                <span>
                  {step.status
                    === "failed"
                    ? "!"
                    : "✓"}
                </span>

                {index
                  < steps.length - 1
                  && (
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
                  {step.status
                    === "warning"
                    ? "Completed with warning"
                    : step.status
                      === "failed"
                      ? "Failed"
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


function SelectionReasoningPanel({
  reasoning,
}) {
  if (!reasoning) {
    return null;
  }

  const priorities =
    reasoning.priority_order
    || [];

  const selectedReasons =
    reasoning.selected_reasons
    || [];

  const cheaperAlternatives =
    reasoning
      .cheaper_options_rejected
    || [];

  const cheaperOptionCount =
    Number(
      reasoning
        .cheaper_option_count
      || 0,
    );

  const comparisonHeading =
    cheaperOptionCount > 0
      ? "Why not the cheaper flight?"
      : "Why this flight was selected";

  return (
    <section className="selection-reasoning-panel">
      <div className="selection-reasoning-heading">
        <div>
          <span>
            Decision comparison
          </span>

          <h4>
            {comparisonHeading}
          </h4>
        </div>

        <span className="selection-strategy-pill">
          {cheaperOptionCount}
          {" cheaper flight"}

          {cheaperOptionCount === 1
            ? ""
            : "s"}

          {" reviewed"}
        </span>
      </div>

      {reasoning.strategy && (
        <p className="selection-strategy-copy">
          {reasoning.strategy}
        </p>
      )}

      {priorities.length > 0 && (
        <div className="selection-priority-flow">
          {priorities.map(
            (
              priority,
              index,
            ) => (
              <span
                key={
                  `${priority}-${index}`
                }
                className="selection-priority-chip"
              >
                <b>
                  {index + 1}
                </b>

                {priority}
              </span>
            ),
          )}
        </div>
      )}

      <div className="selected-reason-card">
        <div className="selected-reason-card-header">
          <div>
            <span>
              Selected option wins
            </span>

            <strong>
              {
                reasoning
                  .selected_airline
                || "Airline"
              }
              {" · "}
              {
                reasoning
                  .selected_flight_number
                || "Flight unavailable"
              }
            </strong>
          </div>

          <strong>
            {formatCurrency(
              reasoning
                .selected_total_cost,
            )}
          </strong>
        </div>

        {selectedReasons.length > 0 && (
          <ul>
            {selectedReasons.map(
              (
                reason,
                index,
              ) => (
                <li
                  key={
                    `selected-reason-${index}`
                  }
                >
                  <span>✓</span>

                  {reason}
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {cheaperAlternatives.length > 0 ? (
        <div className="cheaper-alternatives">
          <div className="cheaper-alternatives-heading">
            <span>
              Cheaper alternatives not selected
            </span>

            <small>
              Showing up to three
              distinct flights
            </small>
          </div>

          <div className="cheaper-alternatives-list">
            {cheaperAlternatives.map(
              (
                alternative,
                index,
              ) => (
                <article
                  className="cheaper-alternative-card"
                  key={
                    (
                      alternative.flight_id
                      || alternative
                        .flight_number
                      || `alternative-${index}`
                    )
                    + "-"
                    + (
                      alternative.hotel_id
                      || index
                    )
                  }
                >
                  <div className="cheaper-alternative-top">
                    <div>
                      <span>
                        Cheaper alternative{" "}
                        {index + 1}
                      </span>

                      <strong>
                        {
                          alternative
                            .airline
                          || "Airline"
                        }
                        {" · "}
                        {
                          alternative
                            .flight_number
                          || "Flight unavailable"
                        }
                      </strong>

                      <p>
                        {alternative
                          .departure_time
                          || "—"}
                        {" – "}
                        {alternative
                          .arrival_time
                          || "—"}

                        {alternative
                          .hotel_name
                          ? (
                              ` · ${
                                alternative
                                  .hotel_name
                              }`
                            )
                          : ""}
                      </p>
                    </div>

                    <div className="cheaper-alternative-price">
                      <strong>
                        {formatCurrency(
                          alternative
                            .total_cost,
                        )}
                      </strong>

                      <span>
                        Saves{" "}
                        {formatCurrency(
                          alternative
                            .savings_vs_selected,
                        )}
                      </span>
                    </div>
                  </div>

                  {alternative
                    .rejection_summary
                    && (
                      <div className="alternative-ranking-reason">
                        <span>!</span>

                        {
                          alternative
                            .rejection_summary
                        }
                      </div>
                    )}

                  {alternative
                    .reasons
                    ?.length > 0
                    && (
                      <ul className="alternative-reason-list">
                        {alternative
                          .reasons
                          .map(
                            (
                              reason,
                              reasonIndex,
                            ) => (
                              <li
                                key={
                                  `alternative-${index}-${reasonIndex}`
                                }
                              >
                                <span>•</span>

                                {reason}
                              </li>
                            ),
                          )}
                      </ul>
                    )}
                </article>
              ),
            )}
          </div>
        </div>
      ) : (
        <div className="selection-no-cheaper">
          <span>✓</span>

          <div>
            <strong>
              Selected flight is already
              the lowest-cost option
            </strong>

            <p>
              No cheaper distinct flight
              was found after evaluating
              the available flight and
              hotel combinations.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}


function EmployeeApprovalHandoff({
  compliance,
  submission,
  submissionError,
  onSubmitForReview,
  onOpenManagerQueue,
}) {
  const requiresApproval =
    Boolean(
      compliance
        ?.approval_required,
    );

  if (!requiresApproval) {
    return (
      <div className="approval-control-card">
        <div>
          <span>
            Employee workflow complete
          </span>

          <strong>
            No manager approval required
          </strong>
        </div>

        <button
          type="button"
          disabled
        >
          Ready for booking
        </button>
      </div>
    );
  }

  const hasException =
    !compliance.is_compliant;

  const manualPolicyReview =
    Boolean(
      compliance
        .manual_policy_review_required,
    );

  const manualInventoryReview =
    Boolean(
      compliance
        .manual_inventory_review_required,
    );

  let reviewReason =
    "Manager approval required";

  if (
    hasException
    && (
      manualPolicyReview
      || manualInventoryReview
    )
  ) {
    reviewReason =
      "Policy exception + manual review required";
  } else if (hasException) {
    reviewReason =
      "Policy exception approval required";
  } else if (
    manualPolicyReview
  ) {
    reviewReason =
      "Manual policy review required";
  } else if (
    manualInventoryReview
  ) {
    reviewReason =
      "Inventory verification required";
  }

  return (
    <>
      <div className="approval-control-card">
        <div>
          <span>
            Employee submission
          </span>

          <strong>
            {submission
              ? (
                  "Sent to manager "
                  + "approval queue"
                )
              : reviewReason}
          </strong>
        </div>

        <button
          type="button"
          onClick={
            submission
              ? onOpenManagerQueue
              : onSubmitForReview
          }
        >
          {submission
            ? "Open manager approvals"
            : "Submit for manager review"}
        </button>
      </div>

      {submission && (
        <div className="policy-message-row success">
          <span>✓</span>

          <div>
            <strong>
              Approval request submitted
            </strong>

            <p>
              Request ID:{" "}
              {submission.id}
            </p>
          </div>
        </div>
      )}

      {submissionError && (
        <div className="inline-error">
          <strong>
            Approval submission failed
          </strong>

          <p>
            {submissionError}
          </p>
        </div>
      )}
    </>
  );
}


function RecommendationPanel({
  result,
  approvalSubmission,
  approvalSubmissionError,
  onSubmitForApproval,
  onOpenApprovals,
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
            The itinerary, costs,
            weather and policy decision
            will appear here.
          </p>
        </div>
      </section>
    );
  }

  if (
    result.status
    === "no_inventory"
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
            {result.message
              || (
                "No suitable flight "
                + "and hotel options "
                + "were found."
              )}
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

  const policyCoverage =
    result.policy_coverage || {};

  const unsupportedRules =
    policyCoverage
      .unsupported_rules || [];

  const enforcedFields =
    policyCoverage
      .enforced_fields || [];

  const unspecifiedFields =
    policyCoverage
      .not_specified_fields || [];

  const flightDisplayNumber =
    getFlightDisplayNumber(
      flight,
    );

  const showFlightReference =
    hasSeparateFlightReference(
      flight,
    );

  const isLiveFlight =
    flight.data_source
    === "live";

  const isLiveHotel =
    hotel.data_source
    === "live";

  const manualPolicyReviewRequired =
    Boolean(
      compliance
        .manual_policy_review_required
      || policyCoverage
        .requires_manual_review,
    );

  const manualInventoryReviewRequired =
    Boolean(
      compliance
        .manual_inventory_review_required,
    );

  const anyManualReviewRequired =
    manualPolicyReviewRequired
    || manualInventoryReviewRequired;

  const decisionClass =
    compliance.is_compliant
      && !anyManualReviewRequired
      ? "compliant"
      : "exception";

  let decisionLabel =
    formatStatus(
      result.status,
    );

  if (
    !compliance.is_compliant
    && anyManualReviewRequired
  ) {
    decisionLabel =
      "Exception + manual review";
  } else if (
    !compliance.is_compliant
  ) {
    decisionLabel =
      "Exception required";
  } else if (
    anyManualReviewRequired
  ) {
    decisionLabel =
      "Manual review required";
  }

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
            className={
              `decision-status ${decisionClass}`
            }
          >
            {decisionClass
              === "compliant"
              ? "✓"
              : "!"}

            {decisionLabel}
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
            }
            {" to "}
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
        <span>
          Why this option?
        </span>

        <p>
          {result.explanation}
        </p>
      </div>

      <SelectionReasoningPanel
        reasoning={
          result.selection_reasoning
        }
      />

      <WeatherInsightCard
        weather={result.weather}
        advisories={
          result
            .travel_advisories
          || []
        }
      />

      <div className="itinerary-selection-card">
        <div className="itinerary-icon">
          ✈
        </div>

        <div>
          <span>
            {isLiveFlight
              ? "Selected live flight"
              : "Selected flight"}
          </span>

          <strong>
            {flight.airline
              || "Airline"}
            {" · "}
            {flightDisplayNumber}
          </strong>

          <p>
            {flight.departure_time
              || "—"}
            {" – "}
            {flight.arrival_time
              || "—"}
            {" · "}
            {flight.travel_class
              || "Class unavailable"}
          </p>

          {showFlightReference && (
            <p>
              TripGuard reference:{" "}
              {flight.id}
            </p>
          )}

          {flight.provider && (
            <p>
              Source:{" "}
              {flight.provider}
            </p>
          )}
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
            {isLiveHotel
              ? "Selected live hotel"
              : "Selected hotel"}
          </span>

          <strong>
            {hotel.name
              || "Hotel unavailable"}
          </strong>

          <p>
            {hotel
              .distance_from_work_location_km
              ?? "Distance unavailable"}

            {hotel
              .distance_from_work_location_km
              !== null
              && hotel
                .distance_from_work_location_km
                !== undefined
              ? " km from work"
              : ""}

            {" · Rating "}

            {hotel.rating
              ?? "N/A"}
          </p>

          {hotel.provider && (
            <p>
              Source:{" "}
              {hotel.provider}
            </p>
          )}
        </div>

        <b>
          {formatCurrency(
            hotel.price_per_night,
          )}

          <small>
            /night
          </small>
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
          <span>
            Budget remaining
          </span>

          <strong
            className={
              Number(
                cost.budget_remaining
                || 0,
              ) >= 0
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
              result
                .alternatives_evaluated
              || 0
            }
            {" options evaluated"}
          </span>
        </div>

        {compliance.is_compliant
          && (
            <div className="policy-message-row success">
              <span>✓</span>

              All automatically
              enforceable traveller and
              company-policy constraints
              have been satisfied.
            </div>
          )}

        {manualPolicyReviewRequired
          && (
            <div className="policy-message-row warning">
              <span>!</span>

              Some clauses require human
              review before this trip can
              be approved.
            </div>
          )}

        {manualInventoryReviewRequired
          && (
            <div className="policy-message-row warning">
              <span>!</span>

              Some live inventory details
              require manual verification.
            </div>
          )}

        {compliance
          .manual_inventory_review_reasons
          ?.map(
            (
              reason,
              index,
            ) => (
              <div
                className="policy-message-row warning"
                key={
                  `inventory-review-${index}`
                }
              >
                <span>•</span>

                {reason}
              </div>
            ),
          )}

        {compliance
          .violations
          ?.map(
            (
              violation,
              index,
            ) => (
              <div
                className="policy-message-row error"
                key={
                  `violation-${index}`
                }
              >
                <span>!</span>

                {violation}
              </div>
            ),
          )}

        {compliance
          .warnings
          ?.map(
            (
              warning,
              index,
            ) => (
              <div
                className="policy-message-row warning"
                key={
                  `warning-${index}`
                }
              >
                <span>•</span>

                {warning}
              </div>
            ),
          )}

        {unsupportedRules.map(
          (
            rule,
            index,
          ) => (
            <div
              className="policy-message-row warning"
              key={
                `unsupported-rule-${index}`
              }
            >
              <span>?</span>

              Manual clause: {rule}
            </div>
          ),
        )}

        {enforcedFields.length > 0
          && (
            <div className="policy-message-row success">
              <span>✓</span>

              Enforced rules:{" "}

              {enforcedFields
                .map(
                  formatPolicyField,
                )
                .join(", ")}
            </div>
          )}

        {unspecifiedFields.length > 0
          && (
            <div className="policy-message-row warning">
              <span>•</span>

              Not specified in the
              uploaded policy:{" "}

              {unspecifiedFields
                .map(
                  formatPolicyField,
                )
                .join(", ")}
            </div>
          )}
      </div>

      <EmployeeApprovalHandoff
        compliance={compliance}
        submission={
          approvalSubmission
        }
        submissionError={
          approvalSubmissionError
        }
        onSubmitForReview={
          onSubmitForApproval
        }
        onOpenManagerQueue={
          onOpenApprovals
        }
      />
    </section>
  );
}


function NewTripWorkspace() {

  const [
    form,
    setForm,
  ] = useState(
    createEmptyForm,
  );

  const [
    approvalSubmission,
    setApprovalSubmission,
  ] = useState(null);

  const [
    approvalSubmissionError,
    setApprovalSubmissionError,
  ] = useState("");

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

    if (
      form.return_date
      < form.departure_date
    ) {
      window.alert(
        "Return date cannot be earlier than the departure date.",
      );

      return;
    }

    setApprovalSubmission(
      null,
    );

    setApprovalSubmissionError(
      "",
    );

    await runTrip({
      ...form,

      origin:
        form.origin
          .trim()
          .toUpperCase(),

      destination:
        form.destination
          .trim()
          .toUpperCase(),

      destination_city:
        form.destination_city
          .trim(),

      work_location:
        form.work_location
          .trim(),

      purpose:
        form.purpose
          .trim(),

      budget:
        Number(
          form.budget,
        ),
    });
  }


  function handleLoadDemo() {
    setForm(
      createDemoForm(),
    );

    setApprovalSubmission(
      null,
    );

    setApprovalSubmissionError(
      "",
    );
  }


  function handleClearForm() {
    setForm(
      createEmptyForm(),
    );

    setApprovalSubmission(
      null,
    );

    setApprovalSubmissionError(
      "",
    );
  }


  function handleSubmitForApproval() {
    try {
      const savedRequest =
        savePendingApprovalRequest({
          result,
          tripRunId:
            currentRunId,
        });

      setApprovalSubmission(
        savedRequest,
      );

      setApprovalSubmissionError(
        "",
      );
    } catch (submissionError) {
      setApprovalSubmissionError(
        submissionError
          instanceof Error
          ? submissionError.message
          : (
              "Unable to submit the "
              + "approval request."
            ),
      );
    }
  }


  function handleOpenApprovals() {
    navigate(
      "/app/approvals",
    );
  }


  return (
    <>
      <div className="page-introduction">
        <div>
          <span>
            Employee travel request
          </span>

          <h2>
            Plan and submit a
            business trip
          </h2>

          <p>
            Enter the traveller’s
            requirements. TripGuard
            searches live inventory,
            checks company policy and
            prepares a recommendation.
            Manager decisions are handled
            separately in Approvals.
          </p>
        </div>

        <div className="live-system-label">
          <span>●</span>

          Employee workspace · Live
          travel inventory
        </div>
      </div>

      <div className="trip-workspace-grid">
        <section className="workspace-surface trip-request-surface">
          <div className="surface-heading">
            <div>
              <span className="surface-eyebrow">
                Employee request
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
            onSubmit={
              handleSubmit
            }
            onLoadDemo={
              handleLoadDemo
            }
            onClearForm={
              handleClearForm
            }
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
          approvalSubmission={
            approvalSubmission
          }
          approvalSubmissionError={
            approvalSubmissionError
          }
          onSubmitForApproval={
            handleSubmitForApproval
          }
          onOpenApprovals={
            handleOpenApprovals
          }
        />
      </div>
    </>
  );
}


export default NewTripWorkspace;