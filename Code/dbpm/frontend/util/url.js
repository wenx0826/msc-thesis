// URL utility functions

/**
 * Get project ID from URL query parameters
 * @returns {string|null} The project ID or null if not found
 */
export function getProjectIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("project_id");
}
