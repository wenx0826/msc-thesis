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
      modelPopover: {
        modelId: null,
        versionId: null,
        anchor: null,
        closeTimer: null, // ✨ Timer for delayed closing
        openTimer: null, // ✨ Timer for delayed opening (debounce)
        hoverSource: null, // ✨ Track which UI element triggered hover (prevents conflicts)
      },
      /* OLD: Separate top-level properties (less organized):
      modelPopover: null,
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

    const oldValue = this.state.modelPopover;
    const oldModelId = oldValue?.modelId;
    const newModelId = newValue?.modelId;
    const editingModelId = this.getEditingModelId();

    // Don't show popover for the currently active model
    if (newModelId === editingModelId) {
      newValue = null;
    }

    // ✨ NEW: If same model, just update anchor position without delay
    if (oldModelId === newModelId && newModelId) {
      this.state.modelPopover.modelId = newValue.modelId;
      this.state.modelPopover.versionId = newValue.versionId || null;
      this.state.modelPopover.anchor = newValue.anchor;
      this.state.modelPopover.hoverSource = source;
      this.notify({
        key: "modelPopover",
        oldValue,
        newValue: this.state.modelPopover,
      });
      return;
    }

    // ✨ NEW: Debounce opening (200ms delay) to prevent popover from appearing too quickly
    if (newValue) {
      const openDelayMs =
        Number.isFinite(newValue.openDelayMs) && newValue.openDelayMs >= 0
          ? newValue.openDelayMs
          : 200;
      // Track the current hover source immediately so quick mouseleave can cancel pending open.
      this.state.modelPopover.hoverSource = source;
      this.state.modelPopover.anchor = newValue.anchor;
      this.state.modelPopover.openTimer = setTimeout(() => {
        this.state.modelPopover.modelId = newValue.modelId;
        this.state.modelPopover.versionId = newValue.versionId || null;
        this.state.modelPopover.anchor = newValue.anchor;
        this.state.modelPopover.hoverSource = source;
        const newState = this.state.modelPopover;
        this.notify({
          key: "modelPopover",
          oldValue,
          newValue: newState,
        });
        this.state.modelPopover.openTimer = null;
      }, openDelayMs);
    } else {
      // Close immediately when newValue is null
      this.state.modelPopover.modelId = null;
      this.state.modelPopover.versionId = null;
      this.state.modelPopover.anchor = null;
      this.state.modelPopover.hoverSource = null;
      this.notify({
        key: "modelPopover",
        oldValue,
        newValue: this.state.modelPopover,
      });
    }
  }

  // ✨ NEW: Cancel any pending open timer
  cancelOpenModelPopover() {
    if (this.state.modelPopover.openTimer) {
      clearTimeout(this.state.modelPopover.openTimer);
      this.state.modelPopover.openTimer = null;
    }
  }

  cancelCloseModelPopover() {
    if (this.state.modelPopover.closeTimer) {
      clearTimeout(this.state.modelPopover.closeTimer);
      this.state.modelPopover.closeTimer = null;
    }
  }

  // 🔧 IMPROVED: Added source tracking to prevent different hover sources from interfering
  requestCloseModelPopover(source = "unknown") {
    const hasPendingOpen = !!this.state.modelPopover.openTimer;
    const hasVisiblePopover = !!this.state.modelPopover.modelId;
    if (!hasPendingOpen && !hasVisiblePopover) {
      return;
    }
    // ✨ NEW: Only close if request comes from the same source that opened it
    // Allow the popover itself to request close after pointer leaves it.
    if (
      source !== "popover" &&
      this.state.modelPopover.hoverSource !== source
    ) {
      return;
    }
    this.cancelOpenModelPopover();
    this.cancelCloseModelPopover();
    if (!hasVisiblePopover) {
      this.state.modelPopover.versionId = null;
      this.state.modelPopover.anchor = null;
      this.state.modelPopover.hoverSource = null;
      return;
    }
    // ✨ NEW: Increased delay to 300ms for better UX (less flickering)
    this.state.modelPopover.closeTimer = setTimeout(() => {
      this.setModelPopoverParams(null);
      this.state.modelPopover.closeTimer = null;
    }, 300); // OLD: was 150ms
  }
}

export default new WorkspaceStore();
