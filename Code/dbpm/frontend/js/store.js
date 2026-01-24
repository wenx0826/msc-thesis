window.Store = {
  async init(projectId) {
    // this.activeDocument.init();
  },
};

function createDomainStore(initialState, options = {}) {
  const subs = new Set();
  return {
    state: { ...initialState },
    subscribe(fn) {
      subs.add(fn);
      // return unsubscribe
      return () => subs.delete(fn);
    },

    notify(patch) {
      subs.forEach((fn) => fn(this.state, patch));
    },
  };
}
Store.workspace = Object.assign(
  createDomainStore({
    status: null, // 'loading', 'ready', 'error'
    projectId: null,
    activeDocumentId: null,
    activeModelId: null,
    llmModel: "gemini-2.0-flash",
    theme: null,
    documentIdMap: {},
    modelIdMap: {},
    project: {},
  }),
  {
    async init(projectId) {
      this.state.projectId = projectId;
      const project = await API.project.getProjectById(projectId);
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
      this.setActiveDocumentId(activeDocumentId);
      this.setActiveModelId(activeModelId);
    },
  },
);

Store.project = Object.assign(
  createDomainStore({
    name: null,
    modelNumber: 0,
  }),
  {
    async init(projectId) {
      const { name, modelNumber } = await API.project.getProjectById(projectId);
      this.setProject({ name, modelNumber });
    },
    getProjectName() {
      return this.state.name;
    },

    getModelNumber() {
      return this.state.modelNumber;
    },
    setName(val) {
      if (this.state.name !== val) {
        this.state.name = val;
        this.notify({ key: "name", newValue: val });
      }
    },
    setProject({ name, modelNumber }) {
      this.setName(name);
      this.setModelNumber(modelNumber);
    },
    setModelNumber(modelNumber) {
      this.state.modelNumber = modelNumber;
    },
  },
);

