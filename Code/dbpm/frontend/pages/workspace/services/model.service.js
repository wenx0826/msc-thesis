// Model Service - Handles model generation and updates
import { modelsAPI, tracesAPI, logsAPI } from "../../../api/index.js";
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
const NO_LINKED_SELECTIONS_ERROR_CODE = "no-linked-selections";
const NO_LINKED_SELECTIONS_ON_UPDATE_MESSAGE =
  "There is no selected text related with this model.";
const NO_LINKED_SELECTIONS_ON_LOAD_MESSAGE =
  "No selected text is related with this model. Please make sure it is linked properly with the document.";
const MODEL_GENERATION_IN_PROGRESS_MESSAGE =
  "Generating new model<span class='loading-dots'></span>";
const MODEL_REGENERATION_IN_PROGRESS_MESSAGE =
  "Regenerating model<span class='loading-dots'></span>";
const MODEL_REGENERATION_BY_PROMPT_IN_PROGRESS_MESSAGE =
  "Regenerating model by prompt<span class='loading-dots'></span>";
const MODEL_REGENERATION_READY_MESSAGE_SUFFIX = ". Switch back to review.";
const MODEL_REGENERATION_FAILED_MESSAGE_SUFFIX = ". Please retry.";
const MODEL_GENERATION_ERROR_MESSAGE =
  "Sorry, an error occurred while generating the model. Please start from scratch or retry.";

let previewRenderQueue = Promise.resolve();
let previewRendererWindow = null;
let previewRendererWindowPromise = null;
const cachePromisesByVersionId = new Map();
const pendingGenerationRequestsById = new Map();
const deferredRegenerationPreviewsByVersionId = new Map();
let generationRequestSequence = 0;
let lastNoSelectionLoadAlert = {
  versionId: null,
  at: 0,
};

function normalizeComparableId(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function getEditingModelContext() {
  const { id, versionId } = workspaceStore.getEditingModel() || {};
  return {
    modelId: id || null,
    modelVersionId: versionId || null,
  };
}

function isViewingLatestDocumentVersion() {
  const viewedDocument = workspaceStore.getViewedDocument() || {};
  if (!viewedDocument?.id || !viewedDocument?.versionId) {
    return false;
  }
  return viewedDocument.isLatest === true;
}

function isSameEditingModelContext(left, right) {
  if (!left || !right) {
    return false;
  }

  return (
    normalizeComparableId(left.modelId) ===
      normalizeComparableId(right.modelId) &&
    normalizeComparableId(left.modelVersionId) ===
      normalizeComparableId(right.modelVersionId)
  );
}

function isEditingModelContextActive(context) {
  return isSameEditingModelContext(context, getEditingModelContext());
}

function getModelDisplayLabel(modelId) {
  const modelName = modelId ? modelsStore.getEntityName(modelId) : null;
  return modelName || modelId || "model";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return match;
    }
  });
}

function resolveInProgressMessageByRequestType(requestType) {
  switch (requestType) {
    case "regeneration_prompt":
      return MODEL_REGENERATION_BY_PROMPT_IN_PROGRESS_MESSAGE;
    case "regeneration_selections":
      return MODEL_REGENERATION_IN_PROGRESS_MESSAGE;
    default:
      return MODEL_GENERATION_IN_PROGRESS_MESSAGE;
  }
}

function getLatestPendingGenerationRequest() {
  let latestRequest = null;
  for (const request of pendingGenerationRequestsById.values()) {
    if (!latestRequest || request.sequence > latestRequest.sequence) {
      latestRequest = request;
    }
  }
  return latestRequest;
}

function renderPendingGenerationStatusMessageIfAny() {
  const latestPendingRequest = getLatestPendingGenerationRequest();
  if (!latestPendingRequest) {
    return false;
  }
  showModelGenerationInProgressMessage(
    resolveInProgressMessageByRequestType(latestPendingRequest.type),
  );
  return true;
}

