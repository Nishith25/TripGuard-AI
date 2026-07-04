import { useEffect, useState } from "react";


function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}


function ApprovalModal({
  open,
  result,
  apiUrl,
  onClose,
  onCompleted,
}) {
  const [reviewerName, setReviewerName] =
    useState("Travel Manager");

  const [note, setNote] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setNote("");
    }
  }, [open]);

  if (!open || !result) {
    return null;
  }

  const compliance = result.compliance;
  const cost = result.cost_summary;
  const flight = result.selected_flight;
  const hotel = result.selected_hotel;

  const isException =
    compliance?.is_compliant === false;

  async function submitDecision(decision) {
    if (reviewerName.trim().length < 2) {
      setError("Enter the manager or reviewer name.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const createResponse = await fetch(
        `${apiUrl}/api/approvals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trip: result.trip,
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
          }),
        },
      );

      const createPayload =
        await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(
          createPayload?.detail ||
            "Unable to create approval request.",
        );
      }

      const approvalId =
        createPayload.approval.id;

      const decisionResponse = await fetch(
        `${apiUrl}/api/approvals/${approvalId}/decision`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            reviewer_name:
              reviewerName.trim(),
            note: note.trim() || null,
          }),
        },
      );

      const decisionPayload =
        await decisionResponse.json();

      if (!decisionResponse.ok) {
        throw new Error(
          decisionPayload?.detail ||
            "Unable to submit the decision.",
        );
      }

      onCompleted(
        decisionPayload.approval,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Approval workflow failed.",
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
          event.target === event.currentTarget &&
          !submitting
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
              {isException
                ? "Review policy exception"
                : "Review manager approval"}
            </h2>
          </div>

          <button
            type="button"
            className="approval-modal-close"
            onClick={onClose}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <div className="approval-summary">
          <div>
            <span>Route</span>
            <strong>
              {result.trip?.origin} →{" "}
              {result.trip?.destination}
            </strong>
          </div>

          <div>
            <span>Total cost</span>
            <strong>
              {formatCurrency(cost?.total_cost)}
            </strong>
          </div>

          <div>
            <span>Flight</span>
            <strong>
              {flight?.airline} · {flight?.id}
            </strong>
          </div>

          <div>
            <span>Hotel</span>
            <strong>{hotel?.name}</strong>
          </div>
        </div>

        <div className="approval-reason">
          <span>
            {isException
              ? "Exception reason"
              : "Approval reason"}
          </span>

          {isException ? (
            <div>
              {compliance?.violations?.map(
                (violation, index) => (
                  <p key={index}>
                    • {violation}
                  </p>
                ),
              )}
            </div>
          ) : (
            <p>
              The trip is policy-compliant, but its total
              cost exceeds the manager-approval threshold.
            </p>
          )}
        </div>

        <label className="approval-field">
          <span>Reviewer name</span>

          <input
            value={reviewerName}
            onChange={(event) =>
              setReviewerName(
                event.target.value,
              )
            }
            disabled={submitting}
          />
        </label>

        <label className="approval-field">
          <span>Review note</span>

          <textarea
            value={note}
            onChange={(event) =>
              setNote(event.target.value)
            }
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
            onClick={() =>
              submitDecision("rejected")
            }
            disabled={submitting}
          >
            Reject trip
          </button>

          <button
            type="button"
            className="approval-approve-button"
            onClick={() =>
              submitDecision("approved")
            }
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