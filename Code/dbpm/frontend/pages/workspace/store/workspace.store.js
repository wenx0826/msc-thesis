import { Store } from "../../../shared/utils/store.js";

class WorkspaceStore extends Store {
  constructor() {
    super({
      status: null, // 'loading', 'ready', 'error'
      projectId: null,
      hoveredModelId: null,
      llmModel: "gemini-2.0-flash",
      theme: null,
      viewedDocument: {
        id: null,
        versionId: null,
      },
      editingModel: {
        id: null,
        versionId: null,
      },
      // 🔧 IMPROVED: Consolidated all popover state into one object for better cohesion
      modelPopoverState: {
        modelId: null,
        anchor: null,
        closeTimer: null, // ✨ Timer for delayed closing
        openTimer: null, // ✨ Timer for delayed opening (debounce)
        hoverSource: null, // ✨ Track which UI element triggered hover (prevents conflicts)
      },
      /* OLD: Separate top-level properties (less organized):
      modelPopoverState: null,
      modelPopoverCloseTimer: null,
      modelPopoverOpenTimer: null,
      modelPopoverHoverSource: null,
      */
    });
  }
  set({ projectId, viewedDocument, editingModel }) {
    this.state.projectId = projectId;
    if (viewedDocument) this.setViewedDocument(viewedDocument);
    if (editingModel) this.setEditingModel(editingModel);
  }
  getProjectId() {
    return this.state.projectId;
  }
  setLlmModel(llmModel) {
    this.state.llmModel = llmModel;
  }
  getLlmModel() {
    return this.state.llmModel;
  }
  setTheme(theme) {
    this.state.theme = theme;
  }
  setViewedDocument(newValue) {
    const oldValue = this.state.viewedDocument;
    if (
      oldValue?.id === newValue?.id &&
      oldValue?.versionId === newValue?.versionId
    )
      return;
    this.state.viewedDocument = newValue;
    this.notify({
      key: "viewedDocument",
      oldValue,
      newValue,
    });
  }
  getViewedDocument() {
    return this.state.viewedDocument;
  }
  getViewedDocumentId() {
    return this.state.viewedDocument.id;
  }
  setEditingModel(newValue) {
    const oldValue = this.state.editingModel;
    if (
      oldValue.id === newValue.id &&
      oldValue.versionId === newValue.versionId
    )
      return;
    this.state.editingModel = newValue;
    this.notify({
      key: "editingModel",
      oldValue,
      newValue,
    });
  }
  getEditingModel() {
    return this.state.editingModel;
  }
  getEditingModelId() {
    return this.state.editingModel.id;
  }
  hasEditingModel() {
    return !!this.getEditingModelId();
  }

  // Legacy compatibility wrappers
  getDisplayedDocument() {
    return this.getViewedDocument();
  }

  getDisplayedDocumentId() {
    return this.getViewedDocumentId();
  }

  getDisplayedModel() {
    return this.getEditingModel();
  }

  getDisplayedModelId() {
    return this.getEditingModelId();
  }

  hasDisplayedModel() {
    return this.hasEditingModel();
  }

  setStatus(status) {
    this.state.status = status;
    this.notify({ key: "status", newValue: status });
  }

  setHoveredModelId(newValue) {
    const oldValue = this.state.hoveredModelId;
    if (oldValue === newValue) return; // No change
    this.state.hoveredModelId = newValue;
    this.notify({ key: "hoveredModelId", oldValue, newValue });
  }

  // 🔧 IMPROVED: Added source tracking and debouncing to prevent flickering
  setModelPopoverParams(newValue, source = "unknown") {
    // ✨ NEW: Cancel any pending timers to prevent race conditions
    this.cancelCloseModelPopover();
    this.cancelOpenModelPopover();

    const oldValue = this.state.modelPopoverState;
    const oldModelId = oldValue?.modelId;
    const newModelId = newValue?.modelId;
    const editingModelId = this.getEditingModelId();

    // Don't show popover for the currently active model
    if (newModelId === editingModelId) {
      newValue = null;
    }

    // ✨ NEW: If same model, just update anchor position without delay
    if (oldModelId === newModelId && newModelId) {
      this.state.modelPopoverState.modelId = newValue.modelId;
      this.state.modelPopoverState.anchor = newValue.anchor;
      this.state.modelPopoverState.hoverSource = source;
      this.notify({
        key: "modelPopoverState",
        oldValue,
        newValue: this.state.modelPopoverState,
      });
      return;
    }

    // ✨ NEW: Debounce opening (200ms delay) to prevent popover from appearing too quickly
    if (newValue) {
      this.state.modelPopoverState.openTimer = setTimeout(() => {
        this.state.modelPopoverState.modelId = newValue.modelId;
        this.state.modelPopoverState.anchor = newValue.anchor;
        this.state.modelPopoverState.hoverSource = source;
        const newState = this.state.modelPopoverState;
        this.notify({
          key: "modelPopoverState",
          oldValue,
          newValue: newState,
        });
        this.state.modelPopoverState.openTimer = null;
      }, 200);
    } else {
      // Close immediately when newValue is null
      this.state.modelPopoverState.modelId = null;
      this.state.modelPopoverState.anchor = null;
      this.state.modelPopoverState.hoverSource = null;
      this.notify({
        key: "modelPopoverState",
        oldValue,
        newValue: this.state.modelPopoverState,
      });
    }
  }

  // ✨ NEW: Cancel any pending open timer
  cancelOpenModelPopover() {
    if (this.state.modelPopoverState.openTimer) {
      clearTimeout(this.state.modelPopoverState.openTimer);
      this.state.modelPopoverState.openTimer = null;
    }
  }

  cancelCloseModelPopover() {
    if (this.state.modelPopoverState.closeTimer) {
      clearTimeout(this.state.modelPopoverState.closeTimer);
      this.state.modelPopoverState.closeTimer = null;
    }
  }

  // 🔧 IMPROVED: Added source tracking to prevent different hover sources from interfering
  requestCloseModelPopover(source = "unknown") {
    // ✨ NEW: Only close if request comes from the same source that opened it
    if (this.state.modelPopoverState.hoverSource !== source) {
      return;
    }
    this.cancelOpenModelPopover();
    this.cancelCloseModelPopover();
    // ✨ NEW: Increased delay to 300ms for better UX (less flickering)
    this.state.modelPopoverState.closeTimer = setTimeout(() => {
      this.setModelPopoverParams(null);
      this.state.modelPopoverState.closeTimer = null;
    }, 300); // OLD: was 150ms
  }
}

export default new WorkspaceStore();
