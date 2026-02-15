// import { initProjectsUI } from "./projects.ui.js";
import { documentsAPI, projectsAPI } from "../../../api/index.js";
import {
  getProjectIdFromURL,
  getDocumentURL,
} from "../../../shared/util/url.js";
import { cloneTemplate } from "../../../shared/util/dom.js";
const projectId = getProjectIdFromURL();

function renderProjectLink() {
  const $projectLink = $("#projectLink");
  $projectLink[0].href = "workspace.html" + window.location.search;
  projectsAPI.get(projectId).then((project) => {
    $projectLink.text(project?.name || "Unnamed Project");
  });
}

async function renderDocumentModels(documentId) {
  const $documentItem = $(`li[data-doc-id='${documentId}']`);
  const $modelsList = $documentItem.find("[data-ref='modelsList']");
  const models = await documentsAPI.getActiveModelsById(documentId);

  for (const model of models) {
    const $modelItem = cloneTemplate("modelItemTemplate").children().first();
    $modelItem.attr("data-model-id", model.id);
    $modelItem
      .find("[data-ref='modelName']")
      .text(model.name || "Unnamed Model");
    $modelsList.append($modelItem);
  }
  console.log("Fetched models for document:", documentId, models);
}

async function renderDocumentsList() {
  try {
    const docs = await documentsAPI.getAllByProjectId(projectId);
    const $documentsList = $("#documentsList");

    for (const doc of docs) {
      const $documentItem = cloneTemplate("documentItemTemplate");
      $documentItem.find("li").attr("data-doc-id", doc.id);
      $documentItem
        .find("[data-ref='documentName']")
        .text(doc.name || "Unnamed Document");
      $documentItem
        .find("[data-ref='documentLink']")
        .attr("href", getDocumentURL(doc.id));
      $documentsList.append($documentItem);
      renderDocumentModels(doc.id);
    }
  } catch (error) {
    console.error("Error initializing stats:", error);
  }
}

function init() {
  renderProjectLink();
  renderDocumentsList();
}
init();
