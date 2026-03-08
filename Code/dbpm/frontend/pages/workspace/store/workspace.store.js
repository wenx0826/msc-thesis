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
        isLatest: null,
      },
      editingModel: {
        id: null,
        versionId: null,
        isLatest: null,
      },
      // 🔧 IMPROVED: Consolidated all popover state into one object for better cohesion
      modelPopover: {
        target: null, // { id, versionId }
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
    const normalizedValue = newValue
      ? {
          id: newValue.id ?? null,
          versionId: newValue.versionId ?? null,
          isLatest:
            typeof newValue.isLatest === "boolean" ? newValue.isLatest : null,
        }
      : {
          id: null,
          versionId: null,
          isLatest: null,
        };
    if (
      oldValue?.id === normalizedValue?.id &&
      oldValue?.versionId === normalizedValue?.versionId &&
      oldValue?.isLatest === normalizedValue?.isLatest
    )
      return;
    this.state.viewedDocument = normalizedValue;
    this.notify({
      key: "viewedDocument",
      oldValue,
      newValue: normalizedValue,
    });
  }
  getViewedDocument() {
    return this.state.viewedDocument;
  }
  getViewedDocumentId() {
    return this.state.viewedDocument.id;
  }
  hasViewedDocument() {
    return !!this.getViewedDocumentId();
  }
  isViewedDocumentReadOnly() {
    return this.hasViewedDocument()
      ? !this.getViewedDocument().isLatest
      : false;
  }
  setEditingModel(newValue) {
    const oldValue = this.state.editingModel;
    const normalizedValue = newValue
      ? {
          id: newValue.id ?? null,
          versionId: newValue.versionId ?? null,
          isLatest:
            typeof newValue.isLatest === "boolean" ? newValue.isLatest : null,
        }
      : {
          id: null,
          versionId: null,
          isLatest: null,
        };
    if (
      oldValue?.id === normalizedValue?.id &&
      oldValue?.versionId === normalizedValue?.versionId &&
      oldValue?.isLatest === normalizedValue?.isLatest
    )
      return;
    this.state.editingModel = normalizedValue;
    this.notify({
      key: "editingModel",
      oldValue,
      newValue: normalizedValue,
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
  isEditingModelReadOnly() {
    return this.hasEditingModel() ? !this.getEditingModel().isLatest : false;
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

  // Popover payload format:
  // {
  //   target: { id, versionId? },
  //   anchor,
  //   source?,
  //   openDelayMs?
  // }
  setModelPopoverParams(newValue) {
    const normalizedValue = newValue
      ? {
          ...newValue,
          target: newValue.target?.id
            ? {
                id: newValue.target.id,
                versionId: newValue.target.versionId || null,
              }
            : null,
          source: newValue.source || "unknown",
        }
      : null;

    // ✨ NEW: Cancel any pending timers to prevent race conditions
    this.cancelCloseModelPopover();
    this.cancelOpenModelPopover();

    const oldValue = this.state.modelPopover;
    const oldModelId = oldValue?.target?.id;
    const newModelId = normalizedValue?.target?.id;
    const editingModelId = this.getEditingModelId();

    if (normalizedValue && !normalizedValue.target?.id) {
      console.error("setModelPopoverParams requires target.id");
      return;
    }

    // Don't show popover for the currently active model
    if (newModelId === editingModelId) {
      this.state.modelPopover.target = null;
      this.state.modelPopover.anchor = null;
      this.state.modelPopover.hoverSource = null;
      this.notify({
        key: "modelPopover",
        oldValue,
        newValue: this.state.modelPopover,
      });
      return;
    }

    // ✨ NEW: If same model, just update anchor position without delay
    if (oldModelId === newModelId && newModelId) {
      this.state.modelPopover.target = {
        id: normalizedValue.target.id,
        versionId: normalizedValue.target.versionId || null,
      };
      this.state.modelPopover.anchor = normalizedValue.anchor;
      this.state.modelPopover.hoverSource = normalizedValue.source;
      this.notify({
        key: "modelPopover",
        oldValue,
        newValue: this.state.modelPopover,
      });
      return;
    }

    // ✨ NEW: Debounce opening (200ms delay) to prevent popover from appearing too quickly
    if (normalizedValue) {
      const openDelayMs =
        Number.isFinite(normalizedValue.openDelayMs) &&
        normalizedValue.openDelayMs >= 0
          ? normalizedValue.openDelayMs
          : 200;
      // Track the current hover source immediately so quick mouseleave can cancel pending open.
      this.state.modelPopover.hoverSource = normalizedValue.source;
      this.state.modelPopover.anchor = normalizedValue.anchor;
      this.state.modelPopover.openTimer = setTimeout(() => {
        this.state.modelPopover.target = {
          id: normalizedValue.target.id,
          versionId: normalizedValue.target.versionId || null,
        };
        this.state.modelPopover.anchor = normalizedValue.anchor;
        this.state.modelPopover.hoverSource = normalizedValue.source;
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
      this.state.modelPopover.target = null;
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

  requestCloseModelPopover(_source = "unknown") {
    const hasPendingOpen = !!this.state.modelPopover.openTimer;
    const hasVisiblePopover = !!this.state.modelPopover.target?.id;
    if (!hasPendingOpen && !hasVisiblePopover) {
      return;
    }
    this.cancelOpenModelPopover();
    this.cancelCloseModelPopover();
    if (!hasVisiblePopover) {
      this.state.modelPopover.target = null;
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
