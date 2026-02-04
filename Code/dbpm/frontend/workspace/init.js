// Workspace Init - Entry point for workspace.html
// This file initializes all stores, services, and UI components

// Import services (also sets window.* for each service)
import { workspaceService } from "./services/index.js";

// Import utilities
import "./util/selection.util.js";

// Import UI modules
import { initAllUI } from "./ui/index.js";

// Get project ID from URL
function getProjectIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("project_id");
}

// Expose utilities to window for legacy code

// Start initialization when DOM is ready
$(document).ready(async () => {
  console.log(
    "workspace/init.js - Starting initialization...",
    new Date().toISOString(),
  );

  // Initialize UI first (sets up store subscriptions)
  initAllUI();
  // Then load workspace data (stores will notify subscribers)
  const projectId = getProjectIdFromURL();
  console.log("Workspace init - Project ID:", projectId);
  workspaceService.loadWorkspace(projectId);
});
