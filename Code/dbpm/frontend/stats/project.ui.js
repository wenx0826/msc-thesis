import { getProjectIdFromURL } from "../util/url.js";
const projectId = getProjectIdFromURL();
console.log("Stats init - Project ID:", projectId);
import { documentsAPI } from "../api/index.js";
// function renderHeader() {
//   const statsLink = document.getElementById("statsLink");
//   if (statsLink) {
//     statsLink.href = "stats.html" + window.location.search;
//   }
// }

function renderDocuments() {
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
}
// Document rendering is now handled in init.js for simplicity
// In the future, if we need more complex interactions, we can move it here
export function initProjectUI() {
  renderHeader();
  renderDocuments();
  // Currently, all initialization is done in init.js for simplicity
  // In the future, if we need more complex interactions, we can move them here
}
