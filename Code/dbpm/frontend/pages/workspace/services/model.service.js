// Model Service - Handles model generation and updates
import { modelsAPI, tracesAPI } from "../../../api/index.js";
import {
  workspaceStore,
  modelsStore,
  documentsStore,
  documentViewerStore,
  modelEditorStore,
  projectGraphStore,
} from "../store/index.js";
import workspaceService from "./workspace.service.js";
import { Constants } from "../../../constants.js";
import { endpointLoader } from "../../../modules/workflow/endpoints/endpoint-loader.js";
import {
  injectDbpmData,
  updateDbpmTextSelections,
} from "../../../modules/workflow/utils/dbpm-model-xml.js";

// Import constants
const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;
const MODEL_GENERATION_TARGET = Constants.MODEL_GENERATION_TARGET;
const EMPTY_MODEL = Constants.EMPTY_MODEL;
const PREVIEW_THEME_PATH = "modules/workflow/themes/preset_customized/theme.js";
const PREVIEW_IFRAME_ID = "wfPreviewRendererIframe";
const CPEE_DESCRIPTION_NS = "http://cpee.org/ns/description/1.0";
const DBPM_NS = "https://example.com/dbpm";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

let previewRenderQueue = Promise.resolve();
let previewRendererWindow = null;
let previewRendererWindowPromise = null;
const cachePromisesByVersionId = new Map();
let lastNoSelectionLoadAlert = {
  versionId: null,
  at: 0,
};

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

function selectionsToText(selections) {
  if (!Array.isArray(selections)) {
    return "";
  }
  return selections
    .map((selection) =>
      typeof selection?.text === "string" ? selection.text.trim() : "",
    )
    .filter(Boolean)
    .join(" ");
}

function parseXmlDocument(xmlString) {
  if (typeof xmlString !== "string" || !xmlString.trim()) {
    return null;
  }
  const parsed = new DOMParser().parseFromString(xmlString, "application/xml");
  if (parsed.getElementsByTagName("parsererror")[0]) {
    return null;
  }
  return parsed;
}

function ensureDescriptionNamespace(node) {
  if (!node || node.localName !== "description") {
    return;
  }
  if (!node.namespaceURI && !node.getAttribute("xmlns")) {
    node.setAttributeNS(XMLNS_NS, "xmlns", CPEE_DESCRIPTION_NS);
  }
}

function getDirectDescriptionChildren(node) {
  return Array.from(node?.children || []).filter(
    (child) => child.localName === "description",
  );
}

function resolveGeneratedProcessDescription(generatedRoot) {
  if (!generatedRoot) {
    return null;
  }

  if (
    generatedRoot.localName === "description" &&
    generatedRoot.namespaceURI === CPEE_DESCRIPTION_NS
  ) {
    return generatedRoot;
  }

  if (
    generatedRoot.localName === "description" &&
    generatedRoot.namespaceURI !== CPEE_DESCRIPTION_NS
  ) {
    const directDescriptions = getDirectDescriptionChildren(generatedRoot);
    if (directDescriptions.length > 0) {
      const directProcessDescription =
        directDescriptions.find(
          (node) => node.namespaceURI === CPEE_DESCRIPTION_NS,
        ) ||
        directDescriptions.find((node) => node.namespaceURI !== DBPM_NS) ||
        directDescriptions[0];
      ensureDescriptionNamespace(directProcessDescription);
      return directProcessDescription;
    }
  }

  const cpeeDescription = generatedRoot.getElementsByTagNameNS(
    CPEE_DESCRIPTION_NS,
    "description",
  )[0];
  if (cpeeDescription) {
    return cpeeDescription;
  }

  if (
    generatedRoot.localName === "description" &&
    generatedRoot.namespaceURI !== DBPM_NS
  ) {
    ensureDescriptionNamespace(generatedRoot);
    return generatedRoot;
  }

  const wrappedDoc = document.implementation.createDocument(
    CPEE_DESCRIPTION_NS,
    "description",
    null,
  );
  wrappedDoc.documentElement.appendChild(
    wrappedDoc.importNode(generatedRoot, true),
  );
  return wrappedDoc.documentElement;
}

