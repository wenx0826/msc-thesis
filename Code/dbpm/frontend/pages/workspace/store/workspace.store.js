// Workspace Store - Core workspace state
import { createDomainStore } from "./createStore.js";
import { projectsAPI } from "../../../api/index.js";

export const workspaceStore = Object.assign(
  createDomainStore({
    status: null, // 'loading', 'ready', 'error'
    projectId: null,
    activeDocumentId: null,
    activeModelId: null,
    hoveredModelId: null,
    llmModel: "gemini-2.0-flash",
    theme: null,
    project: {},
    activeDocument: {
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
    async init(projectId) {
      this.setProjectId(projectId);
      const project = await projectsAPI.get(projectId);
    },
    // setProjectId(projectId) {
    //   const oldValue = this.state.projectId;
    //   this.state.projectId = projectId;
    // },
    getProjectId() {
      return this.state.projectId;
    },
    getActiveDocumentId() {
      return this.state.activeDocumentId;
    },
    getActiveModelId() {
      return this.state.activeModelId;
    },
    hasActiveModel() {
      return this.state.activeModelId != null;
    },
    getLlmModel() {
      return this.state.llmModel;
    },
    setStatus(status) {
      this.state.status = status;
      this.notify({ key: "status", newValue: status });
    },
    setActiveModelId(newValue) {
      const oldValue = this.getActiveModelId();
      this.state.activeModelId = newValue;
      this.notify({ key: "activeModelId", oldValue, newValue });
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
      const activeModelId = this.getActiveModelId();

      // Don't show popover for the currently active model
      if (newModelId === activeModelId) {
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
        newHoveredModelId !== activeModelId
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
    setActiveDocumentId(newValue) {
      const oldValue = this.getActiveDocumentId();
      this.state.activeDocumentId = newValue;
      this.notify({ key: "activeDocumentId", oldValue, newValue });
    },
    setLlmModel(llmModel) {
      this.state.llmModel = llmModel;
    },
    setTheme(theme) {
      this.state.theme = theme;
    },
    setWorkspace({ projectId, activeDocumentId, activeModelId }) {
      this.state.projectId = projectId;
      // this.setProjectId(projectId);
      this.setActiveDocumentId(activeDocumentId);
      this.setActiveModelId(activeModelId);
    },
  },
);
