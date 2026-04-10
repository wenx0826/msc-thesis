// Model Service - Handles model generation and updates
import { modelsAPI, documentModelLinksAPI } from "../../../api/index.js";
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
import { classifyLinkSelectionChange } from "../utils/link-selection-draft.js";
import { endpointLoader } from "../../../modules/model/endpoints/endpoint-loader.js";

// Import constants
const MODEL_VERSION_CHANGE_TYPE = Constants.MODEL_VERSION_CHANGE_TYPE;
const EMPTY_MODEL = Constants.EMPTY_MODEL;
const PREVIEW_THEME_PATH = "modules/model/themes/preset_customized/theme.js";
const PREVIEW_IFRAME_ID = "modelPreviewRendererIframe";
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
let pendingGenerationAttemptMeta = null;

function countWordsSimple(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length || 0;
}

function composeSelectionGenerationInput(selectedText, additionalPrompt = "") {
  return additionalPrompt
    ? [
        selectedText,
        "**IMPORTANT** Additional instructions:",
        additionalPrompt,
      ].join("\n")
    : selectedText;
}

function resolveGenerationAttemptType({
  isRegeneration = false,
  hasSelectionInput = false,
  hasPromptInput = false,
} = {}) {
  if (!isRegeneration) {
    return "new";
  }
  if (hasPromptInput && !hasSelectionInput) {
    return "refinement";
  }
  return "regeneration";
}

function resolveGenerationInputMode({
  hasSelectionInput = false,
  hasPromptInput = false,
} = {}) {
  if (hasSelectionInput && hasPromptInput) {
    return "selection_with_prompt";
  }
  if (hasPromptInput) {
    return "prompt";
  }
  return "selection_only";
}

let generationRequestSequence = 0;
let lastNoSelectionLoadAlert = {
  versionId: null,
  at: 0,
};

function getEditingModelContext() {
  const { id, versionId } = workspaceStore.getEditingModel() || {};
  return {
    modelId: id || null,
    modelVersionId: versionId || null,
  };
}

function getActiveRegenerationContext() {
  const modelId = workspaceStore.getEditingModelId();
  const editingModel = workspaceStore.getEditingModel();
  const modelVersionId = workspaceStore.isEditingModelRegenerationDraft()
    ? workspaceStore.getEditingModelSourceVersionId()
    : workspaceStore.getEditingModelVersionId();

  if (!modelId || !modelVersionId || editingModel?.isLatest !== true) {
    return null;
  }

  return {
    modelId,
    modelVersionId,
  };
}

function resolveEditingModelIsLatest(modelId = null, modelVersionId = null) {
  const editingModel = workspaceStore.getEditingModel() || {};
  if (typeof editingModel.isLatest === "boolean") {
    return editingModel.isLatest;
  }
  if (modelId && modelVersionId) {
    return modelsStore.isLatestVersion(modelId, modelVersionId);
  }
  return null;
}

function setRegenerationDraftEditingModel({
  modelId = null,
  modelVersionId = null,
} = {}) {
  if (!modelId) {
    return;
  }
  workspaceStore.setEditingModel({
    id: modelId,
    versionId: null,
    sourceVersionId: modelVersionId,
    isLatest: resolveEditingModelIsLatest(modelId, modelVersionId),
  });
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
    left.modelId === right.modelId &&
    left.modelVersionId === right.modelVersionId
  );
}

