// Project UI Module
import { projectsAPI } from "../../../api/index.js";
import {
  getProjectIdFromURL,
  getProjectLogURL,
} from "../../../shared/util/url.js";
import initInlineEditor from "../../../shared/ui/inlineEditor.js";

const projectId = getProjectIdFromURL();

const $projectName = $("#projectName");

function updateProjectName(name) {
  // console.log("Changing project name display to:", name);

  $projectName.text(name || "Unnamed Project");
}

function updateLogLink(projectId) {
  const logLink = document.getElementById("logLink");
  if (logLink && projectId) {
    logLink.href = getProjectLogURL(projectId);
  }
}

export function initHeaderUI() {
  projectsAPI.get(projectId).then((project) => {
    // updateProjectName(project?.name || "Unnamed Project");
    $projectName.text(project?.name || "Unnamed Project");
  });
  // updateLogLink(projectId);
  // updateProjectName(projectStore.state.name);
  const projectNameEditor = initInlineEditor({
    $scope: $projectName.parent(),
    trigger: "click",
    onSave: (root, value) => {
      console.log("Saved:", root.dataset.id, value);
    },
  });
  $("#logLink").attr("href", getProjectLogURL(projectId));
  $("#statsLink").attr("href", "stats.html" + window.location.search);
}
