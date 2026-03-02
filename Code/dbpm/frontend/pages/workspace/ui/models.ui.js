import { createUI } from "../../../shared/utils/ui.js";
import { modelsStore, workspaceStore } from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
import {
  createMenu,
  createTemplateElement,
} from "../../../shared/utils/dom.js";
import initInlineEditor from "../../../shared/widgets/inline-editor.js";
import { createModelActionsMenu } from "./model-actions-menu.ui.js";

const $modelsPanel = $("#modelsPanel");
const $viewSwitch = $("#modelsViewSwitch");
const $modelsGrid = $("#modelsGrid");
const $modelsList = $("#modelsList");

// #region DOM Actions
function onViewSwitch(event) {
  const targetView = event.currentTarget.dataset.view;
  setView(targetView);
}

function onModelItemClick(event) {
  const modelId = $(event.currentTarget).data("modelId");
  workspaceService.toggleModelDisplay(modelId);
}
// #endregion

/**
 * Make all internal SVG id/url(#...) references unique by prefixing them
 * with a model-specific string.  This prevents collisions when multiple
 * model SVGs live in the same document.
 */
function scopeSvgIds(svgEl, prefix) {
  // Collect every element inside the SVG that carries an id
  const idEls = svgEl.querySelectorAll("[id]");
  const idMap = new Map();
  idEls.forEach((el) => {
    const oldId = el.getAttribute("id");
    const newId = `${prefix}_${oldId}`;
    idMap.set(oldId, newId);
    el.setAttribute("id", newId);
  });

  if (idMap.size === 0) return;

  // Build a single regex that matches url(#oldId) or just #oldId in href
  const escaped = [...idMap.keys()].map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const urlRe = new RegExp(`url\\(#(${escaped.join("|")})\\)`, "g");
  const hrefRe = new RegExp(`^#(${escaped.join("|")})$`);

  // Walk every element and patch relevant attributes
  const all = svgEl.querySelectorAll("*");
  const urlAttrs = [
    "clip-path",
    "mask",
    "fill",
    "stroke",
    "filter",
    "marker-end",
    "marker-start",
    "marker-mid",
  ];
  all.forEach((el) => {
    urlAttrs.forEach((attr) => {
      const v = el.getAttribute(attr);
      if (v && urlRe.lastIndex !== undefined) urlRe.lastIndex = 0;
      if (v && urlRe.test(v)) {
        urlRe.lastIndex = 0;
        el.setAttribute(
          attr,
          v.replace(urlRe, (_, id) => `url(#${idMap.get(id)})`),
        );
      }
    });
    // xlink:href or href (for <use> etc.)
    ["href", "xlink:href"].forEach((attr) => {
      const v = el.getAttribute(attr);
      if (v && hrefRe.test(v)) {
        const oldId = v.slice(1);
        if (idMap.has(oldId)) el.setAttribute(attr, `#${idMap.get(oldId)}`);
      }
    });
  });
}

/**
 * Prepare an SVG element for display in the model list:
 * – add viewBox so it scales to fit container width
 * – scope internal ids to avoid cross-SVG collisions
 */
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
  scopeSvgIds(svgEl, `m${modelId}`);
}

async function getModelSvg(versionId) {
  const cached = await modelService.ensureVersionCached(versionId, {
    needData: true,
    needSvg: true,
  });
  return cached?.svg || null;
}

async function renderModel(model) {
  //
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
    const outputFrame = await getModelSvg(model.latestVersionId);
    if (!outputFrame) {
      throw new Error(`No cached SVG available for version ${model.latestVersionId}`);
    }
    model.svg = $.parseXML(outputFrame).documentElement;
    prepareSvgForList(model.svg, modelId);
    $gridDiv.append(model.svg);
  } catch (err) {
    console.error("Error getting model SVG for model ID", modelId, ":", err);
    // return;
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
}

