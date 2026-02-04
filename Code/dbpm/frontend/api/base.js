// Base URL and shared utilities for API calls
export const baseURL = window.location.origin;

/**
 * Handle fetch response with consistent error handling
 * @param {Response} response - Fetch response
 * @param {string} errorMsg - Error message if request fails
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function handleResponse(response, errorMsg) {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || errorMsg);
  }
  return await response.json();
}

/**
 * Handle fetch response returning text
 * @param {Response} response - Fetch response
 * @param {string} errorMsg - Error message if request fails
 * @returns {Promise<string>} - Text response
 */
export async function handleTextResponse(response, errorMsg) {
  if (!response.ok) {
    throw new Error(errorMsg);
  }
  return await response.text();
}
