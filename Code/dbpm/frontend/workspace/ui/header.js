// Project UI Module
import { workspaceStore, projectStore } from "../store/index.js";

function changeProjectName(name) {
  console.log("Changing project name display to:", name);
  $("#projectName").text(name || "Unnamed Project");
}

export function initHeaderUI() {
  projectStore.subscribe((state, { key, oldValue, newValue }) => {
    if (key === "name") {
      changeProjectName(newValue);
    }
  });

  // Initialize with current project name if available
  $(function () {
    const statsLink = document.getElementById("statsLink");
    if (statsLink) {
      statsLink.href = "stats.html" + window.location.search;
    }

    const logLink = document.getElementById("logLink");
    if (logLink) {
      logLink.href = "/data/logs/" + workspaceStore.getProjectId() + ".yaml";
    }

    // Set up iframe
    const iframe = document.getElementById("converter-frame");
    if (iframe) {
      iframe.addEventListener("load", () => {
        iframeLoaded = true;
      });
    }
  });
  console.log("Header UI initialized");
}
