import { createUI } from "../../../shared/utils/ui.js";
import { projectsAPI, documentsAPI, modelsAPI } from "../../../api/index.js";
import {
  getProjectIdFromURL,
  getDocumentViewerURL,
  getWorkflowViewerURL,
} from "../../../shared/utils/url.js";
import { createTemplateElement } from "../../../shared/utils/dom.js";
import { formatNumber } from "../../../shared/utils/number.js";
let documents = [];
let models = [];
let projectId = null;
let isRefreshing = false;
const $documentsList = $("#documentsList");

function getDocModels(docId) {
  return models.filter((model) => model.documentId === docId);
}
function isDeleted(entity) {
  return !!entity.deletedAt;
}
function setStatusPill($pill, entity) {
  const deleted = isDeleted(entity);
  $pill.text(deleted ? "Deleted" : "Active");
  $pill.toggleClass("deleted", deleted);
  $pill.toggleClass("active", !deleted);
}

function bindRestoreButton($button, { shouldShow, onRestore, label }) {
  $button.off("click");
  if (!shouldShow) {
    $button.attr("hidden", "hidden");
    return;
  }

  $button.removeAttr("hidden");
  if (label) {
    $button.text(label);
  }
  $button.on("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const currentText = $button.text();
    $button.prop("disabled", true).text("Restoring...");
    try {
      await onRestore();
    } catch (error) {
      console.error("Failed to restore:", error);
      alert("Failed to restore item.");
    } finally {
      $button.prop("disabled", false).text(currentText);
    }
  });
}

async function reloadStats() {
  if (!projectId || isRefreshing) {
    return;
  }
  isRefreshing = true;
  try {
    const details = await projectsAPI.getComponentsStats(projectId);
    documents = details.documents || [];
    models = details.models || [];
    $documentsList.empty();
    await renderDocumentsList(documents);
  } finally {
    isRefreshing = false;
  }
}

async function restoreDocument(documentId) {
  await documentsAPI.restore(documentId);
  await reloadStats();
}

async function restoreModel(modelId) {
  await modelsAPI.restoreModelById(modelId);
  await reloadStats();
}

async function renderDocumentsList(documents) {
  for (const doc of documents) {
    const versions = doc.versions || [];
    const latestVersion = versions.at(-1);
    const docModels = getDocModels(doc.id);
    // const versionName = latestVersion ? latestVersion.name : "Untitled Document";
    const $documentItem = createTemplateElement("documentItemTemplate");
    $documentItem.attr("data-doc-id", doc.id);
    $documentItem
      .find("[data-ref='documentName']")
      .text(latestVersion?.name || "Untitled Document");
    $documentItem
      .find("[data-ref='documentVersion']")
      .text(`v${versions.length}`);
    setStatusPill($documentItem.find("[data-ref='documentStatusPill']"), doc);
    bindRestoreButton($documentItem.find("[data-ref='restoreDocumentButton']"), {
      shouldShow: isDeleted(doc),
      label: "Restore",
      onRestore: () => restoreDocument(doc.id),
    });
    $documentItem
      .find("[data-ref='wordsCount']")
      .text(formatNumber(latestVersion?.wordsCount ?? 0));
    $documentItem.find("[data-ref='modelsCount']").text(docModels.length);
    $documentItem
      .find("[data-ref='documentLink']")
      .attr(
        "href",
        latestVersion?.id ? getDocumentViewerURL(latestVersion.id) : "#",
      );
    $documentsList.append($documentItem);
    // renderDocumentModels(doc.id, $documentItem);
    const $modelsGrid = $documentItem.find("[data-ref='modelsGrid']");
    docModels.forEach((model) => {
      const $modelItem = createTemplateElement("modelGridTemplate");
      const modelVersions = model.versions || [];
      const latestModelVersion = modelVersions.at(-1);
      const modelVersionId = latestModelVersion?.id || model.latestVersionId;
      $modelItem
        .find("[data-ref='modelName']")
        .text(model?.name || "Unnamed Model");
      setStatusPill($modelItem.find("[data-ref='modelStatusPill']"), model);
      bindRestoreButton($modelItem.find("[data-ref='restoreModelButton']"), {
        shouldShow: isDeleted(model),
        label: "Restore",
        onRestore: () => restoreModel(model.id),
      });
      $modelItem
        .find("[data-ref='modelVersion']")
        .text(`v${modelVersions.length}`);
      $modelItem
        .find("[data-ref='selectedWordsCount']")
        .text(formatNumber(latestModelVersion?.selectedWordsCount ?? 0));
      $modelItem
        .find("[data-ref='modelLink']")
        .attr("href", getWorkflowViewerURL(modelVersionId))
        .text("View Model");
      $modelsGrid.append($modelItem);
    });
  }
}

createUI({
  setup: async () => {
    projectId = getProjectIdFromURL();
    await reloadStats();
    // const overview = await projectsAPI.getOverviewWithDeleted(projectId);
    // console.log("Fetched project overview with deleted:", overview);
    // console.log("Fetched project details:", { documents, models });
  },
  bindListeners: () => {},
});