function updateModelInList(model) {
  const modelId = model?.meta?.id;
  const modelVersionId = model?.latestVersionId;
  var gridId = `modelGrid_${modelVersionId}`;
  const $gridDiv = $(`#${gridId}`);
  $gridDiv.empty();

  const svgEl = $X(model.svg);
  if (!svgEl) return;
  prepareSvgForList(svgEl, modelId);
  model.svg = svgEl;

  $gridDiv.append(svgEl);
}

// #region DOM Manipulation
function setView(view) {
  $viewSwitch.find(".switch-btn").removeClass("is-current");
  $viewSwitch.find(`.switch-btn[data-view="${view}"]`).addClass("is-current");
  $modelsPanel.attr("data-current-view", view);
}

function updateModelsCount() {
  const count = modelsStore.getCount();
  $("[data-ref='modelsCount']").text(count);
}
function getModelItem(modelId) {
  return $modelsPanel.find(`[data-model-id="${modelId}"]`);
}
function findModelGridItem(modelId) {
  return $modelsGrid.find(`.model-grid-item[data-model-id="${modelId}"]`);
}
function findModelListItem(modelId) {
  return $modelsList.find(`.model-list-item[data-model-id="${modelId}"]`);
}

function updateModelItem(model) {
  const modelId = model.id;
  const modelName = model.name;
  const versionName =
    modelsStore.getLatestVersionName(modelId) || "No Versions";
  getModelItem(modelId)
    .attr("data-model-version-id", model.latestVersionId || "")
    .find("[data-ref='modelName']")
    .text(modelName);
  getModelItem(modelId).find("[data-ref='versionName']").text(versionName);
}

function setModelItemCurrent(modelId, isCurrent) {
  getModelItem(modelId).toggleClass("is-current", isCurrent);
}

const removeModelItem = (modelId) => {
  $(`.model-grid-item[data-model-id="${modelId}"]`).remove();
  $(`.model-list-item[data-model-id="${modelId}"]`).remove();
};
// #endregion

// UI Initialization
createUI({
  setup: () => {
    const modelNameEditor = initInlineEditor({
      $scope: $modelsPanel,
      onSave: (newValue, $view) => {
        const modelId = $view.closest("[data-model-id]").data("modelId");
        return modelService.renameModel(modelId, newValue);
      },
    });
    return { modelNameEditor };
  },
  bindListeners: ({ modelNameEditor }) => {
    $viewSwitch.on("click", ".switch-btn", onViewSwitch);

    $modelsPanel.on("mousedown", "[data-model-id]", onModelItemClick);

    $modelsPanel.on("mousedown", ".more-actions-btn", (e) => {
      e.stopPropagation();
      const $item = $(e.currentTarget).closest(
        ".model-grid-item, .model-list-item",
      );
      const modelId = $item.data("modelId");
      const $modelNameView = $item.find("[data-ref='modelName']").first();
      const menuItems = createModelActionsMenu(e, {
        modelId,
        modelNameEditor,
        $modelNameView,
      });
      // createMenu(e, menuItems);
    });
  },
  subscribeStores: () => {
    modelsStore.subscribe(async (state, { key, operation, value }) => {
      switch (key) {
        case "entitiesById":
          switch (operation) {
            case "init":
              for (const model of value) {
                await renderModel(model);
              }
              updateModelsCount();
              break;
            case "add":
              await renderModel(value);
              updateModelsCount();
              break;
            case "update":
              updateModelItem(value);
              break;
            case "delete":
              console.log("Model deleted with ID:", value.id);
              removeModelItem(value.id);
              updateModelsCount();
              break;
            default:
              break;
          }
          break;
        case "entitiesById.versions":
          if (operation !== "add") {
            break;
          }
          if (value?.modelId) {
            const model = modelsStore.getEntity(value.modelId);
            if (model) {
              updateModelItem(model);
            }
          }
          break;
        default:
          break;
      }
    });
    workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "editingModel":
          const newModelId = newValue?.id;
          const oldModelId = oldValue?.id;
          if (newModelId === oldModelId) {
            break;
          }
          if (newModelId) {
            setModelItemCurrent(newModelId, true);
          }
          if (oldModelId) {
            setModelItemCurrent(oldModelId, false);
          }
          break;
        default:
          break;
      }
    });
  },
});