function findProcessDescriptionInWrapper(wrapperRoot) {
  if (!wrapperRoot) {
    return null;
  }

  const directChildren = Array.from(wrapperRoot.children || []);
  const namespaced = directChildren.find(
    (node) =>
      node.localName === "description" &&
      node.namespaceURI === CPEE_DESCRIPTION_NS,
  );
  if (namespaced) {
    return namespaced;
  }

  return (
    directChildren.find(
      (node) => node.localName === "description" && node.namespaceURI !== DBPM_NS,
    ) || null
  );
}

function composeRegeneratedModelData({
  currentModelData,
  generatedModelData,
}) {
  const generatedDoc = parseXmlDocument(generatedModelData);
  if (!generatedDoc?.documentElement) {
    return generatedModelData;
  }
  const generatedDescription = resolveGeneratedProcessDescription(
    generatedDoc.documentElement,
  );
  if (!generatedDescription) {
    return generatedModelData;
  }

  const currentDoc = parseXmlDocument(currentModelData);
  const currentRoot = currentDoc?.documentElement;
  const isCurrentWrappedRoot =
    currentRoot?.localName === "description" &&
    currentRoot?.namespaceURI !== CPEE_DESCRIPTION_NS;

  if (!isCurrentWrappedRoot) {
    const standaloneDoc = document.implementation.createDocument(
      null,
      "description",
      null,
    );
    standaloneDoc.documentElement.setAttributeNS(XMLNS_NS, "xmlns:dbpm", DBPM_NS);
    const imported = standaloneDoc.importNode(generatedDescription, true);
    ensureDescriptionNamespace(imported);
    standaloneDoc.documentElement.appendChild(imported);
    return $(standaloneDoc.documentElement).serializePrettyXML();
  }

  const imported = currentDoc.importNode(generatedDescription, true);
  ensureDescriptionNamespace(imported);
  const existingDescription = findProcessDescriptionInWrapper(currentRoot);
  if (existingDescription) {
    currentRoot.replaceChild(imported, existingDescription);
  } else {
    currentRoot.appendChild(imported);
  }
  return $(currentRoot).serializePrettyXML();
}

function normalizeSelectionRange(range) {
  if (range === undefined || range === null) {
    return null;
  }
  if (typeof range === "string") {
    return range;
  }
  try {
    return JSON.stringify(range);
  } catch (error) {
    return String(range);
  }
}

function buildSelectionsSignature(selections, mapper) {
  const normalizedSelections = Array.isArray(selections) ? selections : [];
  return JSON.stringify(normalizedSelections.map(mapper));
}

function classifyTraceSelectionChange({ previousSelections, currentSelections }) {
  const previousTextSignature = buildSelectionsSignature(
    previousSelections,
    (selection) => ({
      id:
        selection?.id === undefined || selection?.id === null
          ? null
          : String(selection.id),
      range: normalizeSelectionRange(selection?.range),
      text: typeof selection?.text === "string" ? selection.text : "",
    }),
  );
  const currentTextSignature = buildSelectionsSignature(
    currentSelections,
    (selection) => ({
      id:
        selection?.id === undefined || selection?.id === null
          ? null
          : String(selection.id),
      range: normalizeSelectionRange(selection?.range),
      text: typeof selection?.text === "string" ? selection.text : "",
    }),
  );
  if (previousTextSignature !== currentTextSignature) {
    return "text_changed";
  }

  const previousColorSignature = buildSelectionsSignature(
    previousSelections,
    (selection) => ({
      id:
        selection?.id === undefined || selection?.id === null
          ? null
          : String(selection.id),
      color: typeof selection?.color === "string" ? selection.color : "",
    }),
  );
  const currentColorSignature = buildSelectionsSignature(
    currentSelections,
    (selection) => ({
      id:
        selection?.id === undefined || selection?.id === null
          ? null
          : String(selection.id),
      color: typeof selection?.color === "string" ? selection.color : "",
    }),
  );
  if (previousColorSignature !== currentColorSignature) {
    return "color_only";
  }

  return "no_change";
}

