// import { initProjectsUI } from "./projects.ui.js";

// console.log(
//   "home/init.js - Starting initialization...",
//   new Date().toISOString(),
// );

// $(function () {
//   initProjectsUI();
// });
import { documentsAPI, projectsAPI } from "../api/index.js";
import { getProjectIdFromURL } from "../util/url.js";

const projectId = getProjectIdFromURL();
const documentsPromise = documentsAPI.getAllByProjectId(projectId);

$(document).ready(() => {
  documentsPromise.then((docs) => {
    console.log("Fetched documents for stats:", docs);
    const documentList = document.getElementById("documentList");
    const template = document.getElementById("documentItemTemplate");

    docs.forEach((doc) => {
      const clone = template.content.cloneNode(true);
      const li = clone.querySelector("li");
      li.setAttribute("data-docid", doc.id);
      const nameSpan = clone.querySelector(".document-name");
      nameSpan.textContent = doc.name || "Unnamed Document";
      documentList.appendChild(clone);
    });
  });
  const $projectLink = $("#projectLink");
  const projectLink = $projectLink[0];
  if (projectLink) {
    projectLink.href = "workspace.html" + window.location.search;
  }
  projectsAPI
    .getProjectById(projectId)
    .then((project) => $projectLink.text(project?.name || "Unnamed Project"));
});
