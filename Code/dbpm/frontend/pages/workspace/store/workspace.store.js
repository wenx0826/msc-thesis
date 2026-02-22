import { createStore } from "../../../shared/utils/store.js";

export default Object.assign(
  createStore({
    status: null, // 'loading', 'ready', 'error'
    projectId: null,
    hoveredModelId: null,
    llmModel: "gemini-2.0-flash",
    theme: null,
    displayedDocument: {
      id: null,
      versionId: null,
    },
    displayedModel: {
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
  }),
  {
    // setProjectId(projectId) {
    //   const oldValue = this.state.projectId;
    //   this.state.projectId = projectId;
    // },
    getProjectId() {
      return this.state.projectId;
    },
    getDisplayedDocument() {
      return this.state.displayedDocument;
    },
    getDisplayedModel() {
      return this.state.displayedModel;
    },
    hasDisplayedModel() {
      return this.state.displayedModel.id != null;
    },
    getLlmModel() {
      return this.state.llmModel;
    },
    setStatus(status) {
      this.state.status = status;
      this.notify({ key: "status", newValue: status });
    },

    setHoveredModelId(newValue) {
      const oldValue = this.state.hoveredModelId;
      if (oldValue === newValue) return; // No change
      this.state.hoveredModelId = newValue;
      this.notify({ key: "hoveredModelId", oldValue, newValue });
    },
    // 🔧 IMPROVED: Added source tracking and debouncing to prevent flickering
    setModelPopoverParams(newValue, source = "unknown") {
      // ✨ NEW: Cancel any pending timers to prevent race conditions
      this.cancelCloseModelPopover();
      this.cancelOpenModelPopover();

      const oldValue = this.state.modelPopoverState;
      const oldModelId = oldValue?.modelId;
      const newModelId = newValue?.modelId;
      const displayModelId = this.getDisplayedModelId();

      // Don't show popover for the currently active model
      if (newModelId === displayModelId) {
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

      /* OLD CODE - Removed debouncing logic:
      const oldHoveredModelId = oldValue ? oldValue.modelId : null;
      const newHoveredModelId = newValue ? newValue.modelId : null;

      if (
        oldHoveredModelId === newHoveredModelId &&
        newHoveredModelId !== displayModelId
      )
        return; // No change

      this.state.modelPopoverState = newValue;
      this.notify({ key: "modelPopoverState", oldValue, newValue });
      */
    },
    // ✨ NEW: Cancel any pending open timer
    cancelOpenModelPopover() {
      if (this.state.modelPopoverState.openTimer) {
        clearTimeout(this.state.modelPopoverState.openTimer);
        this.state.modelPopoverState.openTimer = null;
      }
    },
    cancelCloseModelPopover() {
      if (this.state.modelPopoverState.closeTimer) {
        clearTimeout(this.state.modelPopoverState.closeTimer);
        this.state.modelPopoverState.closeTimer = null;
      }
    },
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

      /* OLD CODE - No source tracking:
      this.cancelCloseModelPopover();
      this.state.modelPopoverCloseTimer = setTimeout(() => {
        this.setModelPopoverParams(null);
        this.state.modelPopoverCloseTimer = null;
      }, 150);
      */
    },
    setDisplayedDocument(newValue) {
      const oldValue = this.state.displayedDocument;
      if (
        oldValue?.id === newValue?.id &&
        oldValue?.versionId === newValue?.versionId
      )
        return;
      this.state.displayedDocument = newValue;
      this.notify({
        key: "displayedDocument",
        oldValue,
        newValue,
      });
    },
    setDisplayedModel(newValue) {
      const oldValue = this.state.displayedModel;
      if (
        oldValue?.id === newValue?.id &&
        oldValue?.versionId === newValue?.versionId
      )
        return;
      this.state.displayedModel = newValue;
      this.notify({
        key: "displayedModel",
        oldValue,
        newValue,
      });
    },
    setLlmModel(llmModel) {
      this.state.llmModel = llmModel;
    },
    setTheme(theme) {
      this.state.theme = theme;
    },
    set({ projectId, displayedDocument, activeModel }) {
      this.state.projectId = projectId;
      if (displayedDocument) this.setDisplayedDocument(displayedDocument);
      if (activeModel) this.setActiveModel(activeModel);
    },
  },
);
