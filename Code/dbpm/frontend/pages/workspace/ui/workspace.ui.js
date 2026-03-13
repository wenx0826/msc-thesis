import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore } from "../store/index.js";

const $documentViewerPanel = $("#documentViewerPanel");
const $modelEditorPanel = $("#modelEditorPanel");

const DOCUMENT_VIEWER_PANEL_STATE = {
  NONE: "none",
  LATEST: "latest",
  HISTORICAL: "historical",
};

const MODEL_EDITOR_PANEL_STATE = {
  NONE: "none",
  LATEST: "latest",
  HISTORICAL: "historical",
  DRAFT: "draft",
};

const MODEL_EDITOR_PENDING_DRAFT_TYPE = {
  INITIAL: "initial",
  REGENERATION: "regeneration",
};

function resolveDocumentViewerPanelState() {
  if (!workspaceStore.hasViewedDocument()) {
    return DOCUMENT_VIEWER_PANEL_STATE.NONE;
  }
  return workspaceStore.isViewedDocumentReadOnly()
    ? DOCUMENT_VIEWER_PANEL_STATE.HISTORICAL
    : DOCUMENT_VIEWER_PANEL_STATE.LATEST;
}

function resolveModelEditorPanelState() {
  if (workspaceStore.isEditingModelDraft()) {
    return MODEL_EDITOR_PANEL_STATE.DRAFT;
  }
  if (!workspaceStore.hasEditingModel()) {
    return MODEL_EDITOR_PANEL_STATE.NONE;
  }
  return workspaceStore.isEditingModelReadOnly()
    ? MODEL_EDITOR_PANEL_STATE.HISTORICAL
    : MODEL_EDITOR_PANEL_STATE.LATEST;
}

function resolveModelEditorPendingDraftType() {
  if (!workspaceStore.isEditingModelDraft()) {
    return null;
  }

  if (workspaceStore.hasEditingModel()) {
    return MODEL_EDITOR_PENDING_DRAFT_TYPE.REGENERATION;
  }

  return MODEL_EDITOR_PENDING_DRAFT_TYPE.INITIAL;
}

function setDocumentViewerPanelState() {
  $documentViewerPanel.attr("data-view-state", resolveDocumentViewerPanelState());
}

function setModelEditorPanelState() {
  $modelEditorPanel.attr("data-view-state", resolveModelEditorPanelState());
}

function setModelEditorPendingDraftType() {
  const pendingDraftType = resolveModelEditorPendingDraftType();
  if (pendingDraftType) {
    $modelEditorPanel.attr("data-pending-draft-type", pendingDraftType);
  } else {
    $modelEditorPanel.removeAttr("data-pending-draft-type");
  }
}

createUI({
  setup: () => {
    setDocumentViewerPanelState();
    setModelEditorPanelState();
    setModelEditorPendingDraftType();
  },
  subscribeStores: () => {
    workspaceStore.subscribe((_, { key }) => {
      switch (key) {
        case "viewedDocument":
          setDocumentViewerPanelState();
          break;
        case "editingModel":
          setModelEditorPanelState();
          setModelEditorPendingDraftType();
          break;
        default:
          break;
      }
    });

  },
});
