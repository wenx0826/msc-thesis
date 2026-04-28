import { createUI } from "../../../shared/utils/ui.js";
import { projectsAPI } from "../../../api/index.js";
import {
  getProjectIdFromURL,
  getProjectLogURL,
} from "../../../shared/utils/url.js";
import { default as setProjectNameEditor } from "../../../shared/widgets/inline-editor.js";

const projectId = getProjectIdFromURL();
const $projectName = $("#projectName");
const $projectLogLink = $("#logLink");
const $projectStatsLink = $("#statsLink");

function setProjectName() {
  projectsAPI.get(projectId).then((project) => {
    $projectName.text(project?.name || "Unnamed Project");
  });
}

createUI({
  setup: () => {
    setProjectName();
    setProjectNameEditor({
      $scope: $projectName.parent(),
      trigger: "click",
      autoGrow: true,
      onSave: (name) => {
        console.log("Saved:", name);
        projectsAPI.update(projectId, { name });
      },
    });
    $projectLogLink.attr("href", getProjectLogURL(projectId));
    $projectStatsLink.attr("href", "stats.html" + window.location.search);
  },
});
