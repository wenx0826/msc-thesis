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
    id: null,
    content: null,
    traces: [],
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

    getTraces() {
      return this.state.traces;
    },
    addTrace(trace) {
      this.state.traces.push(trace);
    },
    setDocumentById(id) {
      const currentId = this.getId();
      if (id === currentId) return;
      this._setId(id);
      this._setStatus("loading");
      const contentPromise = API.document.getDocumentContentById(id);
      const tracesPromise = API.trace.getTracesByDocumentId(id); // Start fetching traces early
      contentPromise.then(
        (content) => {
          this._setContent(content);
          this._setStatus(null);
          tracesPromise
            .then((traces) => {
              this._setTraces(traces);
            })
            .catch((error) => {
              console.log("Error loading traces:", error);
              // Optionally set empty traces: this._setTraces([]);
            });
        },
        (error) => {
          console.log("Error loading document content:???", error);
          this._setContent(null);
          this._setStatus("error");
        },
      );
    },
    _setStatus(newValue) {
      this.state.status = newValue;
      this.notify({ key: "status", newValue });
    },

    _setId(newValue) {
      this.state.id = newValue;
      this.notify({ key: "id", newValue });
    },
    _setContent(newValue) {
      this.state.content = newValue;
      this.notify({ key: "content", newValue });
    },
    _setTraces(newValue) {
      this.state.traces = newValue;
      this.notify({ key: "traces", operation: "init", newValue });
    },
  },
);
Store.traces = Object.assign(
  createDomainStore({
    traces: [],
  }),
  {
    getTraces() {
      return this.state.traces;
    },
    getDocumentTraces(docId) {
      return this.getTraces().filter((trace) => trace.document_id == docId);
    },
    getDocumentModelIds(docId) {
      return this.getDocumentTraces(docId).map((trace) => trace.model_id);
    },
    getDocumentModels(docId) {
      const modelIds = this.getDocumentModelIds(docId);
      return modelIds.map((modelId) => {
        const model = window.Store.models.getModelById(modelId);
        return { id: modelId, name: model ? model.name : `Model ${modelId}` };
      });
    },
    getModelTrace(modelId) {
      return (
        this.state.traces.find((trace) => trace.model_id == modelId) || null
      );
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
    async createTrace(sections) {
      const documentId = window.Store.activeDocument.getId();
      console.log(
        "Creating trace for document ID:",
        window.Store.activeDocument,
      );
      console.log("Creating trace for document ID???:", documentId);
      const modelId = window.Store.activeModel.getModelId();
      const trace = {
        id: Date.now(), // Simple unique ID generation
        document_id: documentId,
        model_id: modelId,
        selections: sections,
      };
      await API.Trace.createTrace(trace);
      this.addTrace(trace);
      // console.log("Created trace:", trace);
      return trace;
    },
    async deleteModelTrace(modelId) {
      const traceId = this.state.traces.find(
        (trace) => trace.model_id == modelId,
      )?.id;
      if (traceId) {
        await API.Trace.deleteTraceById(traceId);
        this.state.traces = this.state.traces.filter(
          (trace) => trace.id != traceId,
        );
      }
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
    // model: null,
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
      return window.Store.traces.getModelTrace(modelId)?.document_id;
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
