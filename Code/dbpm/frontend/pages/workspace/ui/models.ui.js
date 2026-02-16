import { workspaceStore, modelsStore } from "../store/index.js";
import { workspaceService } from "../services/index.js";

let seq = 0;
const pending = new Map();

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

function waitForIframe() {
  return new Promise((resolve) => {
    const iframe = document.getElementById("wfRendererFrame");
    if (
      iframe.contentDocument &&
      iframe.contentDocument.readyState === "complete"
    ) {
      resolve();
    } else {
      iframe.addEventListener("load", () => {
        resolve();
      });
    }
  });
}

function getModelSvg(input) {
  return new Promise(async (resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    $("#wfRendererFrame")[0].contentWindow.postMessage(
      { id, input, source: "getModelSvg" },
      window.origin,
    );
  });
}

async function renderModelInList(model) {
  const modelId = model?.meta?.id;
  var gridId = `modelGrid_${modelId}`;
  const $modelsArea = $("#models");
  const $modelContainer = $("<div>")
    .addClass("model-container")
    .attr("data-model-id", modelId)
    .attr("data-documentid", model.documentId);
  if (modelId == workspaceStore.getActiveModelId()) {
    $modelContainer.addClass("active");
  }
  $modelContainer.text(`${model.meta.name}`);
  $modelsArea.append($modelContainer);
  const $gridDiv = $("<div>").attr("id", gridId);
  $modelContainer.on("click", (event) => {
    event.stopPropagation();
    workspaceService.toggleModelSelection(modelId);
  });
  $modelContainer.append($gridDiv);
  console.log("Received SVG for model ID", modelId);
  try {
    console.log("Received SVG for model ID", modelId);
    const outputFrame = await getModelSvg({ id: modelId });

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

  if (model.svg) {
    prepareSvgForList(model.svg, modelId);
  }

  $gridDiv.append(model.svg);
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

function bindListeners() {
  window.addEventListener("message", (e) => {
    const { id, ok, result, error } = e.data || {};
    if (!pending.has(id)) return;
    const { resolve, reject } = pending.get(id);
    pending.delete(id);
    ok ? resolve(result) : reject(new Error(error));
  });
}

function subscribeStores() {
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
        await waitForIframe();
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
}

function init() {
  subscribeStores();
  bindListeners();
}
init();