function isRegenerationContextActive(context) {
  return isSameEditingModelContext(context, getActiveRegenerationContext());
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
    case "refinement":
      return MODEL_REGENERATION_BY_PROMPT_IN_PROGRESS_MESSAGE;
    case "regeneration":
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

function syncModelEditorGeneratingState() {
  modelEditorStore.setIsGenerating(pendingGenerationRequestsById.size > 0);
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
  syncModelEditorGeneratingState();
  renderPendingGenerationStatusMessageIfAny();
  return requestId;
}

function endPendingGenerationRequest(requestId) {
  if (!requestId) {
    return;
  }
  pendingGenerationRequestsById.delete(requestId);
  syncModelEditorGeneratingState();
}

function storeDeferredRegenerationPreview(preview) {
  const modelVersionKey = preview?.modelVersionId;
  if (!modelVersionKey) {
    return;
  }
  deferredRegenerationPreviewsByVersionId.set(modelVersionKey, {
    ...preview,
    createdAt: Date.now(),
  });
}

function consumeDeferredRegenerationPreview({ modelId, modelVersionId }) {
  const modelVersionKey = modelVersionId;
  if (!modelVersionKey) {
    return null;
  }

  const preview = deferredRegenerationPreviewsByVersionId.get(modelVersionKey);
  if (!preview) {
    return null;
  }

  if (modelId && preview.modelId !== modelId) {
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
      typeof selection?.textQuote?.exact === "string"
        ? selection.textQuote.exact.trim()
        : "",
    )
    .filter(Boolean)
    .join(" ");
}

function cloneValue(value, fallback = null) {
  if (value === undefined) {
    return fallback;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return fallback;
  }
}

function resolveModelCreationContext(creationContext = null) {
  const normalizedContext =
    creationContext && typeof creationContext === "object"
      ? creationContext
      : {};
  const viewedDocument = workspaceStore.getViewedDocument() || {};
  const documentId =
    normalizedContext.documentId ??
    viewedDocument.id ??
    workspaceStore.getViewedDocumentId() ??
    "";
  const documentVersionId =
    normalizedContext.documentVersionId ?? viewedDocument.versionId ?? null;
  const documentVersionName =
    normalizedContext.documentVersionName ??
    (documentId && documentVersionId
      ? documentsStore.getVersion(documentId, documentVersionId)?.name || ""
      : "");
  const contextSelections = Array.isArray(normalizedContext.selections)
    ? normalizedContext.selections
    : documentViewerStore.getSerializedUnlinkedSelections();
  const prompt = normalizedContext.prompt;
  return {
    documentId: documentId || "",
    documentVersionId,
    documentVersionName,
    selections: cloneValue(contextSelections, []),
    prompt,
  };
}

function getLinkUpdatePayload(serializedLink) {
  return {
    id: serializedLink?.id,
    selections: Array.isArray(serializedLink?.selections)
      ? serializedLink.selections
      : [],
  };
}

function getModelVersionLinkPayload(serializedLink) {
  if (!serializedLink) {
    return null;
  }
  return {
    id: serializedLink.id,
    documentVersionId: serializedLink.documentVersionId,
    selections: Array.isArray(serializedLink.selections)
      ? serializedLink.selections
      : [],
  };
}

function getCreateVersionLinkPayload(serializedLink) {
  if (!serializedLink) {
    return null;
  }
  return {
    documentVersionId: serializedLink.documentVersionId,
    selections: Array.isArray(serializedLink.selections)
      ? serializedLink.selections
      : [],
  };
}

function notifyLinkUpdateTriggered({
  source,
  linkId = null,
  modelVersionId = null,
  changeType = null,
  selectionCount = null,
}) {
  const detail = {
    source,
    linkId,
    modelVersionId,
    changeType,
    selectionCount,
    triggeredAt: new Date().toISOString(),
  };
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  ) {
    window.dispatchEvent(
      new CustomEvent("dbpm:link-update-triggered", {
        detail,
      }),
    );
  }
}

