import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore } from "../store/index.js";

const $documentViewerPanel = $("#documentViewerPanel");
const $modelEditorPanel = $("#modelEditorPanel");

const PANEL_STATE = {
  NONE: "none",
  LATEST: "latest",
  HISTORICAL: "historical",
};

function resolveDocumentViewerState() {
  if (!workspaceStore.hasViewedDocument()) {
    return PANEL_STATE.NONE;
  }
  return workspaceStore.isViewedDocumentReadOnly()
    ? PANEL_STATE.HISTORICAL
    : PANEL_STATE.LATEST;
}

function resolveModelEditorState() {
  if (!workspaceStore.hasEditingModel()) {
    return PANEL_STATE.NONE;
  }
  return workspaceStore.isEditingModelReadOnly()
    ? PANEL_STATE.HISTORICAL
    : PANEL_STATE.LATEST;
}

function setDocumentViewerPanelState() {
  $documentViewerPanel.attr("data-state", resolveDocumentViewerState());
}

function setModelEditorPanelState() {
  $modelEditorPanel.attr("data-state", resolveModelEditorState());
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
  },
});
