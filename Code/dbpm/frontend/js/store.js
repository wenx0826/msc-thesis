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
    generatedModelNumber: 0,
  }),
  {
    async init(projectId) {
      const { name, generatedModelNumber } =
        await API.project.getProjectById(projectId);
      this.setProject({ name, generatedModelNumber });
    },
    getProjectName() {
      return this.state.name;
    },

    getModelNumber() {
      return this.state.generatedModelNumber;
    },
    setName(val) {
      if (this.state.name !== val) {
        this.state.name = val;
        this.notify({ key: "name", newValue: val });
      }
    },
    setProject({ name, generatedModelNumber }) {
      this.setName(name);
      this.setGeneratedModelNumber(generatedModelNumber);
    },
    setGeneratedModelNumber(generatedModelNumber) {
      this.state.generatedModelNumber = generatedModelNumber;
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
        // todo
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
    htmlContent: null,
    traces: [],
    hasSelectionChanged: false,
    activeModelTrace: null,
    originalActiveModelSerializedSelections: null,
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
    getHtmlContent() {
      return this.state.htmlContent;
    },
    getId() {
      return this.state.id;
    },

    setStatus(newValue) {
      this.state.status = newValue;
      this.notify({ key: "status", newValue });
    },
    setHtmlContent(content) {
      const newValue = new DOMParser().parseFromString(content, "text/html")
        .body.innerHTML;
      this.state.htmlContent = newValue;
      this.notify({ key: "htmlContent", newValue });
    },

    async setDocumentById(id) {
      const currentId = this.getId();
      // ??
      if (id === currentId) return Promise.resolve();
      this.setStatus("loading");
      this.setTraces([]);
      this.setActiveModelTrace(null);
      this.setTemporarySelections([]);
      this.setHasSelectionChanged(false);
      const contentPromise = API.document.getDocumentContentById(id);
      const tracesPromise = API.trace.getTracesByDocumentId(id); // Start fetching traces early
      return new Promise((resolve, reject) => {
        contentPromise.then(
          (content) => {
            this.setHtmlContent(content);
            this.setStatus(null);
            tracesPromise
              .then((traces) => {
                console.log("11. Loaded traces for document:", traces);
                this.setTraces(traces);
                resolve();
              })
              .catch((error) => {
                console.log("Error loading traces:", error);
                // Optionally set empty traces: this._setTraces([]);
                resolve(); // Resolve even on traces error to not block
              });
          },
          (error) => {
            this.setHtmlContent(null);
            this.setStatus("error");
            reject(error);
          },
        );
      });
    },
    setStatus(newValue) {
      this.state.status = newValue;
      this.notify({ key: "status", newValue });
    },
    getHasSelectionChanged() {
      return this.state.hasSelectionChanged;
    },
    hasActiveTraceSelectionChanged() {},
    computeSelectionChanged() {
      let hasSelectionChanged = false;
      if (this.getTemporarySelections().length > 0) {
        hasSelectionChanged = true;
      } else {
      }
      this.setHasSelectionChanged(hasSelectionChanged);
    },
    setHasSelectionChanged(newValue) {
      const oldValue = this.state.hasSelectionChanged;
      if (oldValue === newValue) return;
      this.state.hasSelectionChanged = newValue;
      this.notify({ key: "hasSelectionChanged", oldValue, newValue });
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
    getActiveModelTrace() {
      return this.state.activeModelTrace;
    },
    setActiveModelTrace(newValue) {
      const oldValue = this.getActiveModelTrace();
      this.state.activeModelTrace = newValue;
      this.notify({ key: "activeModelTrace", oldValue, newValue });
    },
    setActiveModelTraceByModelId(modelId) {
      const trace = this.state.traces.find((trace) => trace.modelId == modelId);
      this.setActiveModelTrace(trace);
    },
    removeActiveModelTraceSelectionById(selectionId) {
      let value;
      const activeModelTrace = this.getActiveModelTrace();
      if (activeModelTrace) {
        const index = activeModelTrace.selections.findIndex(
          (sel) => sel.id === selectionId,
        );
        if (index !== -1) {
          value = activeModelTrace.selections[index];
          activeModelTrace.selections.splice(index, 1);
        }
      }
      this.notify({
        key: "activeModelTrace.selections",
        operation: "remove",
        value,
      });
    },
    setActiveModelTraceById(traceId) {
      const trace = this.getTraceById(traceId);
      this.setActiveModelTrace(trace);
      // this.notify({ key: "activeModelTrace", newValue: trace });
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
      this.computeSelectionChanged();
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
      this.computeSelectionChanged();
    },

    setTemporarySelections(newValue) {
      const oldValue = this.state.temporarySelections;
      this.state.temporarySelections = newValue;
      this.notify({
        key: "temporarySelections",
        oldValue,
        newValue,
      });
    },
    // #endregion
    getSelectionsText(selections) {
      let selectedText = "";
      selections.forEach((selection) => {
        selectedText += selection.range.toString() + " ";
      });
      return selectedText.trim();
    },
    getSelectedText() {
      let selections = [...this.getTemporarySelections()];
      const activeModelTrace = this.getActiveModelTrace();
      if (activeModelTrace)
        selections = [...activeModelTrace.selections, ...selections];
      return this.getSelectionsText(selections);
    },
  },
);

Store.models = Object.assign(
  createDomainStore({
    modelsById: {},
  }),
  {
    async init() {
      const documents = documentsStore.getDocuments();
      let modelsById = {};
      for (const { id: docId } of documents) {
        const docModels = await API.document.getDocumentModelsById(docId);
        docModels.forEach((model) => (model.documentId = docId));
        modelsById = {
          ...modelsById,
          ...docModels.reduce((acc, model) => {
            acc[model.id] = { meta: model, documentId: docId };
            return acc;
          }, {}),
        };
      }
      this.state.modelsById = modelsById;
      this.notify({ operation: "init" });
    },
    addModel(value) {
      this.state.modelsById[value?.meta?.id] = value;
      this.notify({ operation: "add", value });
    },
    updateModelById(modelId, updates) {
      const value = this.state.modelsById[modelId];
      console.log("Updating model in store:", value, updates);
      if (value) {
        Object.assign(value, updates);
        this.notify({ key: "models", operation: "update", value });
      }
    },
    getModels() {
      return Object.values(this.state.modelsById);
    },
    getModelById(modelId) {
      return this.state.models.find((model) => model.id == modelId) || null;
    },
    getModelNameById(modelId) {
      return this.state.modelsById[modelId]?.meta?.name;
    },
    getModelDocumentIdById(modelId) {
      return this.state.modelsById[modelId]?.documentId;
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
      console.log("Getting document ID for active model????");
      const modelId = this.getModelId();
      // console.log("Getting document ID for active model ID:", modelId);
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

Store.projectGraph = Object.assign(
  createDomainStore({
    elements: [],
  }),
  {
    init() {
      const docs = documentsStore.getDocuments();
      const nodes = docs.map((doc) => ({
        group: "nodes",
        data: {
          id: `doc-${doc.id}`,
          type: "document",
          label: doc.name,
          degree: 1,
        },
      }));
      let edges = [];
      const models = modelsStore.getModels();
      models.forEach((model) => {
        nodes.push({
          group: "nodes",
          data: {
            id: `model-${model.meta.id}`,
            type: "model",
            label: model.meta.name,
            degree: 1,
          },
        });
        // Edge from document to model
        edges.push({
          group: "edges",
          data: {
            source: `doc-${model.documentId}`,
            target: `model-${model.meta.id}`,
            relation: "generated",
          },
        });
        // Derived edges between models (if any)
        // if (model.meta.derivedFrom && model.meta.derivedFrom.length > 0) {
        //   model.meta.derivedFrom.forEach((sourceModelId) => {
        //     edges.push({
        //       data: {
        //         source: `model-${sourceModelId}`,
        //         target: `model-${model.meta.id}`,
        //         relation: "derived",
        //       },
        //     });
        //   });
        // }
      });
      this.state.elements = [...nodes, ...edges];
      console.log("Initialized project graph elements:", this.state.elements);
      this.notify({ key: "elements", newValue: this.state.elements });
    },
    addDocumentNode(document) {
      const node = {
        data: {
          id: `doc-${document.id}`,
          type: "document",
          label: document.name,
          degree: 1,
        },
      };
      this.state.elements.push(node);
      this.notify({
        key: "elements.documentNode",
        operation: "add",
        value: node,
      });
    },
    addModelNodeAndEdge(modelMeta, documentId) {
      const modelNode = {
        data: {
          group: "nodes",
          id: `model-${modelMeta.id}`,
          type: "model",
          label: modelMeta.name,
          degree: 1,
        },
      };
      const edge = {
        group: "edges",
        data: {
          source: `doc-${documentId}`,
          target: `model-${modelMeta.id}`,
          relation: "generated",
        },
      };
      this.state.elements.push(modelNode, edge);
      // this.notify({ key: "elements", operation: "add", value: modelNode });
      this.notify({
        key: "elements.modelNodeAndEdge",
        operation: "add",
        value: { modelNode, edge },
      });
    },
    getElements() {
      return this.state.elements;
    },
    setGraph({ nodes, edges }) {
      this.state.nodes = nodes;
      this.state.edges = edges;
      this.notify({ key: "graph", newValue: { nodes, edges } });
    },
    getNodes() {
      return this.state.nodes;
    },
    getEdges() {
      return this.state.edges;
    },
  },
);
