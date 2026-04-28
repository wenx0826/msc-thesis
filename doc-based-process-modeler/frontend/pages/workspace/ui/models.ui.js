import { createUI } from "../../../shared/utils/ui.js";
import { modelsStore, workspaceStore, documentsStore } from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
import { createTemplateElement } from "../../../shared/utils/dom.js";
import initInlineEditor from "../../../shared/widgets/inline-editor.js";
import { scopeSvgIds } from "../../../modules/model/utils/svg-scope.js";
import { createModelActionsMenu } from "./model-actions-menu.ui.js";
import { requestCloseModelPopover } from "./model-popover.ui.js";

const $modelsPanel = $("#modelsPanel");
const $viewSwitch = $("#modelsViewSwitch");
const $modelsGrid = $("#modelsGrid");
const $modelsList = $("#modelsList");
const $modelsBulkEditToggleButton = $("#modelsBulkEditToggleButton");
const $modelsSelectedCount = $("#modelsSelectedCount");
const $modelsSelectAllButton = $("#modelsSelectAllButton");
const $modelsClearSelectionButton = $("#modelsClearSelectionButton");
const $modelsDeleteSelectedButton = $("#modelsDeleteSelectedButton");
const $documentsSelect = $("#documentsSelect");
const MODELS_LIST_HOVER_SOURCE = "models-list";
const ALL_DOCUMENTS_FILTER_VALUE = "__all__";
let selectedDocumentFilterId = ALL_DOCUMENTS_FILTER_VALUE;
let modelNameEditor;

