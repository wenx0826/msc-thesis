// Model Service - Handles model generation and updates
import { modelsAPI } from "../../../api/index.js";
import {
  workspaceStore,
  modelsStore,
  documentViewerStore,
  modelEditorStore,
  projectGraphStore,
} from "../store/index.js";
import workspaceService from "./workspace.service.js";
import { Constants } from "../../../constants.js";
import { endpointLoader } from "../../../modules/workflow/endpoints/endpoint-loader.js";

// Import constants
const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;
const MODEL_GENERATION_TARGET = Constants.MODEL_GENERATION_TARGET;
const EMPTY_MODEL = Constants.EMPTY_MODEL;
const PREVIEW_THEME_PATH = "modules/workflow/themes/preset_customized/theme.js";
const PREVIEW_IFRAME_ID = "wfPreviewRendererIframe";

let previewRenderQueue = Promise.resolve();
let previewRendererWindow = null;
let previewRendererWindowPromise = null;
const cachePromisesByVersionId = new Map();

function queuePreviewRender(task) {
  const run = previewRenderQueue.then(task);
  previewRenderQueue = run.catch(() => {});
  return run;
}

function scopeSvgIds(svgEl, prefix) {
  const idEls = [];
  if (svgEl.getAttribute && svgEl.getAttribute("id")) {
    idEls.push(svgEl);
  }
  svgEl.querySelectorAll("[id]").forEach((el) => idEls.push(el));

  const idMap = new Map();
  idEls.forEach((el) => {
    const oldId = el.getAttribute("id");
    if (!oldId || oldId.startsWith(`${prefix}_`)) {
      return;
    }
    const newId = `${prefix}_${oldId}`;
    idMap.set(oldId, newId);
    el.setAttribute("id", newId);
  });

  if (idMap.size === 0) return;

  const escaped = [...idMap.keys()].map((key) =>
    key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const urlRe = new RegExp(`url\\(#(${escaped.join("|")})\\)`, "g");
  const hrefRe = new RegExp(`^#(${escaped.join("|")})$`);
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
  const all = [svgEl, ...svgEl.querySelectorAll("*")];
  all.forEach((el) => {
    urlAttrs.forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value && urlRe.lastIndex !== undefined) urlRe.lastIndex = 0;
      if (value && urlRe.test(value)) {
        urlRe.lastIndex = 0;
        el.setAttribute(
          attr,
          value.replace(urlRe, (_, id) => `url(#${idMap.get(id)})`),
        );
      }
    });

    ["href", "xlink:href"].forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value && hrefRe.test(value)) {
        const oldId = value.slice(1);
        if (idMap.has(oldId)) {
          el.setAttribute(attr, `#${idMap.get(oldId)}`);
        }
      }
    });

    const inlineStyle = el.getAttribute("style");
    if (inlineStyle && urlRe.lastIndex !== undefined) urlRe.lastIndex = 0;
    if (inlineStyle && urlRe.test(inlineStyle)) {
      urlRe.lastIndex = 0;
      el.setAttribute(
        "style",
        inlineStyle.replace(urlRe, (_, id) => `url(#${idMap.get(id)})`),
      );
    }
  });

  svgEl.querySelectorAll("style").forEach((styleEl) => {
    const cssText = styleEl.textContent || "";
    if (!cssText) return;
    urlRe.lastIndex = 0;
    if (!urlRe.test(cssText)) return;
    urlRe.lastIndex = 0;
    styleEl.textContent = cssText.replace(
      urlRe,
      (_, id) => `url(#${idMap.get(id)})`,
    );
  });
}