function beginPendingGenerationRequest({
  type,
  modelId = null,
  modelVersionId = null,
}) {
  generationRequestSequence += 1;
  const requestId = `generation_${generationRequestSequence}`;
  pendingGenerationRequestsById.set(requestId, {
    id: requestId,
    sequence: generationRequestSequence,
    type,
    modelId,
    modelVersionId,
    createdAt: Date.now(),
  });
  renderPendingGenerationStatusMessageIfAny();
  return requestId;
}

function endPendingGenerationRequest(requestId) {
  if (!requestId) {
    return;
  }
  pendingGenerationRequestsById.delete(requestId);
}

function storeDeferredRegenerationPreview(preview) {
  const modelVersionKey = normalizeComparableId(preview?.modelVersionId);
  if (!modelVersionKey) {
    return;
  }
  deferredRegenerationPreviewsByVersionId.set(modelVersionKey, {
    ...preview,
    createdAt: Date.now(),
  });
}

function consumeDeferredRegenerationPreview({ modelId, modelVersionId }) {
  const modelVersionKey = normalizeComparableId(modelVersionId);
  if (!modelVersionKey) {
    return null;
  }

  const preview = deferredRegenerationPreviewsByVersionId.get(modelVersionKey);
  if (!preview) {
    return null;
  }

  if (
    modelId &&
    normalizeComparableId(preview.modelId) !== normalizeComparableId(modelId)
  ) {
    return null;
  }

  deferredRegenerationPreviewsByVersionId.delete(modelVersionKey);
  return preview;
}

function showDeferredRegenerationReadyMessage(modelId) {
  const modelLabel = escapeHtml(getModelDisplayLabel(modelId));
  modelEditorStore.setStatusMessage({
    type: "info",
    contentHtml: `Regeneration ready for ${modelLabel}${MODEL_REGENERATION_READY_MESSAGE_SUFFIX}`,
    closable: true,
    autoCloseMs: 8000,
  });
}

function showDeferredRegenerationErrorMessage(modelId) {
  const modelLabel = escapeHtml(getModelDisplayLabel(modelId));
  modelEditorStore.setStatusMessage({
    type: "error",
    contentHtml: `Regeneration failed for ${modelLabel}${MODEL_REGENERATION_FAILED_MESSAGE_SUFFIX}`,
    closable: true,
    autoCloseMs: 8000,
  });
}

function queuePreviewRender(task) {
  const run = previewRenderQueue.then(task);
  previewRenderQueue = run.catch(() => {});
  return run;
}

function scopeSvgMarkupForModel(svgMarkup, modelId) {
  // Keep cached/editor SVG canonical (raw ids like a1, a2) because editor interactions rely on them.
  // Scoping is applied only at list/popover display time.
  return svgMarkup;
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
      (node) =>
        node.localName === "description" && node.namespaceURI !== DBPM_NS,
    ) || null
  );
}

