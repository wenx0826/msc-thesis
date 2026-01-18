window.Store = {};

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
      // patch: { type, prev, next, ... }
      subs.forEach((fn) => fn(this.state, patch));

      // Optional DOM event bridge (single place)
      // if (options.domEventName) {
      //   document.dispatchEvent(
      //     new CustomEvent(options.domEventName, { detail: patch }),
      //   );
      // }
    },
  };
}

Store.project = Object.assign(
  createDomainStore({
    id: null,
    name: null,
    llmModel: "gemini-2.0-flash",
    theme: null,
  }),
  {
    setProject(id, name) {
      this.state.id = id;
      this.state.name = name;
    },
    getLlmModel() {
      return this.state.llmModel;
    },
    setLlmModel(llmModel) {
      this.state.llmModel = llmModel;
    },
    setTheme(theme) {
      this.state.theme = theme;
    },
  },
);
Store.documents = Object.assign(
  createDomainStore({
    documentList: [],
  }),
  {
    setDocumentList() {
      API.Document.getDocumentList().then((fetchedDocList) => {
        this.state.documentList = fetchedDocList;
        this.notify({ key: "documentList", newValue: fetchedDocList });
      });
    },
    getDocumentList() {
      return this.state.documentList;
    },
    async createDocument(doc) {
      return API.Document.createDocument(doc).then((newDoc) => {
        const newDocList = [...this.state.documentList, newDoc];
        this.setDocumentList();
        return newDoc.id;
      });
    },
    async deleteDocumentById(docId) {
      this.notify({ key: "documentList", operation: "delete", id: docId });
      this.state.documentList = this.state.documentList.filter(
        (doc) => doc.id != docId,
      );
      API.Document.deleteDocumentById(docId);
      const activeDocumentId = activeDocumentStore.getActiveDocumentId();
      if (activeDocumentId == docId) {
        activeDocumentStore.setActiveDocumentId(null);
      }
      const docModelIds = tracesStore.getDocumentModelIds(docId);
      docModelIds.forEach((modelId) => {
        modelsStore.deleteModelById(modelId);
      });
    },
  },
);
Store.activeDocument = Object.assign(
  createDomainStore({
    status: null,
    activeDocumentId: null,
    content: null,
    traces: [],
  }),
  {
    getActiveDocumentId() {
      return this.state.activeDocumentId;
    },
    getTraces() {
      const activeDocumentId = this.getActiveDocumentId();
      return Store.traces.getDocumentTraces(activeDocumentId);
    },
    setStatus(status) {
      this.state.status = status;
      this.notify({ key: "status", newValue: status });
    },
    setContent(newValue) {
      this.state.content = newValue;
      this.notify({ key: "content", newValue });
    },
    setActiveDocumentId(newValue) {
      const oldValue = this.getActiveDocumentId();
      if (newValue != oldValue) {
        this.state.activeDocumentId = newValue;
        newValue ? this.setContentById(newValue) : this.setContent(null);
        this.notify({ key: "activeDocumentId", newValue });
      }
    },
    setContentById(docId) {
      this.setStatus("loading");
      API.Document.getDocumentContentById(docId).then(
        (content) => {
          this.setContent(content);
          this.setStatus(null);
        },
        (error) => {
          console.log("Error loading document content:???", error);
          this.setContent(null);
          this.setStatus("error");
        },
      );
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
      return this.state.traces.filter((trace) => trace.document_id == docId);
    },
    getDocumentModelIds(docId) {
      return this.getDocumentTraces(docId).map((trace) => trace.model_id);
    },
    getDocumentModels(docId) {
      const modelIds = this.getDocumentModelIds(docId);
      return modelIds.map((modelId) => {
        const model = modelsStore.getModelById(modelId);
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
      const documentId = Store.activeDocument.getActiveDocumentId();
      const modelId = Store.activeModel.getModelId();
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
    models: [],
  }),
  {
    addModel(model) {
      this.state.models.push(model);
    },
    getModels(text) {
      return this.state.models;
    },
    getModelById(modelId) {
      return this.state.models.find((model) => model.id == modelId) || null;
    },
    getModelNameById(modelId) {
      const model = this.getModelById(modelId);
      return model && model.id == modelId ? model.name : `Model ${modelId}`;
    },
    async createModel(model) {
      const modelId = await API.Model.createModel(model);
      model = await API.Model.updateModelById(modelId, {
        name: `Model_${modelId}`,
      });
      this.addModel(model);
      return model;
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
      if (activeModelStore.getModelId() == modelId) {
        activeModelStore.setModel(null);
      }
      tracesStore.deleteModelTrace(modelId);
      API.Model.deleteModelById(modelId);
    },
    async updateModelById(modelId, updatedFields) {
      const updatedModel = await API.Model.updateModelById(
        modelId,
        updatedFields,
      );
      const idx = this.state.models.findIndex((m) => m.id === modelId);
      if (idx >= 0) {
        this.state.models[idx] = updatedModel;
      }
      this.notify({
        key: "models",
        operation: "update",
        id: modelId,
      });
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
      return tracesStore.getModelTrace(modelId)?.document_id;
      // const model = this.getModel();
      // if (model) {
      //   const trace = Store.traces.getModelTrace(model.id);
      //   return trace ? trace.document_id : null;
      // }
      // return null;
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
      const oldValue = this.getModel();
      this.state.model = newValue;
      this.notify({ key: "model", oldValue, newValue });
    },
    async setModelById(modelId) {
      // const model = this.state.models.find((m) => m.id == modelId) || null;
      // this.setActiveModel(model);
      var currentActiveModelId = this.getModelId();
      if (modelId != currentActiveModelId) {
        if (modelId) {
          const model = await API.Model.getModelById(modelId);
          this.setModel(model);
        } else {
          this.setModel(null);
        }
      }
    },
    async updateActiceModel() {
      const modelId = this.getModelId();
      if (modelId) {
        const updatedModel = await API.Model.getModelById(modelId);
        this.setModel(updatedModel);
      }
    },
    generateModel(userInput, rpstXml) {
      console.log("Generating model with input:", userInput, rpstXml);
      this.setStatus("generating");
      const llm = Store.project.getLlmModel();
      API.Model.generateModel({ userInput, rpstXml, llm })
        .then((data) => {
          this.setModel({ data });
          // this.setStatus("ready");
        })
        .catch((error) => {
          console.error("Error generating model:", error);
          this.setError(String(error));
          this.setStatus("error");
        });
    },
    regenerateModel() {
      const activeModel = this.getActiveModel();
      if (activeModel) {
        this.generateModel(activeModel.source_text, activeModel.rpst_xml);
      }
    },
    generateNewModel(selectedText) {
      console.log("Store, Generating new model with selected text:??????");
      const rpstXml = window.Constants.EMPTY_MODEL;
      this.generateModel(selectedText, rpstXml);
    },
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
