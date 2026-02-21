import { createUI } from "../../../shared/util/ui.js";

function renderProjectLink() {
  const $projectLink = $("#projectLink");
  $projectLink[0].href = getProjectWorkspaceURL(projectId);
  projectsAPI.get(projectId).then((project) => {
    $projectLink.text(project?.name || "Unnamed Project");
  });
}

createUI({
  setup: () => {
    // const
    renderProjectLink();
  },
  bindListeners: () => {},
});