function getTraceUpdatePayload(serializedTrace) {
  const payload = {
    selections: Array.isArray(serializedTrace?.selections)
      ? serializedTrace.selections
      : [],
  };
  if (typeof serializedTrace?.id === "string") {
    payload.id = serializedTrace.id;
  }
  if (typeof serializedTrace?.documentVersionId === "string") {
    payload.documentVersionId = serializedTrace.documentVersionId;
  }
  if (typeof serializedTrace?.modelVersionId === "string") {
    payload.modelVersionId = serializedTrace.modelVersionId;
  }
  return payload;
}

function notifyTraceUpdateTriggered({
  source,
  traceId = null,
  modelVersionId = null,
  changeType = null,
  selectionCount = null,
}) {
  const detail = {
    source,
    traceId,
    modelVersionId,
    changeType,
    selectionCount,
    triggeredAt: new Date().toISOString(),
  };
  console.log("[DBPM] Trace update triggered", detail);

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent("dbpm:trace-update-triggered", {
        detail,
      }),
    );
  }
}

function resolveTraceDocumentMeta(trace = {}) {
  const viewedDocument = workspaceStore.getViewedDocument() || {};
  const modelId =
    (typeof trace?.modelId === "string" && trace.modelId) ||
    workspaceStore.getEditingModelId() ||
    null;
  const documentIdCandidate =
    (typeof trace?.documentId === "string" && trace.documentId) ||
    (modelId ? modelsStore.getModelDocumentId(modelId) : null) ||
    viewedDocument.id;
  const documentVersionIdCandidate =
    (typeof trace?.documentVersionId === "string" && trace.documentVersionId) ||
    viewedDocument.versionId;
  const documentId =
    typeof documentIdCandidate === "string" && documentIdCandidate
      ? documentIdCandidate
      : null;
  const documentVersionId =
    typeof documentVersionIdCandidate === "string" && documentVersionIdCandidate
      ? documentVersionIdCandidate
      : null;
  const documentVersionName =
    documentId && documentVersionId
      ? documentsStore.getVersion(documentId, documentVersionId)?.name || ""
      : null;

  const meta = {};
  if (documentId) {
    meta.documentId = documentId;
  }
  if (documentVersionId) {
    meta.documentVersionId = documentVersionId;
  }
  if (typeof documentVersionName === "string") {
    meta.documentVersionName = documentVersionName;
  }
  return meta;
}

function alertNoSelectionsIfNeeded(selectionCount, source) {
  if (selectionCount !== 0) {
    return;
  }
  const message =
    "There is no selected text related with this model.";
  console.warn(`[DBPM] ${message}`, { source });
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    // Defer blocking alert so UI can paint selection removal first.
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        setTimeout(() => window.alert(message), 0);
      });
    } else {
      setTimeout(() => window.alert(message), 0);
    }
  }
}

function alertNoSelectionsOnModelVersionLoadIfNeeded(source) {
  const { id: editingModelId, versionId: modelVersionId } =
    workspaceStore.getEditingModel() || {};
  if (!editingModelId || !modelVersionId) {
    return;
  }

  const modelDocumentId = modelsStore.getModelDocumentId(editingModelId);
  const viewedDocumentId = workspaceStore.getViewedDocumentId();
  if (
    modelDocumentId &&
    viewedDocumentId &&
    String(modelDocumentId) !== String(viewedDocumentId)
  ) {
    return;
  }

  const trace = (documentViewerStore.getTraces() || []).find(
    (item) => String(item?.modelVersionId || "") === String(modelVersionId),
  );
  if (!trace) {
    return;
  }
  const selectionCount = Array.isArray(trace?.selections)
    ? trace.selections.length
    : 0;
  if (selectionCount > 0) {
    return;
  }

  const now = Date.now();
  const currentVersionId = String(modelVersionId);
  if (
    lastNoSelectionLoadAlert.versionId === currentVersionId &&
    now - lastNoSelectionLoadAlert.at < 1200
  ) {
    return;
  }
  lastNoSelectionLoadAlert = {
    versionId: currentVersionId,
    at: now,
  };

  const message =
    "No selected text is related with this model. Please make sure it is linked properly with the document.";
  console.warn(`[DBPM] ${message}`, {
    source,
    modelVersionId: currentVersionId,
    traceId: trace?.id || null,
  });
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    setTimeout(() => window.alert(message), 0);
  }
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

