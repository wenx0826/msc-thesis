import { Store } from "../../../shared/utils/store.js";

class WorkspaceStore extends Store {
  constructor() {
    super({
      status: null, // 'loading', 'ready', 'error'
      projectId: null,
      llmModel: "gemini-2.0-flash",
      theme: null,
      viewedDocument: null, // null | { id, versionId, isLatest }
      // `editingModel`: null | { id?, versionId?, sourceVersionId?, isLatest? }
      // null => no model selected / new model draft
      // { id, versionId:null, sourceVersionId } => regeneration draft
      // { id, versionId, isLatest } => existing version
      editingModel: null,
      // `pendingNewModelDraft`: null | { modelData, creationContext }
      pendingNewModelDraft: null,
      modelPopover: null, // null | { target: { id, versionId? }, anchor, source?, openDelayMs?
    });
  }
  set({ projectId, viewedDocument, editingModel }) {
    if (projectId !== undefined) {
      this.state.projectId = projectId;
    }
    if (viewedDocument !== undefined) this.setViewedDocument(viewedDocument);
    if (editingModel !== undefined) this.setEditingModel(editingModel);
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
      oldValue?.versionId === newValue?.versionId &&
      oldValue?.isLatest === newValue?.isLatest
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
    return this.state.viewedDocument?.id ?? null;
  }
  hasViewedDocument() {
    return !!this.getViewedDocumentId();
  }
  isViewedDocumentReadOnly() {
    return this.hasViewedDocument()
      ? !this.getViewedDocument()?.isLatest
      : false;
  }
  setEditingModel(newValue) {
    const oldValue = this.state.editingModel;

    if (
      oldValue?.id === newValue?.id &&
      oldValue?.versionId === newValue?.versionId &&
      oldValue?.sourceVersionId === newValue?.sourceVersionId &&
      oldValue?.isLatest === newValue?.isLatest
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
    return this.state.editingModel?.id ?? null;
  }
  getEditingModelVersionId() {
    return this.state.editingModel?.versionId ?? null;
  }
  getEditingModelSourceVersionId() {
    return this.state.editingModel?.sourceVersionId ?? null;
  }
  hasEditingModel() {
    return !!this.getEditingModelId();
  }
  isEditingModelNewModelDraft() {
    return this.state.pendingNewModelDraft !== null;
  }
  isEditingModelRegenerationDraft() {
    const editingModel = this.getEditingModel();
    return !!editingModel?.id && !editingModel.versionId;
  }
  isEditingModelDraft() {
    return (
      this.isEditingModelNewModelDraft() ||
      this.isEditingModelRegenerationDraft()
    );
  }
  isEditingModelReadOnly() {
    return this.hasEditingModel() ? !this.getEditingModel()?.isLatest : false;
  }
  hasPendingNewModelDraft() {
    return this.state.pendingNewModelDraft !== null;
  }
  getPendingNewModelDraft() {
    const draft = this.state.pendingNewModelDraft;
    if (!draft) return null;
    return {
      ...draft,
      creationContext: {
        ...draft.creationContext,
        selections: draft.creationContext?.selections
          ? JSON.parse(JSON.stringify(draft.creationContext.selections))
          : [],
      },
    };
  }
  setPendingNewModelDraft(draft) {
    const oldValue = this.state.pendingNewModelDraft;
    this.state.pendingNewModelDraft = draft ?? null;
    this.notify({
      key: "pendingNewModelDraft",
      oldValue,
      newValue: this.state.pendingNewModelDraft,
    });
  }
  clearPendingNewModelDraft() {
    this.setPendingNewModelDraft(null);
  }
  setStatus(status) {
    this.state.status = status;
    this.notify({ key: "status", newValue: status });
  }

  setModelPopover(newValue) {
    const oldValue = this.state.modelPopover;
    this.state.modelPopover = newValue;
    this.notify({
      key: "modelPopover",
      oldValue,
      newValue,
    });
  }
}

export default new WorkspaceStore();
