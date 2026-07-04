import { useEffect, useRef, useState } from "react";


const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;


function formatCurrency(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
}


function PolicyUploadCard({ apiUrl }) {
  const fileInputRef = useRef(null);

  const [policyData, setPolicyData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadCurrentPolicy();
  }, []);

  async function loadCurrentPolicy() {
    setLoadingPolicy(true);
    setError("");

    try {
      const response = await fetch(
        `${apiUrl}/api/policy/current`,
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.detail || "Unable to load the active policy.",
        );
      }

      setPolicyData(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the policy service.",
      );
    } finally {
      setLoadingPolicy(false);
    }
  }

  function handleFileSelection(event) {
    const file = event.target.files?.[0];

    setMessage("");
    setError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("The PDF must be smaller than 5 MB.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function uploadPolicy() {
    if (!selectedFile) {
      setError("Select a travel-policy PDF first.");
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(
        `${apiUrl}/api/policy/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.detail || "Policy upload failed.",
        );
      }

      setMessage(
        "Policy uploaded and activated successfully.",
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadCurrentPolicy();
      setShowDetails(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to upload the policy.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function resetPolicy() {
    setResetting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${apiUrl}/api/policy/active`,
        {
          method: "DELETE",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.detail || "Unable to reset the policy.",
        );
      }

      setMessage(
        "Uploaded policy removed. Demo policy is active.",
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadCurrentPolicy();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reset the policy.",
      );
    } finally {
      setResetting(false);
    }
  }

  const policy = policyData?.policy;
  const metadata = policyData?.metadata;

  const isUploadedPolicy =
    policyData?.source === "uploaded_pdf";

  return (
    <section className="policy-upload-card">
      <div className="policy-card-header">
        <div>
          <span className="policy-card-eyebrow">
            Policy intelligence
          </span>

          <h3>Corporate travel policy</h3>
        </div>

        <span
          className={`policy-source-badge ${
            isUploadedPolicy ? "uploaded" : "demo"
          }`}
        >
          {loadingPolicy
            ? "Loading"
            : isUploadedPolicy
              ? "Uploaded PDF"
              : "Demo policy"}
        </span>
      </div>

      {loadingPolicy ? (
        <div className="policy-loading">
          <span className="policy-spinner" />
          Reading active policy…
        </div>
      ) : (
        <>
          <div className="policy-company-row">
            <div>
              <span>Active company</span>

              <strong>
                {policy?.company_name || "Travel Policy"}
              </strong>
            </div>

            <button
              type="button"
              className="policy-details-button"
              onClick={() =>
                setShowDetails((current) => !current)
              }
            >
              {showDetails ? "Hide rules" : "View rules"}
            </button>
          </div>

          {showDetails && policy && (
            <div className="policy-details">
              <div className="policy-metrics">
                <div>
                  <span>Flight limit</span>
                  <strong>
                    {formatCurrency(
                      policy.maximum_round_trip_flight_price,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Hotel/night</span>
                  <strong>
                    {formatCurrency(
                      policy.maximum_hotel_price_per_night,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Approval above</span>
                  <strong>
                    {formatCurrency(
                      policy.manager_approval_above,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Hotel distance</span>
                  <strong>
                    {policy.maximum_hotel_distance_km} km
                  </strong>
                </div>
              </div>

              <div className="policy-rule-list">
                {policy.rules?.map((rule, index) => (
                  <div
                    className="policy-rule"
                    key={`${rule}-${index}`}
                  >
                    <span>✓</span>
                    <p>{rule}</p>
                  </div>
                ))}
              </div>

              {metadata && (
                <div className="policy-metadata">
                  <div>
                    <span>File</span>
                    <strong>{metadata.filename}</strong>
                  </div>

                  <div>
                    <span>Pages</span>
                    <strong>{metadata.page_count}</strong>
                  </div>

                  <div>
                    <span>Rules detected</span>
                    <strong>
                      {metadata.detected_fields?.length || 0}
                    </strong>
                  </div>

                  <div>
                    <span>Fallback values</span>
                    <strong>
                      {metadata.fallback_fields?.length || 0}
                    </strong>
                  </div>
                </div>
              )}

              {metadata?.uses_fallback_values && (
                <div className="policy-fallback-warning">
                  <span>!</span>

                  <p>
                    Some rules were not detected in the PDF.
                    TripGuard used demo-policy values for those
                    fields.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="policy-upload-area">
            <input
              ref={fileInputRef}
              id="policy-pdf-input"
              className="policy-file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelection}
            />

            <label
              htmlFor="policy-pdf-input"
              className="policy-file-picker"
            >
              <span className="policy-upload-icon">↑</span>

              <div>
                <strong>
                  {selectedFile
                    ? selectedFile.name
                    : "Choose policy PDF"}
                </strong>

                <small>
                  Text-based PDF, maximum size 5 MB
                </small>
              </div>
            </label>

            <div className="policy-action-row">
              <button
                type="button"
                className="policy-upload-button"
                onClick={uploadPolicy}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <span className="policy-button-spinner" />
                    Extracting rules
                  </>
                ) : (
                  "Upload and activate"
                )}
              </button>

              {isUploadedPolicy && (
                <button
                  type="button"
                  className="policy-reset-button"
                  onClick={resetPolicy}
                  disabled={resetting}
                >
                  {resetting
                    ? "Resetting…"
                    : "Use demo policy"}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {message && (
        <div className="policy-message success">
          <span>✓</span>
          {message}
        </div>
      )}

      {error && (
        <div className="policy-message error">
          <span>!</span>
          {error}
        </div>
      )}
    </section>
  );
}


export default PolicyUploadCard;