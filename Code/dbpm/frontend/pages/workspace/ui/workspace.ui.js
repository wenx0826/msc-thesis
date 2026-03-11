import { createUI } from "../../../shared/utils/ui.js";
import { Constants } from "../../../constants.js";
import { modelEditorStore, workspaceStore } from "../store/index.js";

const $documentViewerPanel = $("#documentViewerPanel");
const $modelEditorPanel = $("#modelEditorPanel");
const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;

const DOCUMENT_VIEWER_PANEL_STATE = {
  NONE: "none",
  LATEST: "latest",
  HISTORICAL: "historical",
};

const MODEL_EDITOR_PANEL_STATE = {
  NONE: "none",
  LATEST: "latest",
  HISTORICAL: "historical",
  GENERATING: "generating",
  INITIAL_GENERATION_DRAFT: "initial_generation_draft",
  REGENERATION_DRAFT: "regeneration_draft",
};

function isRegenerationUpdateType(updateType) {
  return [
    MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT,
    MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
  ].includes(updateType);
}

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
    return MODEL_EDITOR_PANEL_STATE.INITIAL_GENERATION_DRAFT;
  }
  if (!workspaceStore.hasEditingModel()) {
    return MODEL_EDITOR_PANEL_STATE.NONE;
  }
  if (isRegenerationUpdateType(modelEditorStore.getLatestUpdateType())) {
    return MODEL_EDITOR_PANEL_STATE.REGENERATION_DRAFT;
  }
  if (
    modelEditorStore.getIsGenerating() &&
    workspaceStore.hasEditingModel() &&
    !workspaceStore.isEditingModelReadOnly()
  ) {
    return MODEL_EDITOR_PANEL_STATE.GENERATING;
  }
  return workspaceStore.isEditingModelReadOnly()
    ? MODEL_EDITOR_PANEL_STATE.HISTORICAL
    : MODEL_EDITOR_PANEL_STATE.LATEST;
}

function setDocumentViewerPanelState() {
  $documentViewerPanel.attr("data-state", resolveDocumentViewerPanelState());
}

function setModelEditorPanelState() {
  $modelEditorPanel.attr("data-state", resolveModelEditorPanelState());
}

createUI({
  setup: () => {
    setDocumentViewerPanelState();
    setModelEditorPanelState();
  },
  subscribeStores: () => {
    workspaceStore.subscribe((_, { key }) => {
      switch (key) {
        case "viewedDocument":
          setDocumentViewerPanelState();
          break;
        case "editingModel":
          setModelEditorPanelState();
          break;
        default:
          break;
      }
    });

    modelEditorStore.subscribe((_, { key }) => {
      if (key === "latestUpdateType" || key === "isGenerating") {
        setModelEditorPanelState();
      }
    });
  },
});
