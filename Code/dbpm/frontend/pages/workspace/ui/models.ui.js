import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore, modelsStore } from "../store/index.js";
import { workspaceService } from "../services/index.js";
import { modelsAPI } from "../../../api/index.js";
import { endpointLoader } from "../workflow/wf_endpoints/endpoint-loader.js";
import { $cloneTemplate } from "../../../shared/utils/dom.js";

const PREVIEW_THEME_PATH =
  "pages/workspace/workflow/wf_themes/preset_customized/theme.js";
const PREVIEW_IFRAME_ID = "wfPreviewRendererIframe";
let previewRenderQueue = Promise.resolve();
let previewRendererWindow = null;
let previewRendererWindowPromise = null;

const $modelsList = $("#modelsList");
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
  const modelData = await modelsAPI.getModelDataByVersionId(modelId);
  const descriptionElement = getDescriptionElement(modelData);
  return renderDescriptionToSvg(descriptionElement);
}

async function renderModelInList(model) {
  console.log("Rendering model in list:", model);
  const modelId = model?.id;
  const gridId = `modelGrid_${modelId}`;
  const $modelContainer = $cloneTemplate("modelItemTemplate")
    .children()
    .first()
    .attr("data-model-id", modelId)
    .attr("data-document-id", model.documentId);
  const $gridDiv = $modelContainer.find("[data-ref='modelGrid']").first();
  $gridDiv.attr("id", gridId);
  $modelContainer.find("[data-ref='modelName']").first().text(model.name);
  if (modelId == workspaceStore.getDisplayedModel().id) {
    $modelContainer.addClass("active");
  }
  $modelsList.append($modelContainer);
  console.log("Received SVG for model ID", modelId);
  try {
    const outputFrame = await getModelSvg(model.latestVersionId);
    model.svg = $.parseXML(outputFrame).documentElement;
    prepareSvgForList(model.svg, modelId);
    $gridDiv.append(model.svg);
  } catch (err) {
    console.error("Error getting model SVG for model ID", modelId, ":", err);
    return;
  }
}

function updateModelInList(model) {
  const modelId = model?.meta?.id;
  var gridId = `modelGrid_${modelId}`;
  const $gridDiv = $(`#${gridId}`);
  $gridDiv.empty();

  const svgEl = $X(model.svg);
  if (!svgEl) return;
  prepareSvgForList(svgEl, modelId);
  model.svg = svgEl;

  $gridDiv.append(svgEl);
}

const highlightActiveModelContainer = (modelId) => {
  $(`.model-container[data-model-id="${modelId}"]`).addClass("active");
};

const unhighlightActiveModelContainer = (modelId) => {
  $(`.model-container[data-model-id="${modelId}"]`).removeClass("active");
};

const removeModelFromList = (modelId) => {
  $(`.model-container[data-model-id="${modelId}"]`).remove();
};

function updateModelsCount() {
  const count = Object.keys(modelsStore.state.modelsById).length;
  $("[data-ref='modelsCount']").text(count);
}

createUI({
  setup: () => {},
  bindListeners: () => {
    $modelsList.on("click.modelContainer", ".model-container", (event) => {
      event.stopPropagation();
      const element = event.currentTarget;
      const modelId = element.dataset.modelId;
      workspaceService.toggleModelDisplay({ id: modelId });
    });
  },
  subscribeStores: () => {
    workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "displayModelId":
          if (newValue) {
            highlightActiveModelContainer(newValue);
          }
          if (oldValue) {
            unhighlightActiveModelContainer(oldValue);
          }
          break;
        default:
          break;
      }
    });

    modelsStore.subscribe(async (state, { key, operation, value }) => {
      switch (operation) {
        case "init":
          for (const model of value) {
            await renderModelInList(model);
          }
          updateModelsCount();
          // value.forEach((model) => renderModelInList(model));
          break;
        case "add":
          await renderModelInList(value);
          break;
        case "update":
          updateModelInList(value);
          break;
        case "delete":
          console.log("Model deleted with ID:", value.id);
          removeModelFromList(value.id);
          break;
      }
    });
  },
});