function scopeSvgMarkupForModel(svgMarkup, modelId) {
  // Temporarily disabled: scopeSvgIds feature.
  return svgMarkup;

  // if (!svgMarkup || !modelId) {
  //   return svgMarkup;
  // }
  //
  // try {
  //   const svgDoc = $.parseXML(svgMarkup);
  //   const svgEl = svgDoc?.documentElement;
  //   if (!svgEl) {
  //     return svgMarkup;
  //   }
  //   scopeSvgIds(svgEl, `m${modelId}`);
  //   return new XMLSerializer().serializeToString(svgEl);
  // } catch (error) {
  //   console.error("Failed to scope SVG markup:", error);
  //   return svgMarkup;
  // }
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

async function renderModelSvg(modelXml) {
  if (!modelXml || typeof modelXml !== "string") {
    throw new Error("renderModelSvg requires model XML string");
  }

  await endpointLoader.init();
  const endpointSymbols = serializeEndpointSymbols(endpointLoader._cache);
  const endpointProperties = collectEndpointProperties(endpointLoader._cache);

  return queuePreviewRender(async () => {
    const previewThemeUrl = new URL(
      PREVIEW_THEME_PATH,
      document.baseURI,
    ).toString();
    const rendererWindow = await ensurePreviewRendererWindow();
    return rendererWindow.renderGraphPreview({
      themePath: previewThemeUrl,
      descriptionXml: modelXml,
      endpointSymbols,
      endpointProperties,
    });
  });
}

async function cacheVersionWithRenderedSvg({ versionId, modelId, dataXml }) {
  modelsStore.addCachedVersion(versionId, {
    modelId,
    dataXml,
    svg: null,
    status: "loading",
    error: null,
  });

  try {
    const renderedSvg = await renderModelSvg(dataXml);
    const svg = scopeSvgMarkupForModel(renderedSvg, modelId);
    return modelsStore.addCachedVersion(versionId, {
      modelId,
      dataXml,
      svg,
      status: "ready",
      error: null,
    });
  } catch (error) {
    modelsStore.addCachedVersion(versionId, {
      modelId,
      dataXml,
      svg: null,
      status: "error",
      error: error?.message || String(error),
    });
    throw error;
  }
}

export default {
  async ensureVersionCached(
    versionId,
    { needData = true, needSvg = false, modelId = null, force = false } = {},
  ) {
    if (!versionId) {
      return null;
    }

    const current = modelsStore.getCachedModelByVersionId(versionId) || {};
    const hasData =
      typeof current.dataXml === "string" && current.dataXml.length > 0;
    const hasSvg = typeof current.svg === "string" && current.svg.length > 0;
    const effectiveModelId = modelId || current.modelId || null;

    // Temporarily disabled: scopeSvgIds feature.
    // if (!force && needSvg && hasSvg && effectiveModelId) {
    //   const scopedSvg = scopeSvgMarkupForModel(current.svg, effectiveModelId);
    //   if (scopedSvg && scopedSvg !== current.svg) {
    //     modelsStore.addCachedVersion(versionId, {
    //       modelId: effectiveModelId,
    //       svg: scopedSvg,
    //     });
    //   }
    // }

    if (!force && (!needData || hasData) && (!needSvg || hasSvg)) {
      return modelsStore.addCachedVersion(versionId, {
        ...(effectiveModelId ? { modelId: effectiveModelId } : {}),
      });
    }

    const inflight = cachePromisesByVersionId.get(versionId);
    if (inflight) {
      return inflight;
    }

    const task = (async () => {
      try {
        let cacheEntry = modelsStore.addCachedVersion(versionId, {
          ...(modelId ? { modelId } : {}),
          status: "loading",
          error: null,
        });

        if (needData && (force || !cacheEntry.dataXml)) {
          const dataXml = await modelsAPI.getDataByVersionId(versionId);
          cacheEntry = modelsStore.addCachedVersion(versionId, {
            dataXml,
          });
        }

        if (needSvg && (force || !cacheEntry.svg)) {
          const dataXml = cacheEntry.dataXml;
          if (!dataXml) {
            throw new Error(
              `Missing dataXml for version ${versionId} while generating SVG`,
            );
          }
          const renderedSvg = await renderModelSvg(dataXml);
          const scopedModelId = modelId || cacheEntry.modelId || null;
          const svg = scopeSvgMarkupForModel(renderedSvg, scopedModelId);
          cacheEntry = modelsStore.addCachedVersion(versionId, { svg });
        }

        return modelsStore.addCachedVersion(versionId, {
          status: "ready",
          error: null,
        });
      } catch (error) {
        modelsStore.addCachedVersion(versionId, {
          status: "error",
          error: error?.message || String(error),
        });
        throw error;
      } finally {
        cachePromisesByVersionId.delete(versionId);
      }
    })();

    cachePromisesByVersionId.set(versionId, task);
    return task;
  },
  async generateModel(userInput, rpstXml) {
    const llm = workspaceStore.getLlmModel();
    try {
      const generatedModel = await modelsAPI.generateModel({
        userInput,
        rpstXml,
        llm,
      });
      return generatedModel;
    } catch (error) {
      console.error("Error generating model:", error);
      return;
    }
  },

  async generateModelByPrompt(userInput) {
    const model = { ...modelEditorStore.getModel() };
    model.updateType = MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT;
    const rpstXml = modelEditorStore.getSerializedRpstData();
    console.log("Current RPST XML:", rpstXml);

    if (rpstXml) {
      const generatedModel = await this.generateModel(userInput, rpstXml);

      const data = model.data;
      const doc = data.ownerDocument;

      const dbpmInfo = doc.getElementsByTagNameNS(
        "https://example.com/dbpm",
        "info",
      )[0];
      if (dbpmInfo) {
        const newTag = doc.createElementNS(
          "https://example.com/dbpm",
          "dbpm:prompt",
        );
        newTag.textContent = userInput;
        dbpmInfo.appendChild(newTag);
      } else {
        console.warn("No dbpm:info found in model data.");
      }

      let currentRpst = $("description", data)[0];
      const generatedModelDoc = new DOMParser().parseFromString(
        generatedModel,
        "application/xml",
      );
      currentRpst.parentNode.replaceChild(
        doc.importNode(generatedModelDoc.documentElement, true),
        currentRpst,
      );
      model.data = $(doc.documentElement).serializePrettyXML();
      console.log("=======Updated model data:=====", model.data);
    }

    modelEditorStore.setModel(model);
    modelsAPI.logs.createLogEntry({
      event: "model_regenerated_by_prompt",
      data: { modelId: model.id },
    });
  },

  async generateModelBySelections(target) {
    const selectedText = documentViewerStore.getSelectedText();
    const generatedModel = await this.generateModel(selectedText, EMPTY_MODEL);
    if (!generatedModel) {
      console.warn("Model generation returned an empty result.");
      return null;
    }

    const normalizedTarget =
      target === MODEL_GENERATION_TARGET.EDITING_MODEL
        ? MODEL_GENERATION_TARGET.EDITING_MODEL
        : MODEL_GENERATION_TARGET.NEW_MODEL;

    if (normalizedTarget === MODEL_GENERATION_TARGET.NEW_MODEL) {
      return this.createModelAndTrace(generatedModel);
    }

    const currentModel = modelEditorStore.getModel();
    if (!currentModel) {
      console.warn(
        "No active editing model found for regeneration; creating a new model instead.",
      );
      return this.createModelAndTrace(generatedModel);
    }

    const model = { ...currentModel };
    model.updateType = MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS;
    model.data = generatedModel;
    modelEditorStore.setModel(model);
    return model;
  },

  injectDbpmData(xmlString, eleDbpmInfo) {
    const parser = new DOMParser();
    const data = parser.parseFromString(xmlString, "application/xml");

    const parseError = data.getElementsByTagName("parsererror")[0];
    if (parseError) {
      throw new Error("Invalid XML: " + parseError.textContent);
    }

    const newDoc = document.implementation.createDocument(
      "",
      "description",
      null,
    );
    const root = newDoc.documentElement;

    const importedDbpmInfo = newDoc.importNode(
      eleDbpmInfo.documentElement,
      true,
    );
    root.appendChild(importedDbpmInfo);

    const importedOriginal = newDoc.importNode(data.documentElement, true);
    root.appendChild(importedOriginal);
    return $(root).serializePrettyXML();
  },

  updateDbpmTextSelections(modelData, selectedText) {
    const parser = new DOMParser();
    const data = parser.parseFromString(modelData, "application/xml");

    const dbpmInfo = $("dbpm\\:info", data)[0];
    if (!dbpmInfo) {
      console.warn("No dbpm:info found in model data.");
    }
    const documentInfo = $("dbpm\\:document_info", dbpmInfo)[0];
    if (!documentInfo) {
      console.warn("No dbpm:document_info found in model data.");
    }
    let textSelections = $("dbpm\\:text_selections", documentInfo)[0];
    if (!textSelections) {
      textSelections = data.createElementNS(
        "https://example.com/dbpm",
        "dbpm:text_selections",
      );
      documentInfo.appendChild(textSelections);
    }
    textSelections.textContent = selectedText;
    return $(data.documentElement).serializePrettyXML();
  },

  async createModelAndTrace(modelData) {
    const { id: documentId, versionId: documentVersionId } =
      workspaceStore.getViewedDocument() || {};

    const trace = {
      documentVersionId,
      selections: documentViewerStore.getSerializedTemporarySelections(),
    };
    const { modelMeta: createdModelMeta, trace: createdTrace } =
      await modelsAPI.createModelAndTrace({
        projectId: workspaceStore.getProjectId(),
        modelData,
        trace,
      });

    modelsStore.add(createdModelMeta);
    modelEditorStore.setModel({
      ...createdModelMeta,
      data: modelData,
    });
    workspaceStore.setEditingModel({
      id: createdModelMeta.id,
      versionId: createdModelMeta.latestVersionId,
    });
    modelEditorStore.setData(modelData);
    modelsStore.addCachedVersion(createdModelMeta.latestVersionId, {
      modelId: createdModelMeta.id,
      dataXml: modelData,
      status: "ready",
    });
    documentViewerStore.setTemporarySelections([]);
    documentViewerStore.setHasSelectionChanged(false);
    documentViewerStore.addTrace(createdTrace);
    projectGraphStore.addModelNodeAndEdge(createdModelMeta);
    // return { modelMeta: createdModelMeta, trace: normalizedTrace };
  },
  async renameModel(modelId, newName) {
    console.log(`Renaming model ${modelId} to "${newName}"`);
    const updatedModel = await modelsAPI.updateMeta(modelId, { name: newName });
    modelsStore.update(modelId, { name: updatedModel.name });
  },
  async deleteModel(modelId) {
    if (!modelId) {
      return;
    }
    await modelsAPI.deleteModelById(modelId);
    const isEditingModel = modelId === workspaceStore.getEditingModelId();

    modelsStore.delete(modelId);
    documentViewerStore.removeTracesByModelId(modelId);
    projectGraphStore.removeModelNodeAndEdge(modelId);
    workspaceStore.setModelPopoverParams(null);

    if (isEditingModel) {
      workspaceService.clearModelDisplay();
    }
  },
  async createModelVersion(modelId, sourceVersionId) {
    const sourceVersion = modelsStore.getVersion(modelId, sourceVersionId);
    const isSelectedVersionLatest = modelsStore.isLatestVersion(
      modelId,
      sourceVersionId,
    );
    const reason = isSelectedVersionLatest ? "new_version" : "revert";
    const sourceVersionLabel =
      sourceVersion?.name ||
      (typeof sourceVersion?.versionNumber === "number"
        ? `v${sourceVersion.versionNumber}`
        : String(sourceVersionId));

    const result = await modelsAPI.createVersion({
      modelId,
      sourceVersionId,
      reason,
    });
    const modelMeta = result?.modelMeta || null;
    const createdVersion =
      result?.newVersion || result?.version || (result?.id ? result : null);

    if (modelMeta && modelMeta.id === modelId) {
      modelsStore.update(modelId, modelMeta);
    } else if (createdVersion?.id) {
      modelsStore.addVersion(modelId, createdVersion);
    }

    const createdVersionId =
      modelMeta?.latestVersionId ||
      createdVersion?.id ||
      result?.latestVersionId;
    if (!createdVersionId) {
      throw new Error("Failed to resolve created model version");
    }

    workspaceStore.setEditingModel({
      id: modelId,
      versionId: createdVersionId,
    });
    await this.loadVersion(createdVersionId);

    return {
      ...(result || {}),
      meta: {
        ...(result?.meta || {}),
        reason,
        isSelectedVersionLatest,
        sourceVersionId,
        sourceVersionLabel,
      },
    };
  },
  async loadVersion(versionId) {
    const { id: modelId } = workspaceStore.getEditingModel() || {};
    const cached = await this.ensureVersionCached(versionId, {
      needData: true,
      needSvg: false,
      modelId,
    });
    if (!cached?.dataXml) {
      throw new Error(
        `Failed to resolve cached model XML for version ${versionId}`,
      );
    }

    console.log(
      "Loaded model data for versionId",
      versionId,
      "(service cache)",
    );
    modelEditorStore.setData(cached.dataXml);
  },
  async updateEditingVersion(type) {
    const { id: modelId, versionId: modelVersionId } =
      workspaceStore.getEditingModel();

    if (type === MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS) {
      const selectedText = documentViewerStore.getSelectedText();
      modelEditorStore.updateModelDbpmTextSelections(selectedText);
    }
    const modelData = modelEditorStore.getSerializedData();

    const trace =
      type === MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS ||
      type === MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS
        ? documentViewerStore.getSerializedNewActiveModelTrace()
        : null;
    await modelsAPI.updateVersion(modelVersionId, {
      modelData,
      trace,
      type,
    });

    try {
      await cacheVersionWithRenderedSvg({
        versionId: modelVersionId,
        modelId,
        dataXml: modelData,
      });
    } catch (error) {
      console.error(
        `Failed to regenerate SVG cache for model version ${modelVersionId}:`,
        error,
      );
    }

    if (
      [
        MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
        MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
      ].includes(type)
    ) {
      documentViewerStore.setTemporarySelections([]);
      documentViewerStore.updateTrace(trace);
    }
  },

  async updateActiveModelTrace() {
    const updatedTrace = documentViewerStore.getSerializedActiveModelTrace();
    modelsAPI.traces
      .updateTrace(updatedTrace)
      .then(() => documentViewerStore.updateTrace(updatedTrace));
  },
};