async function updateModelVersionAndCache({
  modelId,
  modelVersionId,
  modelData,
  trace,
  type,
}) {
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
    const { id: editingModelId, versionId: editingModelVersionId } =
      workspaceStore.getEditingModel() || {};
    if (!editingModelId || !editingModelVersionId) {
      console.warn(
        "No active editing model found for prompt regeneration; aborting.",
      );
      return null;
    }

    const rpstXml = modelEditorStore.getSerializedRpstData();
    if (!rpstXml) {
      console.warn("Failed to resolve current model XML for prompt regeneration.");
      return null;
    }

    const generatedModel = await this.generateModel(userInput, rpstXml);
    if (!generatedModel) {
      console.warn("Model generation returned an empty result.");
      return null;
    }

    const previousModelData = modelEditorStore.getSerializedData();
    if (!previousModelData) {
      console.warn("No current model data found for prompt regeneration preview.");
      return null;
    }

    const regeneratedModelData = composeRegeneratedModelData({
      currentModelData: previousModelData,
      generatedModelData: generatedModel,
    });

    modelEditorStore.setData(regeneratedModelData, {
      updateType: MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT,
    });

    modelsAPI.logs.createLogEntry({
      event: "model_regenerated_by_prompt",
      data: { modelId: editingModelId },
    });

    return {
      id: editingModelId,
      versionId: editingModelVersionId,
      data: generatedModel,
    };
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

    const { id: editingModelId, versionId: editingModelVersionId } =
      workspaceStore.getEditingModel() || {};
    if (!editingModelId || !editingModelVersionId) {
      console.warn(
        "No active editing model/version found for regeneration; creating a new model instead.",
      );
      return this.createModelAndTrace(generatedModel);
    }

    const previousModelData = modelEditorStore.getSerializedData();
    if (!previousModelData) {
      console.warn("No current model data found for regeneration preview.");
      return null;
    }

    const regeneratedModelData = composeRegeneratedModelData({
      currentModelData: previousModelData,
      generatedModelData: generatedModel,
    });

    modelEditorStore.setData(regeneratedModelData, {
      updateType: MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
    });

    return {
      id: editingModelId,
      versionId: editingModelVersionId,
      data: generatedModel,
    };
  },

  async createModelAndTrace(modelData) {
    const { id: documentId, versionId: documentVersionId } =
      workspaceStore.getViewedDocument() || {};
    const selections = documentViewerStore.getSerializedTemporarySelections();
    const documentVersionName =
      documentId && documentVersionId
        ? documentsStore.getVersion(documentId, documentVersionId)?.name || ""
        : "";
    const preparedModelData = injectDbpmData(modelData, {
      documentId: documentId || "",
      documentVersionId,
      documentVersionName,
      selectedText: selectionsToText(selections),
    });

    console.log(
      "Prepared model data with injected DBPM info:",
      preparedModelData,
    );
    const trace = {
      documentVersionId,
      selections,
    };
    const { modelMeta: createdModelMeta, trace: createdTrace } =
      await modelsAPI.createModelAndTrace({
        projectId: workspaceStore.getProjectId(),
        modelData: preparedModelData,
        trace,
      });

    modelsStore.add(createdModelMeta);
    workspaceStore.setEditingModel({
      id: createdModelMeta.id,
      versionId: createdModelMeta.latestVersionId,
    });
    modelEditorStore.setData(preparedModelData, {
      updateType: null,
    });
    modelsStore.addCachedVersion(createdModelMeta.latestVersionId, {
      modelId: createdModelMeta.id,
      dataXml: preparedModelData,
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
    modelEditorStore.setData(cached.dataXml, {
      updateType: null,
    });
    alertNoSelectionsOnModelVersionLoadIfNeeded("load_model_version");
  },
  maybeAlertNoSelectionOnLoadedEditingModel(source = "manual_check") {
    alertNoSelectionsOnModelVersionLoadIfNeeded(source);
  },
  async updateSubprocessLink(taskId, subprocessModelId) {
    const { id: modelId, versionId: modelVersionId } =
      workspaceStore.getEditingModel() || {};
    if (!modelVersionId || !taskId || !modelId) {
      return;
    }

    const normalizedSubprocessModelId =
      typeof subprocessModelId === "string" && subprocessModelId.trim().length > 0
        ? subprocessModelId.trim()
        : null;

    await modelsAPI.updateSubprocessLink(
      modelVersionId,
      taskId,
      normalizedSubprocessModelId,
    );

    if (!modelsStore.isLatestVersion(modelId, modelVersionId)) {
      return;
    }

    if (normalizedSubprocessModelId) {
      projectGraphStore.upsertSubprocessEdge({
        modelId,
        subprocessModelId: normalizedSubprocessModelId,
        taskId,
      });
      return;
    }
    projectGraphStore.removeSubprocessEdge(modelId, taskId);
  },
  async updateEditingVersion(type) {
    const { id: modelId, versionId: modelVersionId } =
      workspaceStore.getEditingModel();

    const trace =
      type === MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS ||
      type === MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS
        ? documentViewerStore.getSerializedNewActiveModelTrace()
        : null;

    if (type === MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS) {
      const selectedText = selectionsToText(trace?.selections || []);
      const documentMeta = resolveTraceDocumentMeta(trace || {});
      modelEditorStore.updateModelDbpmTextSelections(selectedText, documentMeta);
    }
    const modelData = modelEditorStore.getSerializedData();

    if (trace?.id) {
      notifyTraceUpdateTriggered({
        source: "updateEditingVersion",
        traceId: trace.id,
        modelVersionId,
        changeType: type,
        selectionCount: Array.isArray(trace.selections)
          ? trace.selections.length
          : 0,
      });
    }
    await updateModelVersionAndCache({
      modelId,
      modelVersionId,
      modelData,
      trace,
      type,
    });

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

  async updateTraceById(traceId) {
    if (!traceId) {
      return;
    }

    const serializedTrace = documentViewerStore.getSerializedTraceById(traceId);
    if (!serializedTrace?.id) {
      return;
    }

    try {
      notifyTraceUpdateTriggered({
        source: "updateTraceById",
        traceId: serializedTrace.id,
        modelVersionId: serializedTrace.modelVersionId || null,
        changeType: "trace_update",
        selectionCount: Array.isArray(serializedTrace.selections)
          ? serializedTrace.selections.length
          : 0,
      });
      await tracesAPI.updateTrace(getTraceUpdatePayload(serializedTrace));
      const activeTrace = documentViewerStore.getDisplayedModelTrace();
      if (activeTrace && String(activeTrace.id) === String(traceId)) {
        documentViewerStore.syncOriginalActiveModelSerializedSelectionsWithActiveTrace();
      }
    } catch (error) {
      console.error(`Failed to update trace ${traceId}:`, error);
    }
  },

  async updateTraceTextById(traceId, options = {}) {
    const { alertOnEmptyAfterDeletion = false } = options;
    if (!traceId) {
      return;
    }

    const serializedTrace = documentViewerStore.getSerializedTraceById(traceId);
    if (!serializedTrace?.id) {
      return;
    }

    const modelVersionId = serializedTrace.modelVersionId;
    if (!modelVersionId) {
      await this.updateTraceById(traceId);
      return;
    }

    try {
      const currentModelData = await modelsAPI.getDataByVersionId(modelVersionId);
      const updatedModelData = updateDbpmTextSelections(
        currentModelData,
        selectionsToText(serializedTrace.selections),
        resolveTraceDocumentMeta(serializedTrace),
      );
      if (alertOnEmptyAfterDeletion) {
        alertNoSelectionsIfNeeded(
          Array.isArray(serializedTrace.selections)
            ? serializedTrace.selections.length
            : 0,
          "updateTraceTextById",
        );
      }
      notifyTraceUpdateTriggered({
        source: "updateTraceTextById",
        traceId: serializedTrace.id,
        modelVersionId,
        changeType: MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
        selectionCount: Array.isArray(serializedTrace.selections)
          ? serializedTrace.selections.length
          : 0,
      });
      await modelsAPI.updateVersion(modelVersionId, {
        modelData: updatedModelData,
        trace: serializedTrace,
        type: MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
      });

      modelsStore.addCachedVersion(modelVersionId, {
        ...(serializedTrace.modelId ? { modelId: serializedTrace.modelId } : {}),
        dataXml: updatedModelData,
        status: "ready",
        error: null,
      });

      const editingModelVersionId = workspaceStore.getEditingModel()?.versionId;
      if (
        editingModelVersionId &&
        String(editingModelVersionId) === String(modelVersionId)
      ) {
        modelEditorStore.setData(updatedModelData, {
          updateType: null,
        });
      }

      const activeTrace = documentViewerStore.getDisplayedModelTrace();
      if (activeTrace && String(activeTrace.id) === String(traceId)) {
        documentViewerStore.syncOriginalActiveModelSerializedSelectionsWithActiveTrace();
      }
    } catch (error) {
      console.error(`Failed to update trace text for trace ${traceId}:`, error);
    }
  },

  async updateActiveModelTrace(options = {}) {
    const { alertOnEmptyAfterDeletion = false } = options;
    const updatedTrace = documentViewerStore.getSerializedActiveModelTrace();
    if (!updatedTrace?.id) {
      return;
    }

    const previousSelections =
      documentViewerStore.getOriginalActiveModelSerializedSelections();
    const currentSelections = Array.isArray(updatedTrace.selections)
      ? updatedTrace.selections
      : [];
    const changeType = classifyTraceSelectionChange({
      previousSelections,
      currentSelections,
    });
    if (changeType === "no_change") {
      return;
    }

    try {
      notifyTraceUpdateTriggered({
        source: "updateActiveModelTrace",
        traceId: updatedTrace.id,
        modelVersionId: updatedTrace.modelVersionId || null,
        changeType,
        selectionCount: currentSelections.length,
      });
      if (changeType === "text_changed") {
        const { id: modelId, versionId: modelVersionId } =
          workspaceStore.getEditingModel() || {};
        if (!modelId || !modelVersionId) {
          console.warn(
            "Skipping active trace text update: no active editing model version.",
          );
          return;
        }

        modelEditorStore.updateModelDbpmTextSelections(
          selectionsToText(currentSelections),
          resolveTraceDocumentMeta(updatedTrace),
        );
        if (alertOnEmptyAfterDeletion) {
          alertNoSelectionsIfNeeded(
            currentSelections.length,
            "updateActiveModelTrace",
          );
        }
        const modelData = modelEditorStore.getSerializedData();
        await updateModelVersionAndCache({
          modelId,
          modelVersionId,
          modelData,
          trace: updatedTrace,
          type: MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
        });
        documentViewerStore.updateTrace(updatedTrace);
      } else {
        await tracesAPI.updateTrace(getTraceUpdatePayload(updatedTrace));
        documentViewerStore.syncOriginalActiveModelSerializedSelectionsWithActiveTrace();
      }
    } catch (error) {
      console.error("Failed to update active model trace:", error);
    }
  },
};
