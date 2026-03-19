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
  INITIAL_DRAFT: "initial-draft",
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
  if (workspaceStore.isEditingModelDraft()) {
    return workspaceStore.hasEditingModel()
      ? MODEL_EDITOR_STATE.REGENERATION_DRAFT
      : MODEL_EDITOR_STATE.INITIAL_DRAFT;
  }
  if (!workspaceStore.hasEditingModel()) {
    return MODEL_EDITOR_STATE.NONE;
  }
  return workspaceStore.isEditingModelReadOnly()
    ? MODEL_EDITOR_STATE.HISTORICAL
    : MODEL_EDITOR_STATE.LATEST;
}

function setDocumentViewerState() {
  $documentViewerPanel.attr("data-document-state", getDocumentViewerState());
}

function setModelEditorState() {
  $modelEditorPanel.attr("data-model-state", getModelEditorState());
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
          break;
        default:
          break;
      }
    });
  },
});
