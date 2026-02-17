import { createUI } from "../../../shared/util/ui.js";
import { workspaceStore, modelsStore } from "../store/index.js";
import { workspaceService } from "../services/index.js";
import { modelsAPI } from "../../../api/index.js";
import { endpointLoader } from "../workflow/wf_endpoints/endpoint-loader.js";
import { $cloneTemplate } from "../../../shared/util/dom.js";

const PREVIEW_THEME_PATH =
  "pages/workspace/workflow/wf_themes/preset_customized/theme.js";
const PREVIEW_LABEL_SELECTOR = "#modelGridSmall";
const PREVIEW_CANVAS_SELECTOR = "#modelCanvasSmall";
let previewRenderQueue = Promise.resolve();

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
  if (svgW > 0 && svgH > 0 && !svgEl.getAttribute("viewBox")) {
    svgEl.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  }
  svgEl.setAttribute("width", "100%");
  svgEl.removeAttribute("height"); // let aspect ratio determine height
  svgEl.style.display = "block";

  // 2. scope ids to prevent clashes between multiple SVGs in the page
  scopeSvgIds(svgEl, `m${modelId}`);
}

function queuePreviewRender(task) {
  const run = previewRenderQueue.then(task);
  previewRenderQueue = run.catch(() => {});
  return run;
}

function clearPreviewRenderContainers() {
  const $svg = $(PREVIEW_CANVAS_SELECTOR);
  const $label = $(PREVIEW_LABEL_SELECTOR);
  if ($svg.length === 0 || $label.length === 0) return;
  $svg.empty().attr("width", "1").attr("height", "1");
  $label.children().not($svg).remove();
}

function getDescriptionElement(modelData) {
  const parsed = new DOMParser().parseFromString(modelData, "application/xml");
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
  return queuePreviewRender(
    () =>
      new Promise((resolve, reject) => {
        const $svg = $(PREVIEW_CANVAS_SELECTOR);
        const $label = $(PREVIEW_LABEL_SELECTOR);
        if ($svg.length === 0 || $label.length === 0) {
          reject(new Error("Preview render container not found"));
          return;
        }

        const previousManifestation = window.manifestation;
        const restoreState = () => {
          window.manifestation = previousManifestation;
          clearPreviewRenderContainers();
        };

        clearPreviewRenderContainers();

        try {
          new WfAdaptor(PREVIEW_THEME_PATH, function (graphrealization) {
            try {
              graphrealization.illustrator.get_symbol =
                endpointLoader._boundGetSymbol;
              graphrealization.illustrator.get_properties =
                endpointLoader._boundGetProperties;
              graphrealization.set_svg_container($svg);
              graphrealization.set_label_container($label);
              graphrealization.set_description($(descriptionElement), true);

              const svgString = new XMLSerializer().serializeToString($svg[0]);
              resolve(svgString);
            } catch (err) {
              reject(err);
            } finally {
              restoreState();
            }
          });
        } catch (err) {
          restoreState();
          reject(err);
        }
      }),
  );
}

async function getModelSvg(modelId) {
  await endpointLoader.init();
  const modelData = await modelsAPI.getModelDataById(modelId);
  const descriptionElement = getDescriptionElement(modelData);
  return renderDescriptionToSvg(descriptionElement);
}

function toSvgElement(svgValue) {
  if (!svgValue) return null;
  if (typeof svgValue === "string") {
    return new DOMParser().parseFromString(svgValue, "image/svg+xml")
      .documentElement;
  }
  if (svgValue instanceof Element) {
    return svgValue;
  }
  return null;
}

async function renderModelInList(model) {
  const modelId = model?.meta?.id;
  const gridId = `modelGrid_${modelId}`;
  const $modelsArea = $("#models");
  const $modelContainer = $cloneTemplate("modelItemTemplate")
    .children()
    .first()
    .attr("data-model-id", modelId)
    .attr("data-documentid", model.documentId);
  const $gridDiv = $modelContainer.find("[data-ref='modelGrid']").first();
  $gridDiv.attr("id", gridId);
  $modelContainer.find("[data-ref='modelName']").first().text(model.meta.name);
  if (modelId == workspaceStore.getActiveModelId()) {
    $modelContainer.addClass("active");
  }
  $modelContainer.on("click", (event) => {
    event.stopPropagation();
    workspaceService.toggleModelSelection(modelId);
  });
  $modelsArea.append($modelContainer);

  console.log("Received SVG for model ID", modelId);
  try {
    const outputFrame = await getModelSvg(modelId);

    model.svg = new DOMParser().parseFromString(
      outputFrame,
      "image/svg+xml",
    ).documentElement;

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

  const svgEl = toSvgElement(model.svg);
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
createUI({
  setup: () => {},
  bindListeners: () => {},
  subscribeStores: () => {
    workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "activeModelId":
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
