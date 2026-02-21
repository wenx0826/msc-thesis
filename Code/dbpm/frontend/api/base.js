// Base URL and shared utilities for API calls
function resolveBaseURL() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  // Node/runtime fallback for scripts/tests importing frontend API modules.
  if (typeof process !== "undefined" && process.env?.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  return "http://127.0.0.1:6688";
}

// export const baseURL = resolveBaseURL();
export const baseURL = window.location.origin;

export async function handleResponse(response, errorMsg) {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || errorMsg);
  }
  return await response.json();
}

export async function handleTextResponse(response, errorMsg) {
  if (!response.ok) {
    throw new Error(errorMsg);
  }
  return await response.text();
}
