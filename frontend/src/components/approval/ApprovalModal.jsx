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


function formatPolicyField(
  fieldName,
) {
  return fieldName
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

  const [note, setNote] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setNote("");
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);

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

  const unspecifiedFields =
    policyCoverage
      .not_specified_fields || [];

  const violations =
    compliance.violations || [];

  const isException =
    compliance.is_compliant
    === false;

  const requiresManualPolicyReview =
    Boolean(
      policyCoverage
        .requires_manual_review,
    );

  const approvalReason =
    result
      .approval_request
      ?.reason || "";

  let modalTitle =
    "Approve recommendation";

  if (isException) {
    modalTitle =
      "Review policy exception";
  } else if (
    requiresManualPolicyReview
  ) {
    modalTitle =
      "Review extracted policy";
  } else if (
    compliance.approval_required
  ) {
    modalTitle =
      "Review manager approval";
  }

  async function submitDecision(
    decision,
  ) {
    if (
      reviewerName
        .trim()
        .length < 2
    ) {
      setError(
        "Enter the manager or reviewer name.",
      );

      return;
    }

    setSubmitting(true);
    setError("");

    try {
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
              trip: result.trip,
              selected_flight:
                result
                  .selected_flight,
              selected_hotel:
                result
                  .selected_hotel,
              cost_summary:
                result
                  .cost_summary,
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
            "Unable to create "
            + "the approval request."
          ),
        );
      }

      const approvalId =
        createPayload
          ?.approval
          ?.id;

      if (!approvalId) {
        throw new Error(
          "The backend did not return an approval ID.",
        );
      }

      const decisionResponse =
        await fetch(
          `${apiUrl}/api/approvals/${approvalId}/decision`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              decision,
              reviewer_name:
                reviewerName.trim(),
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
            "Unable to submit "
            + "the approval decision."
          ),
        );
      }

      if (
        typeof onCompleted
        === "function"
      ) {
        onCompleted(
          decisionPayload
            .approval,
        );
      }
    } catch (requestError) {
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
              Human-in-the-loop review
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

        <div className="approval-summary">
          <div>
            <span>Route</span>

            <strong>
              {result.trip?.origin}
              {" → "}
              {result.trip?.destination}
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
            <span>Flight</span>

            <strong>
              {flight.airline
                || "N/A"}
              {" · "}
              {flight.id
                || "N/A"}
            </strong>
          </div>

          <div>
            <span>Hotel</span>

            <strong>
              {hotel.name
                || "N/A"}
            </strong>
          </div>
        </div>

        <div className="approval-reason">
          <span>
            {isException
              ? "Exception reason"
              : requiresManualPolicyReview
                ? "Manual policy review"
                : "Approval reason"}
          </span>

          {isException && (
            <div>
              {violations.length > 0
                ? (
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
                  )
                : (
                    <p>
                      The recommendation
                      requires an exception
                      review.
                    </p>
                  )}

              {requiresManualPolicyReview
                && unsupportedRules
                  .slice(0, 6)
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
            </div>
          )}

          {!isException
            && requiresManualPolicyReview
            && (
              <div>
                <p>
                  The itinerary satisfies
                  every rule TripGuard
                  could automatically
                  enforce, but some
                  uploaded policy clauses
                  still require human
                  review.
                </p>

                {unsupportedRules.length
                > 0 ? (
                  unsupportedRules
                    .slice(0, 6)
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
                    • The policy did not
                    contain enough
                    supported rules for a
                    fully automated
                    decision.
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
            && !requiresManualPolicyReview
            && (
              <p>
                {approvalReason
                  || (
                    compliance
                      .approval_required
                      ? (
                          "The trip satisfies "
                          + "the enforceable "
                          + "policy rules but "
                          + "requires final "
                          + "manager approval."
                        )
                      : (
                          "The recommendation "
                          + "is policy-compliant "
                          + "and ready for final "
                          + "booking approval."
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

        {unspecifiedFields.length > 0 && (
          <div className="approval-reason">
            <span>
              Not specified in policy
            </span>

            <p>
              {unspecifiedFields
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
            rows="4"
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