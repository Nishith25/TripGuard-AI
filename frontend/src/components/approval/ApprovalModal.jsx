import {
  useEffect,
  useState,
} from "react";


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

  return Boolean(
    flightId
    && flightId
      !== getFlightDisplayNumber(
        flight,
      )
  );
}


function formatPolicyField(
  field,
) {
  if (!field) {
    return "";
  }

  return String(field)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}


function ApprovalModal({
  open,
  result,
  approvalRequest = null,
  apiUrl,
  tripRunId = null,
  onClose,
  onCompleted,
}) {
  const [
    reviewerName,
    setReviewerName,
  ] = useState(
    "Travel Manager",
  );

  const [
    note,
    setNote,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (!open) {
      setReviewerName(
        "Travel Manager",
      );

      setNote("");
      setError("");
      setSubmitting(false);

      return;
    }

    if (approvalRequest) {
      setReviewerName(
        approvalRequest
          .reviewer_name
        || "Travel Manager",
      );

      setNote(
        approvalRequest
          .review_note
        || "",
      );
    }
  }, [
    open,
    approvalRequest,
  ]);

  useEffect(() => {
    function handleKeyDown(
      event,
    ) {
      if (
        event.key === "Escape"
        && open
        && !submitting
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    open,
    submitting,
    onClose,
  ]);

  if (!open || !result) {
    return null;
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

  const notSpecifiedFields =
    policyCoverage
      .not_specified_fields || [];

  const violations =
    compliance.violations || [];

  const inventoryReviewReasons =
    compliance
      .manual_inventory_review_reasons
    || [];

  const flightDisplayNumber =
    getFlightDisplayNumber(
      flight,
    );

  const showFlightReference =
    hasSeparateFlightReference(
      flight,
    );

  const isException =
    compliance.is_compliant
    === false;

  const requiresManualPolicyReview =
    Boolean(
      compliance
        .manual_policy_review_required
      || policyCoverage
        .requires_manual_review,
    );

  const requiresManualInventoryReview =
    Boolean(
      compliance
        .manual_inventory_review_required,
    );

  const approvalReason =
    result
      .approval_request
      ?.reason || "";

  let modalTitle =
    "Approve recommendation";

  if (
    isException
    && (
      requiresManualPolicyReview
      || requiresManualInventoryReview
    )
  ) {
    modalTitle =
      "Review exception and manual checks";
  } else if (isException) {
    modalTitle =
      "Review policy exception";
  } else if (
    requiresManualPolicyReview
  ) {
    modalTitle =
      "Review extracted policy";
  } else if (
    requiresManualInventoryReview
  ) {
    modalTitle =
      "Verify live inventory";
  } else if (
    compliance.approval_required
  ) {
    modalTitle =
      "Review manager approval";
  }

  async function createApprovalRequest() {
    const createResponse =
      await fetch(
        `${apiUrl}/api/approvals`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            trip:
              result.trip,

            selected_flight:
              result.selected_flight,

            selected_hotel:
              result.selected_hotel,

            cost_summary:
              result.cost_summary,

            compliance:
              result.compliance,

            explanation:
              result.explanation,

            trip_run_id:
              tripRunId || null,
          }),
        },
      );

    const createPayload =
      await createResponse
        .json()
        .catch(() => null);

    if (!createResponse.ok) {
      throw new Error(
        createPayload?.detail
        || (
          "Unable to create the "
          + "approval request."
        ),
      );
    }

    const approval =
      createPayload?.approval;

    if (!approval?.id) {
      throw new Error(
        "The backend did not return an approval ID.",
      );
    }

    return approval;
  }


  async function submitDecision(
    decision,
  ) {
    const cleanedReviewerName =
      reviewerName.trim();

    if (
      cleanedReviewerName.length
      < 2
    ) {
      setError(
        "Enter the manager or reviewer name.",
      );

      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let approvalId =
        approvalRequest?.id
        || null;

      if (!approvalId) {
        const createdApproval =
          await createApprovalRequest();

        approvalId =
          createdApproval.id;
      }

      const decisionResponse =
        await fetch(
          (
            `${apiUrl}/api/approvals/`
            + `${approvalId}/decision`
          ),
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              decision,

              reviewer_name:
                cleanedReviewerName,

              note:
                note.trim()
                || null,
            }),
          },
        );

      const decisionPayload =
        await decisionResponse
          .json()
          .catch(() => null);

      if (!decisionResponse.ok) {
        throw new Error(
          decisionPayload?.detail
          || (
            "Unable to submit the "
            + "approval decision."
          ),
        );
      }

      const completedApproval =
        decisionPayload
          ?.approval;

      if (!completedApproval) {
        throw new Error(
          "The backend did not return the completed approval decision.",
        );
      }

      if (
        typeof onCompleted
        === "function"
      ) {
        onCompleted(
          completedApproval,
        );
      }
    } catch (
      requestError
    ) {
      setError(
        requestError
        instanceof Error
          ? requestError.message
          : (
              "The approval workflow "
              + "could not be completed."
            ),
      );
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div
      className="approval-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target
            === event.currentTarget
          && !submitting
        ) {
          onClose();
        }
      }}
    >
      <section
        className="approval-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-modal-title"
      >
        <div className="approval-modal-header">
          <div>
            <span className="approval-modal-eyebrow">
              Manager review workspace
            </span>

            <h2 id="approval-modal-title">
              {modalTitle}
            </h2>
          </div>

          <button
            type="button"
            className="approval-modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close approval review"
          >
            ×
          </button>
        </div>

        {approvalRequest?.id && (
          <div className="approval-reason">
            <span>
              Approval request
            </span>

            <p>
              {approvalRequest.id}
              {" · "}
              {approvalRequest.status
                || "pending"}
            </p>
          </div>
        )}

        <div className="approval-summary">
          <div>
            <span>
              Route
            </span>

            <strong>
              {result.trip?.origin
                || "N/A"}
              {" → "}
              {result.trip?.destination
                || "N/A"}
            </strong>
          </div>

          <div>
            <span>
              Total cost
            </span>

            <strong>
              {formatCurrency(
                cost.total_cost,
              )}
            </strong>
          </div>

          <div>
            <span>
              Airline flight number
            </span>

            <strong>
              {flight.airline
                || "N/A"}
              {" · "}
              {flightDisplayNumber}
            </strong>
          </div>

          <div>
            <span>
              Hotel
            </span>

            <strong>
              {hotel.name
                || "N/A"}
            </strong>
          </div>

          {showFlightReference && (
            <div>
              <span>
                TripGuard flight reference
              </span>

              <strong>
                {flight.id}
              </strong>
            </div>
          )}

          {flight.provider && (
            <div>
              <span>
                Flight data source
              </span>

              <strong>
                {flight.provider}
              </strong>
            </div>
          )}

          {hotel.provider && (
            <div>
              <span>
                Hotel data source
              </span>

              <strong>
                {hotel.provider}
              </strong>
            </div>
          )}

          {tripRunId && (
            <div>
              <span>
                Agent run
              </span>

              <strong>
                {tripRunId}
              </strong>
            </div>
          )}
        </div>

        <div className="approval-reason">
          <span>
            {isException
              ? "Exception reason"
              : requiresManualPolicyReview
                ? "Manual policy review"
                : requiresManualInventoryReview
                  ? "Inventory verification"
                  : "Approval reason"}
          </span>

          {isException && (
            <div>
              {violations.length > 0 ? (
                violations.map(
                  (
                    violation,
                    index,
                  ) => (
                    <p
                      key={
                        `violation-${index}`
                      }
                    >
                      • {violation}
                    </p>
                  ),
                )
              ) : (
                <p>
                  The recommendation
                  requires an exception
                  review.
                </p>
              )}

              {requiresManualPolicyReview
                && unsupportedRules
                  .slice(0, 4)
                  .map(
                    (
                      rule,
                      index,
                    ) => (
                      <p
                        key={
                          `unsupported-exception-${index}`
                        }
                      >
                        • Manual clause:{" "}
                        {rule}
                      </p>
                    ),
                  )}

              {inventoryReviewReasons.map(
                (
                  reason,
                  index,
                ) => (
                  <p
                    key={
                      `inventory-exception-${index}`
                    }
                  >
                    • {reason}
                  </p>
                ),
              )}
            </div>
          )}

          {!isException
            && requiresManualPolicyReview
            && (
              <div>
                <p>
                  The itinerary satisfies
                  every mandatory rule
                  TripGuard could
                  automatically enforce,
                  but some policy clauses
                  require human review.
                </p>

                {unsupportedRules.length
                > 0 ? (
                  unsupportedRules
                    .slice(0, 4)
                    .map(
                      (
                        rule,
                        index,
                      ) => (
                        <p
                          key={
                            `unsupported-${index}`
                          }
                        >
                          • {rule}
                        </p>
                      ),
                    )
                ) : (
                  <p>
                    • The policy contains
                    rules that require
                    manager interpretation.
                  </p>
                )}

                {approvalReason && (
                  <p>
                    • {approvalReason}
                  </p>
                )}
              </div>
            )}

          {!isException
            && requiresManualInventoryReview
            && (
              <div>
                <p>
                  Some live flight or
                  hotel fields require
                  final human verification.
                </p>

                {inventoryReviewReasons.map(
                  (
                    reason,
                    index,
                  ) => (
                    <p
                      key={
                        `inventory-reason-${index}`
                      }
                    >
                      • {reason}
                    </p>
                  ),
                )}

                {approvalReason && (
                  <p>
                    • {approvalReason}
                  </p>
                )}
              </div>
            )}

          {!isException
            && !requiresManualPolicyReview
            && !requiresManualInventoryReview
            && (
              <p>
                {approvalReason
                  || (
                    compliance.approval_required
                      ? (
                          "The trip satisfies "
                          + "the mandatory policy "
                          + "rules but requires "
                          + "final manager approval."
                        )
                      : (
                          "The recommendation "
                          + "is policy-compliant."
                        )
                  )}
              </p>
            )}
        </div>

        {enforcedFields.length > 0 && (
          <div className="approval-reason">
            <span>
              Automatically enforced
            </span>

            <p>
              {enforcedFields
                .map(
                  formatPolicyField,
                )
                .join(", ")}
            </p>
          </div>
        )}

        {notSpecifiedFields.length > 0 && (
          <div className="approval-reason">
            <span>
              Not specified in policy
            </span>

            <p>
              {notSpecifiedFields
                .map(
                  formatPolicyField,
                )
                .join(", ")}
            </p>
          </div>
        )}

        <label className="approval-field">
          <span>
            Reviewer name
          </span>

          <input
            value={reviewerName}
            onChange={(event) => {
              setReviewerName(
                event.target.value,
              );
            }}
            disabled={submitting}
            autoComplete="name"
          />
        </label>

        <label className="approval-field">
          <span>
            Review note
          </span>

          <textarea
            value={note}
            onChange={(event) => {
              setNote(
                event.target.value,
              );
            }}
            rows="3"
            placeholder="Add the reason for this decision"
            disabled={submitting}
          />
        </label>

        {error && (
          <div className="approval-modal-error">
            {error}
          </div>
        )}

        <div className="approval-modal-actions">
          <button
            type="button"
            className="approval-reject-button"
            onClick={() => {
              submitDecision(
                "rejected",
              );
            }}
            disabled={submitting}
          >
            {submitting
              ? "Submitting…"
              : "Reject trip"}
          </button>

          <button
            type="button"
            className="approval-approve-button"
            onClick={() => {
              submitDecision(
                "approved",
              );
            }}
            disabled={submitting}
          >
            {submitting
              ? "Submitting…"
              : "Approve trip"}
          </button>
        </div>
      </section>
    </div>
  );
}


export default ApprovalModal;