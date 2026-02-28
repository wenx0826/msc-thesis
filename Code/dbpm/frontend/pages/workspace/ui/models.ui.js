import { createUI } from "../../../shared/utils/ui.js";
import { modelsStore, workspaceStore } from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
import { modelsAPI } from "../../../api/index.js";
import { endpointLoader } from "../workflow/wf_endpoints/endpoint-loader.js";
import {
  createMenu,
  createTemplateElement,
} from "../../../shared/utils/dom.js";
import initInlineEditor from "../../../shared/widgets/inline-editor.js";
import { createModelActionsMenu } from "./model-actions-menu.ui.js";

const PREVIEW_THEME_PATH =
  "pages/workspace/workflow/wf_themes/preset_customized/theme.js";
const PREVIEW_IFRAME_ID = "wfPreviewRendererIframe";
let previewRenderQueue = Promise.resolve();
let previewRendererWindow = null;
let previewRendererWindowPromise = null;

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

function queuePreviewRender(task) {
  const run = previewRenderQueue.then(task);
  previewRenderQueue = run.catch(() => {});
  return run;
}

function serializeEndpointSymbols(cache) {
  const symbols = {};
  for (const [endpoint, data] of Object.entries(cache || {})) {
    if (data?.symbol) {
      symbols[endpoint] = new XMLSerializer().serializeToString(data.symbol);
    }
  }
  return symbols;
}

function collectEndpointProperties(cache) {
  const properties = {};
  for (const [endpoint, data] of Object.entries(cache || {})) {
    if (data?.properties) {
      properties[endpoint] = data.properties;
    }
  }
  return properties;
}

function ensurePreviewRendererWindow() {
  if (
    previewRendererWindow &&
    typeof previewRendererWindow.renderGraphPreview === "function"
  ) {
    return Promise.resolve(previewRendererWindow);
  }
  if (previewRendererWindowPromise) return previewRendererWindowPromise;

  previewRendererWindowPromise = new Promise((resolve, reject) => {
    const iframe = document.getElementById(PREVIEW_IFRAME_ID);
    if (!iframe) {
      reject(
        new Error(
          `Preview renderer iframe #${PREVIEW_IFRAME_ID} not found in workspace.html`,
        ),
      );
      return;
    }

    const cleanup = () => {
      iframe.removeEventListener("load", onLoad);
      iframe.removeEventListener("error", onError);
    };
    const onError = () => {
      cleanup();
      reject(new Error("Failed to initialize preview renderer iframe"));
    };
    const onLoad = () => {
      cleanup();
      const rendererWindow = iframe.contentWindow;
      if (
        !rendererWindow ||
        typeof rendererWindow.renderGraphPreview !== "function"
      ) {
        reject(new Error("Preview renderer iframe API is not available"));
        return;
      }
      previewRendererWindow = rendererWindow;
      resolve(rendererWindow);
    };

    iframe.addEventListener("load", onLoad);
    iframe.addEventListener("error", onError);

    if (
      iframe.contentWindow &&
      typeof iframe.contentWindow.renderGraphPreview === "function"
    ) {
      onLoad();
      return;
    }
    if (iframe.contentDocument?.readyState === "complete") {
      onError();
      return;
    }
  }).catch((err) => {
    previewRendererWindow = null;
    previewRendererWindowPromise = null;
    throw err;
  });

  return previewRendererWindowPromise;
}

function getDescriptionElement(modelData) {
  const parsed = $.parseXML(modelData);
  const parseError = parsed.getElementsByTagName("parsererror")[0];
  if (parseError) {
    throw new Error(parseError.textContent || "Invalid model XML");
  }
  if (parsed.documentElement?.nodeName === "description") {
    return parsed.documentElement;
  }
  const description = $("description", parsed)[0];
  if (!description) {
    throw new Error("Model XML does not contain a description element");
  }
  return description;
}

function renderDescriptionToSvg(descriptionElement) {
  return queuePreviewRender(async () => {
    const descriptionText = new XMLSerializer().serializeToString(
      descriptionElement,
    );
    const endpointSymbols = serializeEndpointSymbols(endpointLoader._cache);
    const endpointProperties = collectEndpointProperties(endpointLoader._cache);
    const previewThemeUrl = new URL(
      PREVIEW_THEME_PATH,
      document.baseURI,
    ).toString();

    const rendererWindow = await ensurePreviewRendererWindow();
    return rendererWindow.renderGraphPreview({
      themePath: previewThemeUrl,
      descriptionXml: descriptionText,
      endpointSymbols,
      endpointProperties,
    });
  });
}

async function getModelSvg(modelId) {
  await endpointLoader.init();
  const modelData = await modelsAPI.getDataByVersionId(modelId);
  const descriptionElement = getDescriptionElement(modelData);
  return renderDescriptionToSvg(descriptionElement);
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
