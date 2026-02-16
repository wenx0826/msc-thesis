// Project UI Module
import { projectsAPI } from "../../../api/index.js";
import {
  getProjectIdFromURL,
  getProjectLogURL,
} from "../../../shared/util/url.js";
import { default as setProjectNameEditor } from "../../../shared/ui/inlineEditor.js";

const projectId = getProjectIdFromURL();
const $projectName = $("#projectName");

function setProjectName() {
  projectsAPI.get(projectId).then((project) => {
    $projectName.text(project?.name || "Unnamed Project");
  });
}

(() => {
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
  $("#logLink").attr("href", getProjectLogURL(projectId));
  $("#statsLink").attr("href", "stats.html" + window.location.search);
})();