Store.documents = Object.assign(
  createDomainStore({
    documents: [],
  }),
  {
    async init(projectId) {
      const documents = await API.document.getDocumentsByProjectId(projectId);
      this.state.documents = documents;
      this.notify({ operation: "init" });
    },
    getDocuments() {
      return this.state.documents;
    },
    addDocument(document) {
      this.state.documents.push(document);
      this.notify({ operation: "add", id: document.id });
    },
    async createDocument(doc) {
      const projectId = workspaceStore.getProjectId();
      const newDoc = await API.document.createDocument({ ...doc, projectId });
      this.state.documents.push(newDoc);
      this.notify({ operation: "add", id: newDoc.id });
      return newDoc.id;
    },
    async deleteDocumentById(docId) {
      this.notify({ key: "documents", operation: "delete", id: docId });
      this.state.documents = this.state.documents.filter(
        (doc) => doc.id != docId,
      );
      API.document.deleteDocumentById(docId);
      const activeDocumentId = window.Store.activeDocument.getId();
      if (activeDocumentId == docId) {
        window.Store.activeDocument.setDocumentById(null);
      }
      const docModelIds = window.Store.traces.getDocumentModelIds(docId);
      docModelIds.forEach((modelId) => {
        window.Store.models.deleteModelById(modelId);
      });
    },
  },
);
Store.activeDocument = Object.assign(
  createDomainStore({
    status: null,
    content: null,
    traces: [],
    activeTrace: null,
    temporarySelections: [],
  }),
  {
    init() {
      const documents = documentsStore.getDocuments();
      if (documents.length) {
        this.setDocumentById(documents[documents.length - 1]?.id);
      }
    },
    getStatus() {
      return this.state.status;
    },
    getContent() {
      return this.state.content;
    },
    getId() {
      return this.state.id;
    },

    setStatus(newValue) {
      this.state.status = newValue;
      this.notify({ key: "status", newValue });
    },
    setContent(newValue) {
      this.state.content = newValue;
      this.notify({ key: "content", newValue });
    },

    setDocumentById(id) {
      const currentId = this.getId();
      if (id === currentId) return;
      this.setStatus("loading");
      const contentPromise = API.document.getDocumentContentById(id);
      const tracesPromise = API.trace.getTracesByDocumentId(id); // Start fetching traces early
      contentPromise.then(
        (content) => {
          this.setContent(content);
          this.setStatus(null);
          tracesPromise
            .then((traces) => {
              console.log("11. Loaded traces for document:", traces);
              this.setTraces(traces);
            })
            .catch((error) => {
              console.log("Error loading traces:", error);
              // Optionally set empty traces: this._setTraces([]);
            });
        },
        (error) => {
          this.setContent(null);
          this.setStatus("error");
        },
      );
    },
    setStatus(newValue) {
      this.state.status = newValue;
      this.notify({ key: "status", newValue });
    },
    // #region traces && active trace
    addTrace(trace) {
      trace.selections.forEach((selection) => {
        selection.range = deserializeRange(selection.range);
      });
      this.state.traces.push(trace);
      this.notify({ key: "traces", operation: "add", value: trace });
    },
    setTraces(traces) {
      if (traces.length) {
        traces.forEach((trace) => {
          trace.selections.forEach((selection) => {
            selection.range = deserializeRange(selection.range);
          });
        });
      }
      this.state.traces = traces;
      this.notify({ key: "traces", operation: "init" });
    },

    getTraces() {
      return this.state.traces;
    },
    getTraceById(traceId) {
      return this.state.traces.find((trace) => trace.id == traceId);
    },
    getActiveTrace() {
      return this.state.activeTrace;
    },
    setActiveTrace(trace) {
      this.state.activeTrace = trace;
      // this.notify({ key: "activeTrace", newValue: trace });
    },
    setActiveTraceByModelId(modelId) {
      const trace = this.state.traces.find((trace) => trace.modelId == modelId);
      this.setActiveTrace(trace);
      //
    },
    removeActiveTraceSelectionById(selectionId) {
      let value;
      const activeTrace = this.getActiveTrace();
      if (activeTrace) {
        const index = activeTrace.selections.findIndex(
          (sel) => sel.id === selectionId,
        );
        if (index !== -1) {
          value = activeTrace.selections[index];
          activeTrace.selections.splice(index, 1);
        }
      }
      this.notify({
        key: "activeTrace.selections",
        operation: "remove",
        value,
      });
    },
    setActiveTraceById(traceId) {
      const trace = this.getTraceById(traceId);
      this.setActiveTrace(trace);
      // this.notify({ key: "activeTrace", newValue: trace });
    },
    // #endregion
    // #region temporary selections
    getTemporarySelections() {
      return this.state.temporarySelections;
    },
    getSerializedTemporarySelections() {
      const selections = this.state.temporarySelections.selections;
      console.log("Serializing temporary selections:!!!!!", selections);
      this.state.temporarySelections.selections = getSortedSelectionsByRange(
        this.getTemporarySelections(),
      );
      return this.state.temporarySelections.map(({ range, ...rest }) => ({
        ...rest,
        range: serializeRange(range),
        text: range.toString(),
      }));
    },
    addTemporarySelection(selection) {
      this.state.temporarySelections.push(selection);
      this.notify({
        key: "temporarySelections",
        operation: "add",
        value: selection,
      });
    },
    removeTemporarySelectionById(selectionId) {
      let value;
      const index = this.state.temporarySelections.findIndex(
        (sel) => sel.id === selectionId,
      );
      if (index !== -1) {
        value = this.state.temporarySelections[index];
        this.state.temporarySelections.splice(index, 1);
      }
      this.notify({ key: "temporarySelections", operation: "remove", value });
    },
    // setTemporarySelections(selections) {
    //   this.state.temporarySelections = selections;
    //   this.notify({
    //     key: "temporarySelections",
    //     operation: "set",
    //     value: selections,
    //   });
    // },
    clearTemporarySelections() {
      const value = this.state.temporarySelections;
      this.state.temporarySelections = [];
      this.notify({ key: "temporarySelections", operation: "clear", value });
    },
    // #endregion
    getSelectedText() {
      let selections = [...this.getTemporarySelections()];
      const activeTrace = this.getActiveTrace();
      if (activeTrace) selections = [...activeTrace.selections, ...selections];
      let selectedText = "";
      sortedSelections = getSortedSelectionsByRange(selections);
      sortedSelections.forEach((selection) => {
        selectedText += selection.range.toString() + " ";
      });

      return selectedText.trim();
    },
  },
);

