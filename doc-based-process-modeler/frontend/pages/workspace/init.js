import { workspaceService } from "./services/index.js";
import { getProjectIdFromURL } from "../../shared/utils/url.js";
import { projectsAPI } from "../../api/index.js";

function redirectToHome() {
  window.location.replace("index.html");
}

async function initWorkspace() {
  const projectId = getProjectIdFromURL();
  if (!projectId) {
    redirectToHome();
    return;
  }

  try {
    await projectsAPI.get(projectId);
  } catch (error) {
    if (error?.message === "Project not found") {
      redirectToHome();
      return;
    }
    console.error(
      "Failed to validate project before workspace load. Continuing:",
      error,
    );
  }

  await import("./ui/index.js");
  await workspaceService.loadWorkspace(projectId);
}

initWorkspace().catch((error) => {
  if (error?.message === "Project not found") {
    redirectToHome();
    return;
  }
  console.error("Failed to initialize workspace:", error);
});
