const configuredApiUrl =
  import.meta.env.VITE_API_URL
    ?.trim();


export const API_URL = (
  configuredApiUrl ||
  "http://127.0.0.1:8000"
).replace(
  /\/+$/,
  "",
);


async function parseResponse(
  response,
) {
  const payload = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.detail ||
        payload?.message ||
        (
          `Request failed with HTTP `
          + `${response.status}.`
        ),
    );
  }

  return payload;
}


export async function apiRequest(
  path,
  options = {},
) {
  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  const response = await fetch(
    `${API_URL}${normalizedPath}`,
    options,
  );

  return parseResponse(
    response,
  );
}


export async function getSystemStatus() {
  try {
    const response = await fetch(
      `${API_URL}/health`,
      {
        headers: {
          Accept:
            "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        online: false,
        message:
          `HTTP ${response.status}`,
      };
    }

    const payload = await response
      .json()
      .catch(() => ({}));

    return {
      online: true,
      message:
        payload?.status ||
        "Agent system online",
    };
  } catch {
    return {
      online: false,
      message:
        "Backend unavailable",
    };
  }
}


export async function getCurrentPolicy() {
  return apiRequest(
    "/api/policy/current",
  );
}


export async function createTripRun(
  tripRun,
) {
  const payload = await apiRequest(
    "/api/trips",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(
        tripRun,
      ),
    },
  );

  return payload.trip;
}


export async function getTripRuns(
  limit = 50,
) {
  const payload = await apiRequest(
    `/api/trips?limit=${limit}`,
  );

  return payload.trips || [];
}


export async function getTripRun(
  tripRunId,
) {
  const payload = await apiRequest(
    `/api/trips/${encodeURIComponent(
      tripRunId,
    )}`,
  );

  return payload.trip;
}


export async function updateTripRunApproval(
  tripRunId,
  approval,
) {
  const payload = await apiRequest(
    `/api/trips/${encodeURIComponent(
      tripRunId,
    )}/approval`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        approval_status:
          approval.status,
        approval,
      }),
    },
  );

  return payload.trip;
}


export async function getApprovalRequests(
  limit = 50,
) {
  const payload = await apiRequest(
    `/api/approvals?limit=${limit}`,
  );

  return payload.approvals || [];
}