function composeRegeneratedModelData({ currentModelData, generatedModelData }) {
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
    standaloneDoc.documentElement.setAttributeNS(
      XMLNS_NS,
      "xmlns:dbpm",
      DBPM_NS,
    );
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

function classifyTraceSelectionChange({
  previousSelections,
  currentSelections,
}) {
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

  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  ) {
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

function resolveModelVersionIdFromErrorContext({
  modelId = null,
  modelVersionId = null,
  traceId = null,
} = {}) {
  if (modelVersionId !== undefined && modelVersionId !== null) {
    return String(modelVersionId);
  }

  const traces = documentViewerStore.getTraces() || [];
  if (traceId !== undefined && traceId !== null) {
    const trace = traces.find(
      (item) => String(item?.id || "") === String(traceId),
    );
    if (trace?.modelVersionId) {
      return String(trace.modelVersionId);
    }
  }

  if (modelId !== undefined && modelId !== null) {
    const trace = traces.find(
      (item) => String(item?.modelId || "") === String(modelId),
    );
    if (trace?.modelVersionId) {
      return String(trace.modelVersionId);
    }
  }

  const editingModelVersionId = workspaceStore.getEditingModel()?.versionId;
  return editingModelVersionId ? String(editingModelVersionId) : null;
}

function clearNoLinkedSelectionsError(context = {}) {
  const targetModelVersionId = resolveModelVersionIdFromErrorContext(context);
  if (targetModelVersionId) {
    modelsStore.clearCachedVersionErrorsByCode(
      targetModelVersionId,
      NO_LINKED_SELECTIONS_ERROR_CODE,
    );
  }
}

function upsertNoLinkedSelectionsError({
  message,
  source,
  modelId = null,
  modelVersionId = null,
  traceId = null,
}) {
  const resolvedModelVersionId = resolveModelVersionIdFromErrorContext({
    modelId,
    modelVersionId,
    traceId,
  });
  if (!resolvedModelVersionId) {
    return;
  }

  const resolvedModelId =
    modelId !== undefined && modelId !== null
      ? String(modelId)
      : modelsStore.getModelIdByVersionId(resolvedModelVersionId);

  modelsStore.upsertCachedVersionError(resolvedModelVersionId, {
    id: NO_LINKED_SELECTIONS_ERROR_CODE,
    code: NO_LINKED_SELECTIONS_ERROR_CODE,
    message,
    source,
    modelId:
      resolvedModelId === undefined || resolvedModelId === null
        ? null
        : String(resolvedModelId),
    modelVersionId: resolvedModelVersionId,
    traceId: traceId === undefined || traceId === null ? null : String(traceId),
  });
}

function isNoSelectionsContextCurrentDisplay({
  modelId = null,
  modelVersionId = null,
  traceId = null,
} = {}) {
  const hasExplicitContext = [modelId, modelVersionId, traceId].some(
    (value) => value !== undefined && value !== null,
  );
  if (!hasExplicitContext) {
    return true;
  }

  const activeTrace = documentViewerStore.getDisplayedModelTrace();
  if (activeTrace) {
    if (
      traceId !== undefined &&
      traceId !== null &&
      String(activeTrace.id || "") === String(traceId)
    ) {
      return true;
    }
    if (
      modelVersionId !== undefined &&
      modelVersionId !== null &&
      String(activeTrace.modelVersionId || "") === String(modelVersionId)
    ) {
      return true;
    }
    if (
      modelId !== undefined &&
      modelId !== null &&
      String(activeTrace.modelId || "") === String(modelId)
    ) {
      return true;
    }
  }

  const editingModel = workspaceStore.getEditingModel() || {};
  if (
    modelVersionId !== undefined &&
    modelVersionId !== null &&
    String(editingModel.versionId || "") === String(modelVersionId)
  ) {
    return true;
  }
  if (
    modelId !== undefined &&
    modelId !== null &&
    String(editingModel.id || "") === String(modelId)
  ) {
    return true;
  }
  return false;
}

function syncNoSelectionsErrorIfNeeded(selectionCount, source, context = {}) {
  const resolvedModelVersionId = resolveModelVersionIdFromErrorContext(context);
  const resolvedContext = {
    ...context,
    modelVersionId: resolvedModelVersionId || context?.modelVersionId || null,
  };

  if (selectionCount !== 0) {
    clearNoLinkedSelectionsError(resolvedContext);
    return;
  }
  const message = NO_LINKED_SELECTIONS_ON_UPDATE_MESSAGE;
  if (isNoSelectionsContextCurrentDisplay(resolvedContext)) {
    console.warn(`[DBPM] ${message}`, { source });
  }
  upsertNoLinkedSelectionsError({
    message,
    source,
    modelId: context?.modelId || null,
    modelVersionId: resolvedContext.modelVersionId,
    traceId: context?.traceId || null,
  });
}

function syncNoSelectionsOnModelVersionLoadIfNeeded(source) {
  const { id: editingModelId, versionId: modelVersionId } =
    workspaceStore.getEditingModel() || {};
  if (!editingModelId || !modelVersionId) {
    clearNoLinkedSelectionsError();
    return;
  }

  const modelDocumentId = modelsStore.getModelDocumentId(editingModelId);
  const viewedDocumentId = workspaceStore.getViewedDocumentId();
  if (
    modelDocumentId &&
    viewedDocumentId &&
    String(modelDocumentId) !== String(viewedDocumentId)
  ) {
    clearNoLinkedSelectionsError({
      modelId: editingModelId,
      modelVersionId,
    });
    return;
  }

  const trace = (documentViewerStore.getTraces() || []).find(
    (item) => String(item?.modelVersionId || "") === String(modelVersionId),
  );
  if (!trace) {
    clearNoLinkedSelectionsError({
      modelId: editingModelId,
      modelVersionId,
    });
    return;
  }
  const selectionCount = Array.isArray(trace?.selections)
    ? trace.selections.length
    : 0;
  if (selectionCount > 0) {
    clearNoLinkedSelectionsError({
      modelId: editingModelId,
      modelVersionId,
      traceId: trace?.id || null,
    });
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

  const message = NO_LINKED_SELECTIONS_ON_LOAD_MESSAGE;
  console.warn(`[DBPM] ${message}`, {
    source,
    modelVersionId: currentVersionId,
    traceId: trace?.id || null,
  });
  upsertNoLinkedSelectionsError({
    message,
    source,
    modelId: editingModelId || null,
    modelVersionId: currentVersionId,
    traceId: trace?.id || null,
  });
}

function showModelGenerationInProgressMessage(contentHtml) {
  modelEditorStore.setStatusMessage({
    type: "info",
    contentHtml: contentHtml || MODEL_GENERATION_IN_PROGRESS_MESSAGE,
    closable: false,
    autoCloseMs: 0,
  });
}

function showModelGenerationErrorMessage() {
  modelEditorStore.setStatusMessage({
    type: "error",
    contentHtml: MODEL_GENERATION_ERROR_MESSAGE,
    closable: true,
    autoCloseMs: 0,
  });
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

    // Intentionally keep cache-level SVG unscoped so editor IDs remain canonical.
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
  applyDeferredRegenerationPreviewForActiveEditingModel() {
    const activeContext = getEditingModelContext();
    if (!activeContext.modelId || !activeContext.modelVersionId) {
      return false;
    }

    const deferredPreview = consumeDeferredRegenerationPreview(activeContext);
    if (!deferredPreview?.regeneratedDataXml) {
      return false;
    }

    modelEditorStore.setData(deferredPreview.regeneratedDataXml, {
      updateType: deferredPreview.updateType,
    });
    return true;
  },

  async generateModelByPrompt(userInput) {
    const regenerationContext = getEditingModelContext();
    const { modelId: editingModelId, modelVersionId: editingModelVersionId } =
      regenerationContext;
    if (!editingModelId || !editingModelVersionId) {
      console.warn(
        "No active editing model found for prompt regeneration; aborting.",
      );
      return null;
    }

    const rpstXml = modelEditorStore.getSerializedRpstData();
    if (!rpstXml) {
      console.warn(
        "Failed to resolve current model XML for prompt regeneration.",
      );
      return null;
    }

    const previousModelData = modelEditorStore.getSerializedData();
    if (!previousModelData) {
      console.warn(
        "No current model data found for prompt regeneration preview.",
      );
      return null;
    }

    const requestId = beginPendingGenerationRequest({
      type: "regeneration_prompt",
      modelId: editingModelId,
      modelVersionId: editingModelVersionId,
    });
    let hasError = false;
    let hasAppliedToActiveModel = false;
    let hasDeferredPreview = false;
    try {
      const generatedModel = await this.generateModel(userInput, rpstXml);
      if (!generatedModel) {
        throw new Error("Model generation returned an empty result.");
      }

      const regeneratedModelData = composeRegeneratedModelData({
        currentModelData: previousModelData,
        generatedModelData: generatedModel,
      });

      const preview = {
        modelId: editingModelId,
        modelVersionId: editingModelVersionId,
        updateType: MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT,
        previousDataXml: previousModelData,
        regeneratedDataXml: regeneratedModelData,
      };
      if (isEditingModelContextActive(regenerationContext)) {
        modelEditorStore.setData(preview.regeneratedDataXml, {
          updateType: preview.updateType,
        });
        hasAppliedToActiveModel = true;
      } else {
        storeDeferredRegenerationPreview(preview);
        hasDeferredPreview = true;
        showDeferredRegenerationReadyMessage(editingModelId);
      }

      logsAPI.createLogEntry({
        event: "model_regenerated_by_prompt",
        data: { modelId: editingModelId },
      });

      return {
        id: editingModelId,
        versionId: editingModelVersionId,
        data: generatedModel,
      };
    } catch (error) {
      hasError = true;
      console.error("Failed to regenerate model by prompt:", error);
      if (isEditingModelContextActive(regenerationContext)) {
        showModelGenerationErrorMessage();
      } else {
        showDeferredRegenerationErrorMessage(editingModelId);
      }
      return null;
    } finally {
      endPendingGenerationRequest(requestId);

      const hasAnyPending = renderPendingGenerationStatusMessageIfAny();
      if (hasAnyPending || hasDeferredPreview || hasError) {
        return;
      }
      if (hasAppliedToActiveModel) {
        modelEditorStore.clearStatusMessage();
      }
    }
  },

  async generateModelBySelections(target) {
    const normalizedTarget =
      target === MODEL_GENERATION_TARGET.EDITING_MODEL
        ? MODEL_GENERATION_TARGET.EDITING_MODEL
        : MODEL_GENERATION_TARGET.NEW_MODEL;
    const regenerationContext =
      normalizedTarget === MODEL_GENERATION_TARGET.EDITING_MODEL
        ? getEditingModelContext()
        : null;
    const hasEditingContextAtStart =
      !!regenerationContext?.modelId && !!regenerationContext?.modelVersionId;
    const previousModelData = hasEditingContextAtStart
      ? modelEditorStore.getSerializedData()
      : null;

    if (hasEditingContextAtStart && !previousModelData) {
      console.warn("No current model data found for regeneration preview.");
      return null;
    }

    const requestId = beginPendingGenerationRequest({
      type:
        normalizedTarget === MODEL_GENERATION_TARGET.EDITING_MODEL
          ? "regeneration_selections"
          : "new_model",
      modelId: regenerationContext?.modelId || null,
      modelVersionId: regenerationContext?.modelVersionId || null,
    });
    let hasError = false;
    let hasAppliedToActiveModel = false;
    let hasDeferredPreview = false;
    try {
      const selectedText = documentViewerStore.getSelectedText();
      const generatedModel = await this.generateModel(
        selectedText,
        EMPTY_MODEL,
      );
      if (!generatedModel) {
        throw new Error("Model generation returned an empty result.");
      }

      if (normalizedTarget === MODEL_GENERATION_TARGET.NEW_MODEL) {
        return await this.createModelAndTrace(generatedModel);
      }

      if (!hasEditingContextAtStart) {
        console.warn(
          "No active editing model/version found for regeneration; creating a new model instead.",
        );
        return await this.createModelAndTrace(generatedModel);
      }

      const regeneratedModelData = composeRegeneratedModelData({
        currentModelData: previousModelData,
        generatedModelData: generatedModel,
      });

      const preview = {
        modelId: regenerationContext.modelId,
        modelVersionId: regenerationContext.modelVersionId,
        updateType: MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
        previousDataXml: previousModelData,
        regeneratedDataXml: regeneratedModelData,
      };
      if (isEditingModelContextActive(regenerationContext)) {
        modelEditorStore.setData(preview.regeneratedDataXml, {
          updateType: preview.updateType,
        });
        hasAppliedToActiveModel = true;
      } else {
        storeDeferredRegenerationPreview(preview);
        hasDeferredPreview = true;
        showDeferredRegenerationReadyMessage(regenerationContext.modelId);
      }

      return {
        id: regenerationContext.modelId,
        versionId: regenerationContext.modelVersionId,
        data: generatedModel,
      };
    } catch (error) {
      hasError = true;
      console.error("Failed to generate model by selections:", error);
      if (
        normalizedTarget === MODEL_GENERATION_TARGET.NEW_MODEL ||
        !hasEditingContextAtStart ||
        isEditingModelContextActive(regenerationContext)
      ) {
        showModelGenerationErrorMessage();
      } else {
        showDeferredRegenerationErrorMessage(regenerationContext.modelId);
      }
      return null;
    } finally {
      endPendingGenerationRequest(requestId);

      const hasAnyPending = renderPendingGenerationStatusMessageIfAny();
      if (hasAnyPending || hasDeferredPreview || hasError) {
        return;
      }
      if (
        normalizedTarget === MODEL_GENERATION_TARGET.NEW_MODEL ||
        !hasEditingContextAtStart ||
        hasAppliedToActiveModel
      ) {
        modelEditorStore.clearStatusMessage();
      }
    }
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
      isLatest: true,
    });
    modelEditorStore.setData(preparedModelData, {
      updateType: null,
    });
    modelsStore.addCachedVersion(createdModelMeta.latestVersionId, {
      modelId: createdModelMeta.id,
      dataXml: preparedModelData,
      status: "ready",
    });
    documentViewerStore.setSelectedSelection(null);
    documentViewerStore.setTemporarySelections([]);
    documentViewerStore.setHasSelectionChanged(false);
    documentViewerStore.addTrace(createdTrace);
    projectGraphStore.addModelNodeAndEdge(createdModelMeta);
    // return { modelMeta: createdModelMeta, trace: normalizedTrace };
  },
  async renameModel(modelId, newName) {
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
  async deleteModelsBulk(modelIds = []) {
    const uniqueIds = [...new Set((modelIds || []).filter(Boolean))];
    const deletedIds = [];
    const failed = [];

    for (const modelId of uniqueIds) {
      try {
        await this.deleteModel(modelId);
        deletedIds.push(modelId);
      } catch (error) {
        failed.push({
          id: modelId,
          error,
        });
      }
    }

    return {
      deletedIds,
      failed,
    };
  },

  maybeAlertNoSelectionOnLoadedEditingModel(source = "manual_check") {
    syncNoSelectionsOnModelVersionLoadIfNeeded(source);
  },
  async updateSubprocessLink(taskId, subprocessModelId) {
    const { id: modelId, versionId: modelVersionId } =
      workspaceStore.getEditingModel() || {};
    if (!modelVersionId || !taskId || !modelId) {
      return;
    }

    if (!isViewingLatestDocumentVersion()) {
      console.warn(
        "Skipping updateSubprocessLink: viewing historical document version.",
      );
      return;
    }

    const normalizedSubprocessModelId =
      typeof subprocessModelId === "string" &&
      subprocessModelId.trim().length > 0
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
  async updateEditingVersion(type, options = {}) {
    const { expectedModelId = null, expectedModelVersionId = null } = options;
    const { id: modelId, versionId: modelVersionId } =
      workspaceStore.getEditingModel();
    if (!modelId || !modelVersionId) {
      console.warn(
        "Skipping updateEditingVersion: no active editing model/version.",
      );
      return null;
    }

    if (!isViewingLatestDocumentVersion()) {
      console.warn(
        "Skipping updateEditingVersion: viewing historical document version.",
      );
      return null;
    }

    if (
      expectedModelId &&
      normalizeComparableId(expectedModelId) !== normalizeComparableId(modelId)
    ) {
      console.warn("Skipping updateEditingVersion due to model mismatch.", {
        expectedModelId,
        modelId,
      });
      return null;
    }

    if (
      expectedModelVersionId &&
      normalizeComparableId(expectedModelVersionId) !==
        normalizeComparableId(modelVersionId)
    ) {
      console.warn(
        "Skipping updateEditingVersion due to model version mismatch.",
        {
          expectedModelVersionId,
          modelVersionId,
        },
      );
      return null;
    }

    const trace =
      type === MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS ||
      type === MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS
        ? documentViewerStore.getSerializedNewActiveModelTrace()
        : null;
    const selectionCount = Array.isArray(trace?.selections)
      ? trace.selections.length
      : 0;

    if (trace?.id && selectionCount > 0) {
      syncNoSelectionsErrorIfNeeded(selectionCount, "updateEditingVersion", {
        modelId,
        modelVersionId,
        traceId: trace.id,
      });
    }

    if (type === MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS) {
      const selectedText = selectionsToText(trace?.selections || []);
      const documentMeta = resolveTraceDocumentMeta(trace || {});
      modelEditorStore.updateModelDbpmTextSelections(
        selectedText,
        documentMeta,
      );
    }
    const modelData = modelEditorStore.getSerializedData();

    if (trace?.id) {
      notifyTraceUpdateTriggered({
        source: "updateEditingVersion",
        traceId: trace.id,
        modelVersionId,
        changeType: type,
        selectionCount,
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
      documentViewerStore.setSelectedSelection(null);
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

    const selectionCount = Array.isArray(serializedTrace.selections)
      ? serializedTrace.selections.length
      : 0;
    if (alertOnEmptyAfterDeletion || selectionCount > 0) {
      syncNoSelectionsErrorIfNeeded(selectionCount, "updateTraceTextById", {
        modelId: serializedTrace.modelId || null,
        modelVersionId: serializedTrace.modelVersionId || null,
        traceId: serializedTrace.id || null,
      });
    }

    try {
      const currentModelData =
        await modelsAPI.getDataByVersionId(modelVersionId);
      const updatedModelData = updateDbpmTextSelections(
        currentModelData,
        selectionsToText(serializedTrace.selections),
        resolveTraceDocumentMeta(serializedTrace),
      );
      notifyTraceUpdateTriggered({
        source: "updateTraceTextById",
        traceId: serializedTrace.id,
        modelVersionId,
        changeType: MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
        selectionCount,
      });
      await modelsAPI.updateVersion(modelVersionId, {
        modelData: updatedModelData,
        trace: serializedTrace,
        type: MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
      });

      modelsStore.addCachedVersion(modelVersionId, {
        ...(serializedTrace.modelId
          ? { modelId: serializedTrace.modelId }
          : {}),
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
        if (alertOnEmptyAfterDeletion || currentSelections.length > 0) {
          syncNoSelectionsErrorIfNeeded(
            currentSelections.length,
            "updateActiveModelTrace",
            {
              modelId: updatedTrace.modelId || null,
              modelVersionId: updatedTrace.modelVersionId || null,
              traceId: updatedTrace.id || null,
            },
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
  // Model versioning
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

    const { versionMeta: version, trace } = result || {};
    modelsStore.addVersion(modelId, version);
    const createdVersionId = version?.id || null;

    workspaceStore.setEditingModel({
      id: modelId,
      versionId: createdVersionId,
      isLatest: true,
    });
    await this.loadVersion(createdVersionId);
    documentViewerStore.removeTracesByModelId(modelId);
    console.log(
      `Created new model version ${createdVersionId} for model ${modelId} based on source version ${sourceVersionId} (${sourceVersionLabel}) with reason: ${reason}`,
      { trace },
    );
    documentViewerStore.addTrace(trace);
    // documentViewerStore.updateTraceByModelId(modelId, trace);
    // documentViewerStore.updateTraceModelVersion({
    //   modelId,
    //   sourceModelVersionId: sourceVersionId,
    //   targetModelVersionId: createdVersionId,
    // });

    // documentViewerStore.setActiveModelTraceByModelVersionId(createdVersionId);
    // if (!documentViewerStore.getDisplayedModelTrace()) {
    //   documentViewerStore.setActiveModelTraceByModelId(modelId);
    // }
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
    this.applyDeferredRegenerationPreviewForActiveEditingModel();
    syncNoSelectionsOnModelVersionLoadIfNeeded("load_model_version");
  },
};
