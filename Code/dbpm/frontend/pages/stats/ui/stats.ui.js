import { createUI } from "../../../shared/utils/ui.js";
import { projectsAPI, documentsAPI, modelsAPI } from "../../../api/index.js";
import {
  getProjectIdFromURL,
  getDocumentViewerURL,
  getModelViewerURL,
} from "../../../shared/utils/url.js";
import { createTemplateElement } from "../../../shared/utils/dom.js";
import { formatNumber } from "../../../shared/utils/number.js";
let documents = [];
let models = [];
let projectId = null;
let isRefreshing = false;
let currentView = "all";
const $documentsList = $("#documentsList");
const $kpiDocs = $("#kpiDocs");
const $kpiModels = $("#kpiModels");
const $kpiDocsMeta = $("#kpiDocsMeta");
const $kpiModelsMeta = $("#kpiModelsMeta");
const $viewSwitch = $("#viewSwitch");
const $main = $("ui-rest.main");

function formatUpdatesStats(updatesStats, maxItems = 2) {
  if (!Array.isArray(updatesStats) || updatesStats.length === 0) {
    return "none";
  }

  const normalized = updatesStats
    .map((item) => ({
      type: typeof item?.type === "string" ? item.type : "unknown",
      count: Number(item?.count) || 0,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  if (!normalized.length) {
    return "none";
  }

  const shown = normalized.slice(0, maxItems);
  const summary = shown
    .map((item) => `${item.type}: ${formatNumber(item.count)}`)
    .join(", ");
  const hiddenCount = normalized.length - shown.length;
  return hiddenCount > 0 ? `${summary}, +${hiddenCount} more` : summary;
}

function getDocModels(docId) {
  const visibleModels =
    currentView === "active"
      ? models.filter((model) => !isDeleted(model))
      : models;
  return visibleModels.filter((model) => model.documentId === docId);
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

function createCountPill(type, label, count) {
  return $("<span>")
    .addClass(`pill ${type}`)
    .append(document.createTextNode(`${label} `))
    .append($("<b>").text(formatNumber(count)));
}

function renderKpis() {
  const activeDocumentsCount = documents.filter(
    (doc) => !isDeleted(doc),
  ).length;
  const activeModelsCount = models.filter((model) => !isDeleted(model)).length;
  const deletedDocumentsCount = documents.length - activeDocumentsCount;
  const deletedModelsCount = models.length - activeModelsCount;
  const displayedDocumentsCount =
    currentView === "active" ? activeDocumentsCount : documents.length;
  const displayedModelsCount =
    currentView === "active" ? activeModelsCount : models.length;

  $kpiDocs.text(formatNumber(displayedDocumentsCount));
  $kpiModels.text(formatNumber(displayedModelsCount));

  $kpiDocsMeta
    .empty()
    .append(createCountPill("active", "Active", activeDocumentsCount))
    .append(createCountPill("deleted", "Deleted", deletedDocumentsCount));

  $kpiModelsMeta
    .empty()
    .append(createCountPill("active", "Active", activeModelsCount))
    .append(createCountPill("deleted", "Deleted", deletedModelsCount));
}

function renderViewSwitch() {
  $viewSwitch
    .find(".switch-btn")
    .removeClass("is-current")
    .filter(`[data-value='${currentView}']`)
    .addClass("is-current");
}

function renderScope() {
  $main.attr("data-current-scope", currentView);
}

function getVisibleDocuments() {
  if (currentView === "active") {
    return documents.filter((doc) => !isDeleted(doc));
  }
  return documents;
}

async function renderPage() {
  renderKpis();
  $documentsList.empty();
  await renderDocumentsList(getVisibleDocuments());
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
    await renderPage();
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
    const allDocModels = models.filter((model) => model.documentId === doc.id);
    const docModels = getDocModels(doc.id);
    const activeModelsCount = allDocModels.filter(
      (model) => !isDeleted(model),
    ).length;
    const deletedModelsCount = allDocModels.length - activeModelsCount;
    // const versionName = latestVersion ? latestVersion.name : "Untitled Document";
    const $documentItem = createTemplateElement("documentItemTemplate");
    $documentItem.attr("data-doc-id", doc.id);
    $documentItem
      .find("[data-ref='documentName']")
      .text(document?.name || "Untitled Document");
    $documentItem
      .find("[data-ref='documentVersion']")
      .text(`v${versions.length}`);
    setStatusPill($documentItem.find("[data-ref='documentStatusPill']"), doc);
    bindRestoreButton(
      $documentItem.find("[data-ref='restoreDocumentButton']"),
      {
        shouldShow: isDeleted(doc),
        label: "Restore",
        onRestore: () => restoreDocument(doc.id),
      },
    );
    $documentItem
      .find("[data-ref='wordsCount']")
      .text(formatNumber(latestVersion?.wordsCount ?? 0));
    $documentItem
      .find("[data-ref='modelsCount']")
      .text(
        formatNumber(
          currentView === "active" ? activeModelsCount : allDocModels.length,
        ),
      );
    $documentItem
      .find("[data-ref='modelsStats']")
      .text(
        `(active: ${formatNumber(activeModelsCount)} | deleted: ${formatNumber(deletedModelsCount)})`,
      );
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
        .find("[data-ref='modelUpdatesStats']")
        .text(formatUpdatesStats(model?.updatesStats || model?.updateSummary));
      $modelItem
        .find("[data-ref='versionUpdatesStats']")
        .text(
          formatUpdatesStats(
            latestModelVersion?.updatesStats || latestModelVersion?.updateSummary,
          ),
        );
      $modelItem
        .find("[data-ref='modelLink']")
        .attr("href", getModelViewerURL(modelVersionId))
        .text("View Model");
      $modelsGrid.append($modelItem);
    });
  }
}

createUI({
  setup: async () => {
    projectId = getProjectIdFromURL();
    await reloadStats();
    renderViewSwitch();
    renderScope();
    // const overview = await projectsAPI.getOverviewWithDeleted(projectId);
    // console.log("Fetched project overview with deleted:", overview);
    // console.log("Fetched project details:", { documents, models });
  },
  bindListeners: () => {
    $viewSwitch.on("click", ".switch-btn", async function () {
      const selectedView = $(this).data("value");
      if (!selectedView || selectedView === currentView) {
        return;
      }
      currentView = selectedView;
      renderViewSwitch();
      renderScope();
      await renderPage();
    });
  },
});
