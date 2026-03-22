import { createUI } from "../../../shared/utils/ui.js";
import { documentsAPI, projectsAPI } from "../../../api/index.js";
import {
  getProjectIdFromURL,
  getProjectWorkspaceURL,
  getDocumentURL,
} from "../../../shared/utils/url.js";
import store from "../store.js";

function renderProjectLink(projectId) {
  const $projectLink = $("#projectLink");
  $projectLink[0].href = getProjectWorkspaceURL(projectId);
  projectsAPI.get(projectId).then((project) => {
    $projectLink.text(project?.name || "Unnamed Project");
  });
}

createUI({
  setup: () => {
    const projectId = getProjectIdFromURL();
    renderProjectLink(projectId);
  },
});
