window.Store = {
  state: {
    traces: [],
    documentList: [],
    activeDocumentId: null,
    models: [],
    activeModel: null,
    temporarySelections: [],
  },
  // Methods to manipulate the store

  // traces
  getTraces() {
    return this.state.traces;
  },
  addTrace(trace) {
    this.state.traces.push(trace);
  },
  addTraces(newTraces) {
    this.state.traces = [...this.state.traces, ...newTraces];
  },
  setTraces(traces) {
    this.state.traces = traces;
  },

  // documentList
  setDocumentList(docList) {
    this.state.documentList = docList;
  },
  getDocumentList() {
    return this.state.documentList;
  },
  // document
  getDocumentTraces(docId) {
    return this.state.traces.filter((trace) => trace.document_id == docId);
  },
  getDoucmentModels(docId) {
    const docTraces = this.getDocumentTraces(docId);
    const modelIds = docTraces.map((trace) => trace.model_id);
    return this.state.models.filter((model) => modelIds.includes(model.id));
  },
  getDocumentNameById(docId) {
    const doc = this.state.documentList.find((d) => d.id == docId);
    return doc ? doc.name : "Unknown Document";
  },
  // activeDocument
  setActiveDocumentId(docId) {
    var currentActiveDocId = this.state.activeDocumentId;
    if (docId && docId != currentActiveDocId) {
      this.state.activeDocumentId = docId;
      document.dispatchEvent(
        new CustomEvent("store:active-document-id-changed")
      );
    }
  },
  getActiveDocumentId() {
    return this.state.activeDocumentId;
  },
  getActiveDocumentTraces() {
    const activeDocumentId = this.getActiveDocumentId();
    return activeDocumentId
      ? this.state.traces.filter(
          (trace) => trace.document_id == activeDocumentId
        )
      : [];
  },
  // models
  addModel(model) {
    this.state.models.push(model);
  },
  getModels() {
    return this.state.models;
  },
  getModelNameById(modelId) {
    const model = this.state.models.find((m) => m.id == modelId);
    return model ? model.name : `Model ${modelId}`;
  },
  // activeModel
  setActiveModel(model) {
    this.state.activeModel = model;
  },
  getActiveModel() {
    return this.state.activeModel;
  },
  getActiveModelId() {
    return this.state.activeModel ? this.state.activeModel.id : null;
  },

  getActiveModelTrace() {
    return (
      this.state.traces.find(
        (trace) =>
          trace.model_id ==
          (this.state.activeModel && this.state.activeModel.id)
      ) || null
    );
  },
  getActiveModelDocumentId() {
    const trace = this.getActiveModelTrace();
    return trace ? trace.document_id : null;
  },

  deleteDocumentTraces(docId) {
    this.state.traces = this.state.traces.filter(
      (trace) => trace.document_id != docId
    );
  },
  // temporarySelections
  addTemporarySelection(selection) {
    this.state.temporarySelections.push(selection);
  },
  setTemporarySelections(selections) {
    this.state.temporarySelections = selections;
  },
  getTemporarySelections() {
    return this.state.temporarySelections;
  },
  hasTemporarySelections() {
    return this.state.temporarySelections.length > 0;
  },
};
