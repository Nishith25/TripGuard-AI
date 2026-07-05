export const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


async function parseResponse(response) {
  const payload = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.detail ||
        payload?.message ||
        `Request failed with HTTP ${response.status}.`,
    );
  }

  return payload;
}


export async function apiRequest(
  path,
  options = {},
) {
  const response = await fetch(
    `${API_URL}${path}`,
    options,
  );

  return parseResponse(response);
}


export async function getSystemStatus() {
  try {
    const response = await fetch(
      `${API_URL}/health`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        online: false,
        message: `HTTP ${response.status}`,
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
      message: "Backend unavailable",
    };
  }
}


export async function getCurrentPolicy() {
  return apiRequest(
    "/api/policy/current",
  );
}