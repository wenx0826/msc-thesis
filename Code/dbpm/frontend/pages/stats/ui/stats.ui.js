import { createUI } from "../../../shared/utils/ui.js";
import { projectsAPI } from "../../../api/index.js";
import {
  getProjectIdFromURL,
  getDocumentURL,
  getModelGraphRenderURL,
} from "../../../shared/utils/url.js";
import { $cloneTemplate } from "../../../shared/utils/dom.js";
import { formatNumber } from "../../../shared/utils/number.js";
let documents = [];
let models = [];
const $documentsList = $("#documentsList");

function getDocModels(docId) {
  return models.filter((model) => model.documentId === docId);
}

async function renderDocumentsList(documents) {
  for (const doc of documents) {
    const versions = doc.versions || [];
    const latestVersion = versions.at(-1);
    const docModels = getDocModels(doc.id);
    // const versionName = latestVersion ? latestVersion.name : "Untitled Document";
    const $documentItem = $cloneTemplate("documentItemTemplate")
      .children()
      .first();
    $documentItem.find("li").attr("data-doc-id", doc.id);
    $documentItem
      .find("[data-ref='documentName']")
      .text(latestVersion?.name || "Untitled Document");
    $documentItem
      .find("[data-ref='documentVersion']")
      .text(`v${versions.length}`);
    $documentItem
      .find("[data-ref='wordsCount']")
      .text(formatNumber(latestVersion?.wordsCount ?? 0));
    $documentItem.find("[data-ref='modelsCount']").text(docModels.length);
    $documentItem
      .find("[data-ref='documentLink']")
      .attr("href", latestVersion?.id ? getDocumentURL(latestVersion.id) : "#");
    $documentsList.append($documentItem);
    // renderDocumentModels(doc.id, $documentItem);
    const $modelsList = $documentItem.find("[data-ref='modelsList']");
    docModels.forEach((model) => {
      const $modelItem = $cloneTemplate("modelItemTemplate").children().first();
      const modelVersions = model.versions || [];
      const latestModelVersion = modelVersions.at(-1);
      const modelVersionId = latestModelVersion?.id || model.latestVersionId;
      $modelItem
        .find("[data-ref='modelName']")
        .text(latestModelVersion?.name || "Unnamed Model");
      $modelItem
        .find("[data-ref='modelVersion']")
        .text(`v${modelVersions.length}`);
      $modelItem
        .find("[data-ref='selectedWordsCount']")
        .text(formatNumber(latestModelVersion?.selectedWordsCount ?? 0));
      $modelItem
        .find("[data-ref='modelLink']")
        .attr("href", getModelGraphRenderURL(modelVersionId))
        .text("View Model");
      $modelsList.append($modelItem);
    });
  }
}

createUI({
  setup: async () => {
    const projectId = getProjectIdFromURL();
    const details = await projectsAPI.getComponentsStats(projectId);
    console.log("Fetched project details:", details);
    documents = details.documents;
    models = details.models;
    renderDocumentsList(documents);
    // const overview = await projectsAPI.getOverviewWithDeleted(projectId);
    // console.log("Fetched project overview with deleted:", overview);
    // console.log("Fetched project details:", { documents, models });
  },
  bindListeners: () => {},
});