function resolveModelVersionIdFromErrorContext({
  modelId = null,
  modelVersionId = null,
  linkId = null,
} = {}) {
  if (modelVersionId !== undefined && modelVersionId !== null) {
    return String(modelVersionId);
  }

  const links = documentViewerStore.getLinks() || [];
  if (linkId) {
    const link = links.find(
      (item) => String(item?.id || "") === String(linkId),
    );
    if (link?.modelVersionId) {
      return String(link.modelVersionId);
    }
  }

  if (modelId) {
    const link = links.find(
      (item) => String(item?.modelId || "") === String(modelId),
    );
    if (link?.modelVersionId) {
      return String(link.modelVersionId);
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
  linkId = null,
}) {
  const resolvedModelVersionId = resolveModelVersionIdFromErrorContext({
    modelId,
    modelVersionId,
    linkId,
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
    linkId: linkId === undefined || linkId === null ? null : String(linkId),
  });
}

function isNoSelectionsContextCurrentDisplay({
  modelId = null,
  modelVersionId = null,
  linkId = null,
} = {}) {
  const hasExplicitContext = [modelId, modelVersionId, linkId].some(
    (value) => value !== undefined && value !== null,
  );
  if (!hasExplicitContext) {
    return true;
  }

  const editingModelLink = documentViewerStore.getDisplayedEditingModelLink();
  if (editingModelLink) {
    if (
      linkId !== undefined &&
      linkId !== null &&
      String(editingModelLink.id || "") === String(linkId)
    ) {
      return true;
    }
    if (
      modelVersionId !== undefined &&
      modelVersionId !== null &&
      String(editingModelLink.modelVersionId || "") === String(modelVersionId)
    ) {
      return true;
    }
    if (
      modelId !== undefined &&
      modelId !== null &&
      String(editingModelLink.modelId || "") === String(modelId)
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
    linkId: context?.linkId || null,
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

  const link = (documentViewerStore.getLinks() || []).find(
    (item) => String(item?.modelVersionId || "") === String(modelVersionId),
  );
  if (!link) {
    clearNoLinkedSelectionsError({
      modelId: editingModelId,
      modelVersionId,
    });
    return;
  }
  const selectionCount = Array.isArray(link?.selections)
    ? link.selections.length
    : 0;
  if (selectionCount > 0) {
    clearNoLinkedSelectionsError({
      modelId: editingModelId,
      modelVersionId,
      linkId: link?.id || null,
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
    linkId: link?.id || null,
  });
  upsertNoLinkedSelectionsError({
    message,
    source,
    modelId: editingModelId || null,
    modelVersionId: currentVersionId,
    linkId: link?.id || null,
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
  link,
  type,
  prompt = null,
}) {
  await modelsAPI.updateVersion(modelVersionId, {
    modelData,
    link: getModelVersionLinkPayload(link),
    type,
    prompt,
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

function buildSelectionDraftCreateVersionRequest({
  modelId,
  sourceVersionId,
  type = MODEL_VERSION_CHANGE_TYPE.MANUAL_SELECTIONS_UPDATE,
}) {
  if (!documentViewerStore.getHasSelectionChanged()) {
    return null;
  }

  const activeEditingContext = getEditingModelContext();
  const sourceContext = {
    modelId,
    modelVersionId: sourceVersionId,
  };
  if (!isSameEditingModelContext(activeEditingContext, sourceContext)) {
    return null;
  }

  const link = documentViewerStore.getSerializedNewEditingModelLink();
  if (!link || !Array.isArray(link.selections)) {
    return null;
  }

  const currentModelData = modelEditorStore.getSerializedData();
  if (typeof currentModelData !== "string" || !currentModelData.trim()) {
    return null;
  }

  return {
    modelId,
    sourceVersionId,
    reason: "new_version",
    type,
    modelData: currentModelData,
    link: getCreateVersionLinkPayload(link),
  };
}

function buildExplicitCreateVersionRequest({
  modelId,
  sourceVersionId,
  modelData,
  link = null,
  type = MODEL_VERSION_CHANGE_TYPE.MANUAL_SELECTIONS_UPDATE,
  prompt = null,
}) {
  const resolvedLink =
    link || documentViewerStore.getSerializedNewEditingModelLink();
  const payloadLink = getCreateVersionLinkPayload(resolvedLink);
  if (!payloadLink?.documentVersionId) {
    throw new Error("Failed to resolve link payload for version creation.");
  }
  return {
    modelId,
    sourceVersionId,
    reason: "new_version",
    type,
    modelData,
    link: payloadLink,
    prompt,
  };
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
    const activeContext = getActiveRegenerationContext();
    if (!activeContext) {
      return false;
    }

    const deferredPreview = consumeDeferredRegenerationPreview(activeContext);
    if (!deferredPreview?.regeneratedDataXml) {
      return false;
    }

    modelEditorStore.setData(deferredPreview.regeneratedDataXml, {
      updateType: deferredPreview.updateType,
    });
    setRegenerationDraftEditingModel({
      modelId: activeContext.modelId,
      modelVersionId: activeContext.modelVersionId,
    });
    return true;
  },
  hasPendingNewModelDraft() {
    return workspaceStore.hasPendingNewModelDraft();
  },
  getPendingNewModelDraft() {
    return workspaceStore.getPendingNewModelDraft();
  },
  async recordGenerationAttempt(data) {
    try {
      return await modelsAPI.recordGenerationAttempt(data);
    } catch (error) {
      console.warn("Failed to record generation attempt:", error);
      return null;
    }
  },
  getPendingGenerationAttemptMeta() {
    return pendingGenerationAttemptMeta
      ? { ...pendingGenerationAttemptMeta }
      : null;
  },
  clearPendingGenerationAttemptMeta() {
    pendingGenerationAttemptMeta = null;
  },
  stagePendingNewModelDraft(modelData, options = {}) {
    if (!modelData) {
      return null;
    }
    const creationContext = resolveModelCreationContext(
      options.creationContext,
    );
    workspaceStore.setPendingNewModelDraft({
      modelData,
      creationContext,
    });
    workspaceStore.setEditingModel({ id: null });
    modelEditorStore.setData(modelData, {
      updateType: null,
    });
    return workspaceStore.getPendingNewModelDraft();
  },
  async commitPendingNewModelDraft() {
    const pendingDraft = workspaceStore.getPendingNewModelDraft();
    if (!pendingDraft) {
      return null;
    }

    const result = await this.createModelAndLink(pendingDraft.modelData, {
      creationContext: pendingDraft.creationContext,
    });
    // Record the accepted new-model generation attempt
    const meta = pendingGenerationAttemptMeta;
    pendingGenerationAttemptMeta = null;
    if (meta) {
      modelsAPI
        .recordGenerationAttempt({
          ...meta,
          result: "accepted_new_model",
          resultModelVersionId: result?.modelMeta?.latestVersionId ?? null,
        })
        .catch((e) => console.warn("Failed to record generation attempt:", e));
    }
    workspaceStore.clearPendingNewModelDraft();
    return result;
  },
  discardPendingNewModelDraft({ clearEditorData = true } = {}) {
    const hadPendingDraft = workspaceStore.hasPendingNewModelDraft();
    // Record declined new model draft attempt
    if (hadPendingDraft) {
      const meta = pendingGenerationAttemptMeta;
      pendingGenerationAttemptMeta = null;
      if (meta) {
        modelsAPI
          .recordGenerationAttempt({
            ...meta,
            result: "declined",
            resultModelVersionId: null,
          })
          .catch((e) =>
            console.warn("Failed to record generation attempt:", e),
          );
      }
    }
    workspaceStore.clearPendingNewModelDraft();
    if (hadPendingDraft) {
      workspaceStore.setEditingModel(null);
    }
    if (clearEditorData) {
      modelEditorStore.setData(null, {
        updateType: null,
      });
    } else if (hadPendingDraft) {
      modelEditorStore.setLatestUpdateType(null);
    }
    modelEditorStore.clearStatusMessage();
    return hadPendingDraft;
  },

  async refineModelByPrompt(userInput) {
    const regenerationContext = getActiveRegenerationContext();
    const { modelId: editingModelId, modelVersionId: editingModelVersionId } =
      regenerationContext || {};

    const rpstXml = modelEditorStore.getSerializedRpstData();
    const originalModelData = modelEditorStore.getSerializedData();

    const requestId = beginPendingGenerationRequest({
      type: "refinement",
      modelId: editingModelId,
      modelVersionId: editingModelVersionId,
    });
    let hasError = false;
    let hasAppliedToActiveModel = false;
    let hasDeferredPreview = false;
    try {
      pendingGenerationAttemptMeta = {
        projectId: workspaceStore.getProjectId(),
        generationType: "refinement",
        generationInputMode: "prompt",
        baseModelVersionId: editingModelVersionId,
        prompt: userInput,
      };
      const generatedModel = await this.generateModel(userInput, rpstXml);
      if (!generatedModel) {
        throw new Error("Model generation returned an empty result.");
      }

      const regeneratedModelData = generatedModel;

      const preview = {
        modelId: editingModelId,
        modelVersionId: editingModelVersionId,
        updateType: MODEL_VERSION_CHANGE_TYPE.AI_REFINEMENT,
        originalDataXml: originalModelData,
        regeneratedDataXml: regeneratedModelData,
        prompt: userInput || null,
      };
      if (isRegenerationContextActive(regenerationContext)) {
        modelEditorStore.setData(preview.regeneratedDataXml, {
          updateType: preview.updateType,
        });
        setRegenerationDraftEditingModel({
          modelId: editingModelId,
          modelVersionId: editingModelVersionId,
        });
        hasAppliedToActiveModel = true;
      } else {
        storeDeferredRegenerationPreview(preview);
        hasDeferredPreview = true;
        showDeferredRegenerationReadyMessage(editingModelId);
      }
      return {
        id: editingModelId,
        versionId: editingModelVersionId,
        data: generatedModel,
      };
    } catch (error) {
      hasError = true;
      pendingGenerationAttemptMeta = null;
      console.error("Failed to regenerate model by prompt:", error);
      if (isRegenerationContextActive(regenerationContext)) {
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

  async generateModelBySelections(additionalPrompt) {
    const regenerationContext = getActiveRegenerationContext();
    const regenerateEditingModel = !!regenerationContext;
    const originalModelData = regenerateEditingModel
      ? modelEditorStore.getSerializedData()
      : null;

    const requestId = beginPendingGenerationRequest({
      type: regenerateEditingModel ? "regeneration" : "new_model",
      modelId: regenerationContext?.modelId || null,
      modelVersionId: regenerationContext?.modelVersionId || null,
    });
    let hasError = false;
    let hasAppliedToActiveModel = false;
    let hasDeferredPreview = false;
    try {
      const selectedText = documentViewerStore.getSelectedText();
      const hasSelectionInput = !!selectedText;
      const hasPromptInput = !!additionalPrompt;
      const selectedWordsCount = countWordsSimple(selectedText) || null;
      const editingLinkForSelections = regenerateEditingModel
        ? documentViewerStore.getSerializedNewEditingModelLink()
        : null;
      const generationInput = composeSelectionGenerationInput(
        selectedText,
        additionalPrompt,
      );
      pendingGenerationAttemptMeta = {
        projectId: workspaceStore.getProjectId(),
        generationType: resolveGenerationAttemptType({
          isRegeneration: regenerateEditingModel,
          hasSelectionInput,
          hasPromptInput,
        }),
        generationInputMode: resolveGenerationInputMode({
          hasSelectionInput,
          hasPromptInput,
        }),
        baseModelVersionId: regenerationContext?.modelVersionId ?? null,
        selectedWordsCount,
        prompt: additionalPrompt || null,
      };
      const generationType = pendingGenerationAttemptMeta.generationType;
      const generatedModel = await this.generateModel(
        generationInput,
        EMPTY_MODEL,
      );
      if (!generatedModel) {
        throw new Error("Model generation returned an empty result.");
      }

      if (!regenerateEditingModel) {
        return this.stagePendingNewModelDraft(generatedModel, {
          creationContext: {
            prompt: additionalPrompt,
          },
        });
      }

      const regeneratedModelData = generatedModel;

      const preview = {
        modelId: regenerationContext.modelId,
        modelVersionId: regenerationContext.modelVersionId,
        updateType: MODEL_VERSION_CHANGE_TYPE.AI_REGENERATION,
        originalDataXml: originalModelData,
        regeneratedDataXml: regeneratedModelData,
        prompt: additionalPrompt || null,
      };
      if (isRegenerationContextActive(regenerationContext)) {
        modelEditorStore.setData(preview.regeneratedDataXml, {
          updateType: preview.updateType,
        });
        setRegenerationDraftEditingModel({
          modelId: regenerationContext.modelId,
          modelVersionId: regenerationContext.modelVersionId,
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
      pendingGenerationAttemptMeta = null;
      console.error("Failed to generate model by selections:", error);
      if (
        !regenerateEditingModel ||
        isRegenerationContextActive(regenerationContext)
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
      if (!regenerateEditingModel || hasAppliedToActiveModel) {
        modelEditorStore.clearStatusMessage();
      }
    }
  },

  async createModelAndLink(modelData, options = {}) {
    const creationContext = resolveModelCreationContext(
      options.creationContext,
    );
    const prompt = creationContext.prompt || null;

    const link = {
      documentVersionId: creationContext.documentVersionId,
      selections: cloneValue(creationContext.selections, []),
    };
    const { modelMeta: createdModelMeta, link: createdLink } =
      await modelsAPI.createModelAndLink({
        projectId: workspaceStore.getProjectId(),
        modelData,
        link,
        prompt,
      });
    modelsStore.add(createdModelMeta);
    workspaceStore.setEditingModel({
      id: createdModelMeta.id,
      versionId: createdModelMeta.latestVersionId,
      isLatest: true,
    });
    modelEditorStore.setData(modelData, {
      updateType: null,
    });
    modelsStore.addCachedVersion(createdModelMeta.latestVersionId, {
      modelId: createdModelMeta.id,
      status: "loading",
    });
    await this.ensureVersionCached(createdModelMeta.latestVersionId, {
      needData: true,
      needSvg: false,
      modelId: createdModelMeta.id,
      force: true,
    });
    documentViewerStore.setSelectedSelection(null);
    documentViewerStore.setUnlinkedSelections([]);
    documentViewerStore.setHasSelectionChanged(false);
    documentViewerStore.addLink(createdLink);
    projectGraphStore.addModelNodeAndEdge(createdModelMeta);
    return {
      modelMeta: createdModelMeta,
      link: createdLink,
    };
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
    documentViewerStore.removeLinksByModelId(modelId);
    projectGraphStore.removeModelNodeAndEdge(modelId);
    workspaceStore.setModelPopover(null);

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
    const {
      expectedModelId = null,
      expectedModelVersionId = null,
      prompt = null,
    } = options;
    const { id: modelId, versionId: modelVersionId } =
      workspaceStore.getEditingModel() || {};

    if (expectedModelId && expectedModelId !== modelId) {
      return null;
    }

    if (expectedModelVersionId && expectedModelVersionId !== modelVersionId) {
      return null;
    }

    const link =
      type === MODEL_VERSION_CHANGE_TYPE.MANUAL_SELECTIONS_UPDATE ||
      type === MODEL_VERSION_CHANGE_TYPE.AI_REGENERATION
        ? documentViewerStore.getSerializedNewEditingModelLink()
        : null;
    const selectionCount = Array.isArray(link?.selections)
      ? link.selections.length
      : 0;

    if (link?.id && selectionCount > 0) {
      syncNoSelectionsErrorIfNeeded(selectionCount, "updateEditingVersion", {
        modelId,
        modelVersionId,
        linkId: link.id,
      });
    }

    const modelData = modelEditorStore.getSerializedData();

    if (link?.id) {
      notifyLinkUpdateTriggered({
        source: "updateEditingVersion",
        linkId: link.id,
        modelVersionId,
        changeType: type,
        selectionCount,
      });
    }
    await updateModelVersionAndCache({
      modelId,
      modelVersionId,
      modelData,
      link: link,
      type,
      prompt,
    });

    if (
      [
        MODEL_VERSION_CHANGE_TYPE.MANUAL_SELECTIONS_UPDATE,
        MODEL_VERSION_CHANGE_TYPE.AI_REGENERATION,
      ].includes(type)
    ) {
      documentViewerStore.setSelectedSelection(null);
      documentViewerStore.setUnlinkedSelections([]);
      documentViewerStore.updateLink(link);
    }
  },

  async updateLinkById(linkId) {
    if (!linkId) {
      return;
    }

    const serializedLink = documentViewerStore.getSerializedLinkById(linkId);
    if (!serializedLink?.id) {
      return;
    }

    try {
      notifyLinkUpdateTriggered({
        source: "updateLinkById",
        linkId: serializedLink.id,
        modelVersionId: serializedLink.modelVersionId || null,
        changeType: "link_update",
        selectionCount: Array.isArray(serializedLink.selections)
          ? serializedLink.selections.length
          : 0,
      });
      await documentModelLinksAPI.updateLink(
        getLinkUpdatePayload(serializedLink),
      );
      const editingModelLink =
        documentViewerStore.getDisplayedEditingModelLink();
      if (editingModelLink && String(editingModelLink.id) === String(linkId)) {
        documentViewerStore.syncOriginalEditingModelSerializedSelectionsWithEditingModelLink();
      }
    } catch (error) {
      console.error(`Failed to update link ${linkId}:`, error);
    }
  },

  async updateLinkTextById(linkId, options = {}) {
    const { alertOnEmptyAfterDeletion = false } = options;
    if (!linkId) {
      return;
    }

    const serializedLink = documentViewerStore.getSerializedLinkById(linkId);
    if (!serializedLink?.id) {
      return;
    }

    const modelVersionId = serializedLink.modelVersionId;
    if (!modelVersionId) {
      await this.updateLinkById(linkId);
      return;
    }

    const selectionCount = Array.isArray(serializedLink.selections)
      ? serializedLink.selections.length
      : 0;
    if (alertOnEmptyAfterDeletion || selectionCount > 0) {
      syncNoSelectionsErrorIfNeeded(selectionCount, "updateLinkTextById", {
        modelId: serializedLink.modelId || null,
        modelVersionId: serializedLink.modelVersionId || null,
        linkId: serializedLink.id || null,
      });
    }

    try {
      const currentModelData =
        await modelsAPI.getDataByVersionId(modelVersionId);
      notifyLinkUpdateTriggered({
        source: "updateLinkTextById",
        linkId: serializedLink.id,
        modelVersionId,
        changeType: MODEL_VERSION_CHANGE_TYPE.MANUAL_SELECTIONS_UPDATE,
        selectionCount,
      });
      await modelsAPI.updateVersion(modelVersionId, {
        modelData: currentModelData,
        link: getModelVersionLinkPayload(serializedLink),
        type: MODEL_VERSION_CHANGE_TYPE.MANUAL_SELECTIONS_UPDATE,
      });

      modelsStore.addCachedVersion(modelVersionId, {
        ...(serializedLink.modelId ? { modelId: serializedLink.modelId } : {}),
        dataXml: currentModelData,
        status: "ready",
        error: null,
      });

      const editingModelVersionId = workspaceStore.getEditingModel()?.versionId;
      if (
        editingModelVersionId &&
        String(editingModelVersionId) === String(modelVersionId)
      ) {
        modelEditorStore.setData(currentModelData, {
          updateType: null,
        });
      }

      const editingModelLink =
        documentViewerStore.getDisplayedEditingModelLink();
      if (editingModelLink && String(editingModelLink.id) === String(linkId)) {
        documentViewerStore.syncOriginalEditingModelSerializedSelectionsWithEditingModelLink();
      }
    } catch (error) {
      console.error(`Failed to update link text for link ${linkId}:`, error);
    }
  },

  async syncEditingModelLinkStyles() {
    const serializedLink =
      documentViewerStore.getSerializedEditingModelLinkForStyleSync();
    if (!serializedLink?.id) {
      return;
    }

    try {
      notifyLinkUpdateTriggered({
        source: "syncEditingModelLinkStyles",
        linkId: serializedLink.id,
        modelVersionId: serializedLink.modelVersionId || null,
        changeType: "color_only",
        selectionCount: Array.isArray(serializedLink.selections)
          ? serializedLink.selections.length
          : 0,
      });
      await documentModelLinksAPI.updateLink(
        getLinkUpdatePayload(serializedLink),
      );
      documentViewerStore.updateStoredLink(serializedLink);
      documentViewerStore.setOriginalEditingModelSerializedSelections(
        serializedLink.selections || [],
      );
    } catch (error) {
      console.error("Failed to sync editing model link styles:", error);
    }
  },

  async updateEditingModelLink(options = {}) {
    const { alertOnEmptyAfterDeletion = false } = options;
    const updatedLink = documentViewerStore.getSerializedEditingModelLink();
    if (!updatedLink?.id) {
      return;
    }

    const previousSelections =
      documentViewerStore.getOriginalEditingModelSerializedSelections();
    const currentSelections = Array.isArray(updatedLink.selections)
      ? updatedLink.selections
      : [];
    const changeType = classifyLinkSelectionChange({
      previousSelections,
      currentSelections,
    });
    if (changeType === "no_change") {
      return;
    }

    if (changeType === "color_only") {
      await this.syncEditingModelLinkStyles();
      return;
    }

    try {
      notifyLinkUpdateTriggered({
        source: "updateEditingModelLink",
        linkId: updatedLink.id,
        modelVersionId: updatedLink.modelVersionId || null,
        changeType,
        selectionCount: currentSelections.length,
      });
      const { id: modelId, versionId: modelVersionId } =
        workspaceStore.getEditingModel() || {};
      if (!modelId || !modelVersionId) {
        console.warn(
          "Skipping editing model link text update: no active editing model version.",
        );
        return;
      }

      if (alertOnEmptyAfterDeletion || currentSelections.length > 0) {
        syncNoSelectionsErrorIfNeeded(
          currentSelections.length,
          "updateEditingModelLink",
          {
            modelId: updatedLink.modelId || null,
            modelVersionId: updatedLink.modelVersionId || null,
            linkId: updatedLink.id || null,
          },
        );
      }
      const modelData = modelEditorStore.getSerializedData();
      await updateModelVersionAndCache({
        modelId,
        modelVersionId,
        modelData,
        link: updatedLink,
        type: MODEL_VERSION_CHANGE_TYPE.MANUAL_SELECTIONS_UPDATE,
      });
      documentViewerStore.updateLink(updatedLink);
    } catch (error) {
      console.error("Failed to update editing model link:", error);
    }
  },
  // Model versioning
  async createModelVersion(modelId, sourceVersionId, options = {}) {
    const {
      modelData = null,
      link: explicitLink = null,
      type = null,
      allowSelectionDraftPayload = false,
      prompt = null,
    } = options || {};
    const isSelectedVersionLatest = modelsStore.isLatestVersion(
      modelId,
      sourceVersionId,
    );

    // For refinement, use the committed link (no pending unlinked selections).
    // For all other types, use the explicitly-passed link (or let buildExplicitCreateVersionRequest fall back to the new editing link).
    const resolvedExplicitLink =
      type === MODEL_VERSION_CHANGE_TYPE.AI_REFINEMENT
        ? documentViewerStore.getSerializedEditingModelLink()
        : explicitLink;

    const explicitCreateRequest =
      typeof modelData === "string" && modelData.trim()
        ? buildExplicitCreateVersionRequest({
            modelId,
            sourceVersionId,
            modelData,
            link: resolvedExplicitLink,
            type: type || MODEL_VERSION_CHANGE_TYPE.MANUAL_SELECTIONS_UPDATE,
            prompt,
          })
        : null;
    const selectionDraftCreateRequest =
      !explicitCreateRequest &&
      allowSelectionDraftPayload &&
      isSelectedVersionLatest
        ? // Draft selections must only be promoted when the caller explicitly
          // requests it; header-triggered version copies should stay pure copies.
          buildSelectionDraftCreateVersionRequest({
            modelId,
            sourceVersionId,
            type: MODEL_VERSION_CHANGE_TYPE.MANUAL_SELECTIONS_UPDATE,
          })
        : null;
    const createVersionRequest = explicitCreateRequest ||
      selectionDraftCreateRequest || {
        modelId,
        sourceVersionId,
        type,
      };

    const result = await modelsAPI.createVersion(createVersionRequest);

    const { versionMeta: version, link } = result || {};
    modelsStore.addVersion(modelId, version);
    const createdVersionId = version?.id || null;

    workspaceStore.setEditingModel({
      id: modelId,
      versionId: createdVersionId,
      isLatest: true,
    });
    await this.loadVersion(createdVersionId, {
      needSvg: true,
    });
    documentViewerStore.removeLinksByModelId(modelId);
    documentViewerStore.addLink(link);
    if (type === MODEL_VERSION_CHANGE_TYPE.AI_REGENERATION) {
      documentViewerStore.setSelectedSelection(null);
      documentViewerStore.setUnlinkedSelections([]);
    }
  },
  async loadVersion(versionId, options = {}) {
    const { needSvg = false } = options || {};
    const { id: modelId } = workspaceStore.getEditingModel() || {};
    const cached = await this.ensureVersionCached(versionId, {
      needData: true,
      needSvg,
      modelId,
    });
    if (!cached?.dataXml) {
      throw new Error(
        `Failed to resolve cached model XML for version ${versionId}`,
      );
    }

    modelEditorStore.setData(cached.dataXml, {
      updateType: null,
    });
    this.applyDeferredRegenerationPreviewForActiveEditingModel();
    syncNoSelectionsOnModelVersionLoadIfNeeded("load_model_version");
  },
};
