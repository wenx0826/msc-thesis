// import { initProjectsUI } from "./projects.ui.js";

// console.log(
//   "home/init.js - Starting initialization...",
//   new Date().toISOString(),
// );

// $(function () {
//   initProjectsUI();
// });
import { documentsAPI } from "../api/index.js";
import { getProjectIdFromURL } from "../util/url.js";
import { initProjectUI } from "./project.ui.js";
const projectId = getProjectIdFromURL();
console.log("Stats init - Project ID:", projectId);
const documents = documentsAPI.getAllByProjectId(projectId);
documents.then((docs) => {
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
