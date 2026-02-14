// Workspace Store - Core workspace state
import { createDomainStore } from "./createStore.js";
import { projectsAPI } from "../../api/index.js";

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
    modelPopoverState: null,
    modelPopoverCloseTimer: null,
  }),
  {
    async init(projectId) {
      this.setProjectId(projectId);
      const project = await projectsAPI.get(projectId);
    },
    setProjectId(projectId) {
      const oldValue = this.state.projectId;
      this.state.projectId = projectId;
      this.notify({ key: "projectId", oldValue, newValue: projectId });
    },
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
    setModelPopoverParams(newValue) {
      const oldValue = this.state.modelPopoverState;
      const oldHoveredModelId = oldValue ? oldValue.modelId : null;
      const newHoveredModelId = newValue ? newValue.modelId : null;

      const activeModelId = this.getActiveModelId();
      if (
        oldHoveredModelId === newHoveredModelId &&
        newHoveredModelId !== activeModelId
      )
        return; // No change
      if (newHoveredModelId === activeModelId) {
        newValue = null; // Don't show popover for active model
      }

      this.state.modelPopoverState = newValue;
      this.notify({ key: "modelPopoverState", oldValue, newValue });
    },
    cancelCloseModelPopover() {
      if (this.state.modelPopoverCloseTimer) {
        clearTimeout(this.state.modelPopoverCloseTimer);
        this.state.modelPopoverCloseTimer = null;
      }
    },
    requestCloseModelPopover() {
      this.cancelCloseModelPopover();
      this.state.modelPopoverCloseTimer = setTimeout(() => {
        this.setModelPopoverParams(null);
        this.state.modelPopoverCloseTimer = null;
      }, 150);
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
      this.setProjectId(projectId);
      this.setActiveDocumentId(activeDocumentId);
      this.setActiveModelId(activeModelId);
    },
  },
);
