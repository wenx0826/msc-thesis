import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore } from "../store/index.js";

const $documentViewerPanel = $("#documentViewerPanel");
const $modelEditorPanel = $("#modelEditorPanel");

const DOCUMENT_VIEWER_STATE = {
  NONE: "none",
  LATEST: "latest",
  HISTORICAL: "historical",
};

const MODEL_EDITOR_STATE = {
  NONE: "none",
  LATEST: "latest",
  HISTORICAL: "historical",
  NEW_MODEL_DRAFT: "new-model-draft",
  REGENERATION_DRAFT: "regeneration-draft",
};

function getDocumentViewerState() {
  if (!workspaceStore.hasViewedDocument()) {
    return DOCUMENT_VIEWER_STATE.NONE;
  }
  return workspaceStore.isViewedDocumentReadOnly()
    ? DOCUMENT_VIEWER_STATE.HISTORICAL
    : DOCUMENT_VIEWER_STATE.LATEST;
}

function getModelEditorState() {
  if (workspaceStore.isEditingModelNewModelDraft()) {
    return MODEL_EDITOR_STATE.NEW_MODEL_DRAFT;
  }
  if (workspaceStore.isEditingModelRegenerationDraft()) {
    return MODEL_EDITOR_STATE.REGENERATION_DRAFT;
  }
  if (!workspaceStore.hasEditingModel()) {
    return MODEL_EDITOR_STATE.NONE;
  }
  return workspaceStore.isEditingModelReadOnly()
    ? MODEL_EDITOR_STATE.HISTORICAL
    : MODEL_EDITOR_STATE.LATEST;
}

function syncDocumentViewerState() {
  $documentViewerPanel.attr("data-document-state", getDocumentViewerState());
}

function syncModelEditorState() {
  $modelEditorPanel.attr("data-model-state", getModelEditorState());
}

createUI({
  setup: () => {},
  subscribeStores: () => {
    workspaceStore.subscribe(({ key }) => {
      switch (key) {
        case "viewedDocument":
          syncDocumentViewerState();
          break;
        case "editingModel":
          syncModelEditorState();
          break;
        default:
          break;
      }
    });
  },
});
