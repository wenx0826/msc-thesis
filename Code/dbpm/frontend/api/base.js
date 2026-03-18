// Base URL and shared utilities for API calls
function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function resolveBaseURL() {
  if (typeof globalThis !== "undefined" && globalThis.location?.origin) {
    const { origin, hostname } = globalThis.location;

    if (hostname === "lehre.bpm.in.tum.de") {
      return `${trimTrailingSlash(origin)}/ports/6688`;
    }

    return trimTrailingSlash(origin);
  }

  // Allow non-browser consumers to inject an absolute API origin when needed.
  if (typeof process !== "undefined" && process.env?.API_BASE_URL) {
    return trimTrailingSlash(process.env.API_BASE_URL);
  }

  return "";
}

export const baseURL = resolveBaseURL();

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