function normalizeComparableId(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function getSelectedDocumentFilterId() {
  return selectedDocumentFilterId || ALL_DOCUMENTS_FILTER_VALUE;
}

function shouldModelBeVisible(documentId) {
  const selectedDocumentId = getSelectedDocumentFilterId();
  if (selectedDocumentId === ALL_DOCUMENTS_FILTER_VALUE) {
    return true;
  }
  return normalizeComparableId(documentId) === selectedDocumentId;
}

function getFilteredModelsCount() {
  return modelsStore
    .getList()
    .filter((model) => shouldModelBeVisible(model?.documentId)).length;
}

function syncModelPopoverWithFilteredVisibility() {
  const popoverModelId = $("#modelPopover").attr("data-model-id");
  if (!popoverModelId) {
    return;
  }
  const hasVisibleItem =
    $modelsPanel.find(`[data-model-id="${popoverModelId}"]:visible`).length > 0;
  if (!hasVisibleItem) {
    requestCloseModelPopover("models-filter");
  }
}

function applyModelsDocumentFilter() {
  const setVisibility = (_, element) => {
    const shouldShow = shouldModelBeVisible(element?.dataset?.documentId);
    element.style.display = shouldShow ? "" : "none";
  };
  $modelsGrid.find(".model-grid-item[data-model-id]").each(setVisibility);
  $modelsList.find(".model-list-item[data-model-id]").each(setVisibility);
  syncModelPopoverWithFilteredVisibility();
}

function syncDocumentsFilterOptions() {
  const documents = documentsStore.getList() || [];
  const currentFilter = getSelectedDocumentFilterId();
  const hasCurrentDocument = documents.some(
    (doc) => normalizeComparableId(doc?.id) === currentFilter,
  );
  const nextFilter =
    currentFilter === ALL_DOCUMENTS_FILTER_VALUE || hasCurrentDocument
      ? currentFilter
      : ALL_DOCUMENTS_FILTER_VALUE;
  selectedDocumentFilterId = nextFilter;

  $documentsSelect.empty();
  $("<option>")
    .val(ALL_DOCUMENTS_FILTER_VALUE)
    .text("All documents")
    .appendTo($documentsSelect);

  for (const { id, name } of documents) {
    if (!id) {
      continue;
    }
    $("<option>")
      .val(id)
      .text(name || id)
      .appendTo($documentsSelect);
  }

  $documentsSelect.val(selectedDocumentFilterId);
  if ($documentsSelect.val() === null) {
    selectedDocumentFilterId = ALL_DOCUMENTS_FILTER_VALUE;
    $documentsSelect.val(ALL_DOCUMENTS_FILTER_VALUE);
  }
  $documentsSelect.prop("disabled", documents.length === 0);
}

function onViewSwitch(event) {
  const targetView = event.currentTarget.dataset.view;
  setView(targetView);
}

function onModelItemClick(event) {
  if (
    $(event.target).closest(".item-select-checkbox, .more-actions-btn").length >
    0
  ) {
    return;
  }
  const modelId = $(event.currentTarget).data("modelId");
  if (modelsStore.getIsBulkEditMode()) {
    modelsStore.toggleSelected(modelId);
    return;
  }
  workspaceService.displayModel(modelId);
}

function onModelCheckboxMouseDown(event) {
  event.stopPropagation();
}

function onModelCheckboxChange(event) {
  event.stopPropagation();
  if (!modelsStore.getIsBulkEditMode()) {
    event.currentTarget.checked = false;
    return;
  }
  const modelId = $(event.currentTarget)
    .closest("[data-model-id]")
    .data("modelId");
  modelsStore.setSelected(modelId, event.currentTarget.checked);
}

function onSelectAllModels() {
  if (!modelsStore.getIsBulkEditMode()) {
    return;
  }
  modelsStore.selectAllVisible(getVisibleModelIds());
}

function onClearModelsSelection() {
  if (!modelsStore.getIsBulkEditMode()) {
    return;
  }
  modelsStore.clearSelection();
}

async function onDeleteSelectedModels() {
  if (!modelsStore.getIsBulkEditMode()) {
    return;
  }
  const selectedIds = modelsStore.getSelectedIds();
  if (selectedIds.length === 0) {
    return;
  }

  const { failed = [] } = await modelService.deleteModelsBulk(selectedIds);
  if (failed.length > 0) {
    console.error("Failed to delete some models:", failed);
  }
}

function onToggleModelsBulkEditMode() {
  modelsStore.toggleBulkEditMode();
}

function onModelListItemMouseEnter(event) {
  const element = event.currentTarget;
  const modelId = element?.dataset?.modelId;
  if (!modelId) {
    return;
  }

  workspaceStore.setModelPopover({
    target: {
      id: modelId,
      versionId: element.dataset.modelVersionId || null,
    },
    openDelayMs: 0,
    anchor: {
      type: "element",
      element,
    },
    source: MODELS_LIST_HOVER_SOURCE,
  });
}

function onModelListItemMouseLeave() {
  requestCloseModelPopover(MODELS_LIST_HOVER_SOURCE);
}

function onDocumentFilterChange(event) {
  const nextValue = $(event.currentTarget).val();
  selectedDocumentFilterId = nextValue || ALL_DOCUMENTS_FILTER_VALUE;
  applyModelsDocumentFilter();
  syncModelsCount();
  syncModelsSelectionControls();
}

function prepareSvgForList(svgEl, modelId) {
  // 1. responsive sizing
  const svgW = parseFloat(svgEl.getAttribute("width")) || 0;
  const svgH = parseFloat(svgEl.getAttribute("height")) || 0;
  const viewBoxAttr = svgEl.getAttribute("viewBox");
  const viewBoxParts = viewBoxAttr
    ? viewBoxAttr
        .trim()
        .split(/[\s,]+/)
        .map((v) => parseFloat(v))
    : [];
  const viewBoxW = viewBoxParts.length === 4 ? viewBoxParts[2] : 0;

  const intrinsicWidth = svgW > 0 ? svgW : viewBoxW;

  if (svgW > 0 && svgH > 0 && !svgEl.getAttribute("viewBox")) {
    svgEl.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  }
  svgEl.setAttribute("width", "100%");
  svgEl.removeAttribute("height"); // let aspect ratio determine height
  svgEl.style.display = "block";
  svgEl.style.width = "100%";
  svgEl.style.height = "auto";

  if (intrinsicWidth > 0) {
    // Fill the container when needed, but never upscale beyond original size.
    svgEl.style.maxWidth = `${intrinsicWidth}px`;
  } else {
    svgEl.style.removeProperty("max-width");
  }

  // 2. scope ids to prevent clashes between multiple SVGs in the page
  scopeSvgIds(svgEl, `list_m${modelId}`);
}

async function getModelSvg(versionId, modelId) {
  const cached = await modelService.ensureVersionCached(versionId, {
    needData: true,
    needSvg: true,
    modelId,
  });
  return cached?.svg || null;
}

function resolveModelIdByVersionId(versionId) {
  if (!versionId) {
    return null;
  }
  for (const model of modelsStore.getList()) {
    if (model?.latestVersionId === versionId) {
      return model.id;
    }
    if ((model?.versions || []).some((version) => version?.id === versionId)) {
      return model.id;
    }
  }
  return null;
}

function toSvgElement(svgSource) {
  if (!svgSource) {
    return null;
  }
  if (typeof svgSource === "string") {
    try {
      return $.parseXML(svgSource).documentElement;
    } catch (error) {
      console.error("Failed to parse SVG source:", error);
      return null;
    }
  }
  if (svgSource instanceof Element) {
    return svgSource.cloneNode(true);
  }
  return null;
}

async function addModelItem(model) {
  const modelId = model?.id;
  const isCurrent = modelId == workspaceStore.getEditingModel()?.id;
  const versionName =
    modelsStore.getLatestVersionName(modelId) || "No Versions";

  // Grid view
  const gridId = `modelGrid_${modelId}`;
  const $gridItem = createTemplateElement("modelGridTemplate")
    .attr("data-model-id", modelId)
    .attr("data-model-version-id", model.latestVersionId)
    .attr("data-document-id", model.documentId);
  const $gridDiv = $gridItem.find("[data-ref='modelGrid']").first();
  $gridDiv.attr("id", gridId);
  $gridItem.find("[data-ref='modelName']").text(model.name);
  $gridItem.find("[data-ref='versionName']").text(versionName);
  if (isCurrent) {
    $gridItem.addClass("is-current");
  }
  $modelsGrid.append($gridItem);
  console.log("Received SVG for model ID", modelId);
  try {
    const outputFrame = await getModelSvg(model.latestVersionId, modelId);
    if (!outputFrame) {
      throw new Error(
        `No cached SVG available for version ${model.latestVersionId}`,
      );
    }
    updateModelInList({ modelId, svg: outputFrame });
  } catch (err) {
    console.error("Error getting model SVG for model ID", modelId, ":", err);
  }

  // List view
  const $listItem = createTemplateElement("modelItemTemplate")
    .attr("data-model-id", modelId)
    .attr("data-model-version-id", model.latestVersionId)
    .attr("data-document-id", model.documentId);
  $listItem.find("[data-ref='modelName']").text(model.name);
  $listItem.find("[data-ref='versionName']").text(versionName);
  if (isCurrent) {
    $listItem.addClass("is-current");
  }
  $modelsList.append($listItem);
  setModelItemSelected(modelId, modelsStore.isSelected(modelId));
}

function updateModelInList({ modelId, svg }) {
  const $gridDiv = $(`#modelGrid_${modelId}`);
  if ($gridDiv.length === 0) {
    return;
  }
  $gridDiv.empty();

  const svgEl = toSvgElement(svg);
  if (!svgEl) return;
  prepareSvgForList(svgEl, modelId);

  $gridDiv.append(svgEl);
}

function setView(view) {
  $viewSwitch.find(".switch-btn").removeClass("is-current");
  $viewSwitch.find(`.switch-btn[data-view="${view}"]`).addClass("is-current");
  $modelsPanel.attr("data-current-view", view);
  syncModelsSelectionControls();
}

function getCurrentView() {
  return $modelsPanel.attr("data-current-view") || "grid";
}

function getVisibleModelIds() {
  if (getCurrentView() === "list") {
    return $modelsList
      .find(".model-list-item[data-model-id]:visible")
      .map((_, element) => String(element.dataset.modelId || ""))
      .get()
      .filter(Boolean);
  }
  return $modelsGrid
    .find(".model-grid-item[data-model-id]:visible")
    .map((_, element) => String(element.dataset.modelId || ""))
    .get()
    .filter(Boolean);
}

function syncModelsSelectionControls() {
  const isBulkEditMode = modelsStore.getIsBulkEditMode();
  const selectedCount = modelsStore.getSelectedCount();
  const visibleIds = getVisibleModelIds();
  const visibleCount = visibleIds.length;
  const selectedVisibleCount = visibleIds.filter((id) =>
    modelsStore.isSelected(id),
  ).length;

  $modelsSelectedCount.text(`${selectedCount} selected`);
  if (!isBulkEditMode) {
    $modelsSelectAllButton.prop("disabled", true);
    $modelsClearSelectionButton.prop("disabled", true);
    $modelsDeleteSelectedButton.prop("disabled", true);
    return;
  }
  $modelsSelectAllButton.prop(
    "disabled",
    visibleCount === 0 || selectedVisibleCount >= visibleCount,
  );
  $modelsClearSelectionButton.prop("disabled", selectedCount === 0);
  $modelsDeleteSelectedButton.prop("disabled", selectedCount === 0);
}

function syncModelsBulkModeUI() {
  const isBulkEditMode = modelsStore.getIsBulkEditMode();
  const hasModels = modelsStore.getCount() > 0;
  $modelsPanel.attr("data-bulk-mode", isBulkEditMode ? "true" : "false");
  $modelsBulkEditToggleButton.text(isBulkEditMode ? "Done" : "Bulk edit");
  $modelsBulkEditToggleButton.prop("disabled", !hasModels && !isBulkEditMode);
  syncModelsSelectionControls();
}

function syncModelsCount() {
  const totalCount = modelsStore.getCount();
  const filteredCount = getFilteredModelsCount();
  const countLabel =
    getSelectedDocumentFilterId() === ALL_DOCUMENTS_FILTER_VALUE
      ? `${totalCount}`
      : `${filteredCount}/${totalCount}`;
  const isBulkEditMode = modelsStore.getIsBulkEditMode();
  const hasModels = totalCount > 0;
  $("[data-ref='modelsCount']").text(countLabel);
  $modelsBulkEditToggleButton.prop("disabled", !hasModels && !isBulkEditMode);
}

function getModelItem(modelId) {
  return $modelsPanel.find(`[data-model-id="${modelId}"]`);
}

function updateModelItemName(modelId, name) {
  getModelItem(modelId).find("[data-ref='modelName']").text(name);
}

function updateModelItemVersion({ id, modelId, name: versionName }) {
  getModelItem(modelId)
    .attr("data-model-version-id", id)
    .find("[data-ref='versionName']")
    .text(versionName);
}

function setModelItemCurrent(modelId, isCurrent) {
  getModelItem(modelId).toggleClass("is-current", isCurrent);
}

function setModelItemSelected(modelId, isSelected) {
  const $items = getModelItem(modelId);
  if ($items.length === 0) {
    return;
  }
  $items.toggleClass("is-selected", isSelected);
  $items.find(".item-select-checkbox").prop("checked", isSelected);
}

function syncModelSelectionsInView() {
  for (const model of modelsStore.getList()) {
    setModelItemSelected(model.id, modelsStore.isSelected(model.id));
  }
}

const removeModelItem = (modelId) => {
  $(`.model-grid-item[data-model-id="${modelId}"]`).remove();
  $(`.model-list-item[data-model-id="${modelId}"]`).remove();
};

createUI({
  setup: () => {
    modelNameEditor = initInlineEditor({
      $scope: $modelsPanel,
      onSave: (newValue, $view) => {
        const modelId = $view.closest("[data-model-id]").data("modelId");
        return modelService.renameModel(modelId, newValue);
      },
    });
  },
  bindListeners: () => {
    $viewSwitch.on("click", ".switch-btn", onViewSwitch);

    $modelsPanel.on("mousedown", "[data-model-id]", onModelItemClick);
    $modelsPanel.on(
      "mousedown",
      ".item-select-checkbox",
      onModelCheckboxMouseDown,
    );
    $modelsPanel.on("change", ".item-select-checkbox", onModelCheckboxChange);
    $modelsList.on("mouseenter", ".model-list-item", onModelListItemMouseEnter);
    $modelsList.on("mouseleave", ".model-list-item", onModelListItemMouseLeave);
    $modelsSelectAllButton.on("click", onSelectAllModels);
    $modelsClearSelectionButton.on("click", onClearModelsSelection);
    $modelsDeleteSelectedButton.on("click", onDeleteSelectedModels);
    $modelsBulkEditToggleButton.on("click", onToggleModelsBulkEditMode);
    $documentsSelect.on("change", onDocumentFilterChange);
    syncModelsBulkModeUI();

    $modelsPanel.on(
      "mousedown",
      ".model-grid-item .more-actions-btn, .model-list-item .more-actions-btn",
      (e) => {
        e.stopPropagation();
        const $item = $(e.currentTarget).closest(
          ".model-grid-item, .model-list-item",
        );
        const modelId = $item.data("modelId");
        const $modelNameView = $item.find("[data-ref='modelName']").first();
        createModelActionsMenu(e, {
          modelId,
          modelNameEditor,
          $modelNameView,
        });
      },
    );
  },
  subscribeStores: () => {
    modelsStore.subscribe(async ({ key, operation, value }) => {
      switch (key) {
        case "entitiesById":
          switch (operation) {
            case "init":
              for (const model of value) {
                await addModelItem(model);
              }
              syncModelsCount();
              syncModelSelectionsInView();
              syncModelsSelectionControls();
              break;
            case "add":
              await addModelItem(value);
              applyModelsDocumentFilter();
              syncModelsCount();
              syncModelsSelectionControls();
              break;
            case "update":
              updateModelItemName(value.id, value.name);
              syncModelsSelectionControls();
              break;
            case "delete":
              removeModelItem(value.id);
              applyModelsDocumentFilter();
              syncModelsCount();
              syncModelsSelectionControls();
              break;
            default:
              break;
          }
          break;
        case "entitiesById.versions":
          switch (operation) {
            case "add":
              updateModelItemVersion(value);
              break;
            default:
              break;
          }
          break;
        case "selectedIds":
          syncModelSelectionsInView();
          syncModelsSelectionControls();
          break;
        case "isBulkEditMode":
          syncModelsBulkModeUI();
          syncModelSelectionsInView();
          break;
        case "cachedVersionsById":
          switch (operation) {
            case "add":
            case "update": {
              const versionId = value.key;
              const modelId =
                value.modelId || resolveModelIdByVersionId(versionId);
              const latestVersionId = modelsStore.getLatestVersionId(modelId);
              if (versionId !== latestVersionId) {
                break;
              }
              updateModelInList({ modelId, svg: value.svg });
              break;
            }
            default:
              break;
          }
          break;
        default:
          break;
      }
    });
    documentsStore.subscribe(({ key, operation }) => {
      switch (key) {
        case "entitiesById":
          switch (operation) {
            case "init":
            case "add":
            case "update":
            case "delete":
              syncDocumentsFilterOptions();
              applyModelsDocumentFilter();
              syncModelsSelectionControls();
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    });
    workspaceStore.subscribe(({ key, oldValue, newValue }) => {
      switch (key) {
        case "editingModel": {
          const newId = newValue?.id;
          const oldId = oldValue?.id;
          if (newId === oldId) break;
          if (newId) setModelItemCurrent(newId, true);
          if (oldId) setModelItemCurrent(oldId, false);
          break;
        }
        default:
          break;
      }
    });
  },
});
