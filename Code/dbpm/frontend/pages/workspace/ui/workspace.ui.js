import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore } from "../store/index.js";

const $documentViewerPanel = $("#documentViewerPanel");
const $modelEditorPanel = $("#modelEditorPanel");

const DOCUMENT_VIEWER_STATE = {
  NONE: "none",
  LATEST: "latest",
  LATEST_EDITING_MODEL: "latest-editing-model",
  HISTORICAL: "historical",
};

const MODEL_EDITOR_STATE = {
  NONE: "none",
  LATEST: "latest",
  HISTORICAL: "historical",
  DRAFT: "draft",
};

const MODEL_EDITOR_PENDING_DRAFT_ORIGIN = {
  INITIAL: "initial",
  REGENERATION: "regeneration",
};

function getDocumentViewerState() {
  if (!workspaceStore.hasViewedDocument()) {
    return DOCUMENT_VIEWER_STATE.NONE;
  }
  if (
    !workspaceStore.isViewedDocumentReadOnly() &&
    workspaceStore.hasEditingModel()
  ) {
    return DOCUMENT_VIEWER_STATE.LATEST_EDITING_MODEL;
  }
  return workspaceStore.isViewedDocumentReadOnly()
    ? DOCUMENT_VIEWER_STATE.HISTORICAL
    : DOCUMENT_VIEWER_STATE.LATEST;
}

function getModelEditorState() {
  if (workspaceStore.isEditingModelDraft()) {
    return MODEL_EDITOR_STATE.DRAFT;
  }
  if (!workspaceStore.hasEditingModel()) {
    return MODEL_EDITOR_STATE.NONE;
  }
  return workspaceStore.isEditingModelReadOnly()
    ? MODEL_EDITOR_STATE.HISTORICAL
    : MODEL_EDITOR_STATE.LATEST;
}

function getModelEditorPendingDraftOrigin() {
  if (!workspaceStore.isEditingModelDraft()) {
    return null;
  }

  if (workspaceStore.hasEditingModel()) {
    return MODEL_EDITOR_PENDING_DRAFT_ORIGIN.REGENERATION;
  }

  return MODEL_EDITOR_PENDING_DRAFT_ORIGIN.INITIAL;
}

function setDocumentViewerState() {
  $documentViewerPanel.attr("data-document-state", getDocumentViewerState());
}

function setModelEditorState() {
  $modelEditorPanel.attr("data-model-state", getModelEditorState());
}

function setModelEditorPendingDraftOrigin() {
  const pendingDraftOrigin = getModelEditorPendingDraftOrigin();
  if (pendingDraftOrigin) {
    $modelEditorPanel.attr("data-pending-draft-origin", pendingDraftOrigin);
  } else {
    $modelEditorPanel.removeAttr("data-pending-draft-origin");
  }
}

createUI({
  setup: () => {},
  subscribeStores: () => {
    workspaceStore.subscribe((_, { key }) => {
      switch (key) {
        case "viewedDocument":
          setDocumentViewerState();
          break;
        case "editingModel":
          setModelEditorState();
          setModelEditorPendingDraftOrigin();
          break;
        default:
          break;
      }
    });
  },
});
