import { createUI } from "../../../shared/utils/ui.js";
import { documentsAPI, projectsAPI } from "../../../api/index.js";
import {
  getProjectIdFromURL,
  getProjectWorkspaceURL,
  getDocumentURL,
} from "../../../shared/utils/url.js";
import { $cloneTemplate } from "../../../shared/utils/dom.js";
import store from "../store.js";

let documents = [];
let models = [];
const $documentsList = $("#documentsList");

async function renderDocumentsList(documents) {
  for (const doc of documents) {
    const $documentItem = $cloneTemplate("documentItemTemplate")
      .children()
      .first();
    $documentItem.find("li").attr("data-doc-id", doc.id);
    $documentItem
      .find("[data-ref='documentName']")
      .text(doc.name || "Unnamed Document");
    $documentItem
      .find("[data-ref='documentLink']")
      .attr("href", getDocumentURL(doc.id));
    $documentsList.append($documentItem);
    // renderDocumentModels(doc.id, $documentItem);
  }
}

createUI({
  setup: async () => {
    const projectId = getProjectIdFromURL();
    const details = await projectsAPI.getComponentsStats(projectId, true);
    documents = details.documents;
    models = details.models;
    renderDocumentsList(documents);
    // const overview = await projectsAPI.getOverviewWithDeleted(projectId);
    // console.log("Fetched project overview with deleted:", overview);
    // console.log("Fetched project details:", { documents, models });
  },
  bindListeners: () => {},
});