Store.models = Object.assign(
  createDomainStore({
    // models: [],
    idMaps: {},
  }),
  {
    async init() {
      const documents = documentsStore.getDocuments();
      // const models = [];
      // documents.forEach(async (doc) => {
      //   const modelsMeta = await API.document.getDocumentModelsById(doc.id);
      //   // console.log("Loaded model for trace:", modelsMeta);
      //   // models.push(model);
      //   // this.state.models = modelsMeta;
      //   this.state.idMaps = modelsMeta.reduce((acc, model) => {
      //     model.documentId = doc.id;
      //     acc[model.id] = model;
      //     return acc;
      //   }, {});
      // });
      for (const { id: docId } of documents) {
        const modelsMeta = await API.document.getDocumentModelsById(docId);
        for (const model of modelsMeta) {
          model.documentId = docId;
          this.state.idMaps[model.id] = model;
        }
      }
      // this.state.models = models;
      console.log("Initialized models store with models:", this.state.idMaps);
      this.notify({ operation: "init" });
    },
    addModel(model) {
      this.state.idMaps[model.id] = model;
      this.notify({ operation: "add", id: model.id });
    },
    updateModelById(modelId, updates) {
      const model = this.state.idMaps[modelId];
      console.log("Updating model in store:", model, updates);
      if (model) {
        Object.assign(model, updates);
        this.notify({ key: "models", operation: "update", id: modelId });
      }
    },
    getModels() {
      return Object.values(this.state.idMaps);
    },
    getModelById(modelId) {
      return this.state.models.find((model) => model.id == modelId) || null;
    },
    getModelNameById(modelId) {
      return this.state.idMaps[modelId]?.name;
    },
    getModelDocumentIdById(modelId) {
      return this.state.idMaps[modelId]?.documentId;
    },
    /*async updateActiceModel(modelId, updatedFields) {
      // const updatedModel = await API.Model.updateModel(modelId, updatedFields);
      // const idx = this.state.models.findIndex((m) => m.id === updatedModel.id);
      // this.notify({ key: "models", newValue: this.state.models });
    },*/
    async deleteModelById(modelId) {
      this.notify({ key: "models", operation: "delete", id: modelId });
      this.state.models = this.state.models.filter(
        (model) => model.id != modelId,
      );
      if (window.Store.activeModel.getModelId() == modelId) {
        window.Store.activeModel.setModel(null);
      }
      window.Store.traces.deleteModelTrace(modelId);
      API.Model.deleteModelById(modelId);
    },
  },
);
Store.activeModel = Object.assign(
  createDomainStore({
    status: null, // 'loading', 'ready', 'error','generating'
    error: null,
    model: null,
  }),
  {
    getModel() {
      return this.state.model;
    },
    getModelId() {
      return this.state.model ? this.state.model.id : null;
    },
    getDocumentId() {
      const modelId = this.getModelId();
      return modelsStore.getModelDocumentIdById(modelId);
    },
    getSerializedData() {
      return new XMLSerializer().serializeToString(this.state.model.data);
    },

    setStatus(status) {
      this.state.status = status;
      this.notify({ key: "status", newValue: status });
    },
    setError(error) {
      this.state.error = error;
      this.notify({ key: "error", newValue: error });
    },

    setModel(newValue) {
      const oldValue = this.state.model;
      this.state.model = newValue;
      if (newValue) {
        var parser = new DOMParser();
        let data = parser.parseFromString(newValue.data, "application/xml");
        if (data.documentElement.nodeName != "description") {
          data = $("description", data)[0];
        } else {
          data = data.documentElement;
        }
        newValue.data = data;
      }
      this.notify({ key: "model", oldValue, newValue });
    },

    async setModelById(modelId) {
      if (modelId) {
        API.model.getModelById(modelId).then((model) => {
          this.setModel(model);
        });
      } else {
        this.setModel(null);
      }
    },

    /*async updateActiceModel() {
      const modelId = this.getModelId();
      if (modelId) {
        const updatedModel = await API.Model.getModelById(modelId);
        this.setModel(updatedModel);
      }
    },*/
    /*updateActiveModel(model) {
      const modelId = this.getModelId();
      if (modelId) {
        API.Model.updateModelById(modelId, model).then((updatedModel) => {
          this.setModel(updatedModel);
        });
      }
    },*/
    // deleteModel() {
    //   modelsStore.deleteModelById(this.getModelId());
    //   this.setModel(null);
    // },
  },
);
