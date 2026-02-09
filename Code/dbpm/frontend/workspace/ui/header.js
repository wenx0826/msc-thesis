// Project UI Module
import { workspaceStore, projectStore } from "../store/index.js";
import { getProjectLogURL } from "../../util/url.js";

function updateProjectName(name) {
  console.log("Changing project name display to:", name);
  $("#projectName").text(name || "Unnamed Project");
}

function updateLogLink(projectId) {
  const logLink = document.getElementById("logLink");
  if (logLink && projectId) {
    logLink.href = getProjectLogURL(projectId);
  }
}

export function initHeaderUI() {
  const projectId = workspaceStore.getProjectId();
  updateLogLink(projectId);
  updateProjectName(projectStore.state.name);
  // Subscribe for runtime changes (e.g., user renames project)
  projectStore.subscribe((state, { key, newValue }) => {
    if (key === "name") {
      updateProjectName(newValue);
    }
  });

  // Initialize with current values from stores (data already loaded)

  // Set up static links
  const statsLink = document.getElementById("statsLink");
  if (statsLink) {
    statsLink.href = "stats.html" + window.location.search;
  }

  console.log("Header UI initialized");
}
