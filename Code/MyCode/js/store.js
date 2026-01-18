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

window.Store = {
  state: {},
  // Methods to manipulate the store

  // traces

  getDocumentModels(docId) {
    const docTraces = this.getDocumentTraces(docId);
    const modelIds = docTraces.map((trace) => trace.model_id);
    return this.state.models.filter((model) => modelIds.includes(model.id));
  },
  deleteDocumentTraces(docId) {
    this.state.traces = this.state.traces.filter(
      (trace) => trace.document_id != docId,
    );
  },
  // traces
  // documentList
  setDocumentList(docList) {
    this.state.documentList = docList;
  },
  getDocumentList() {
    return this.state.documentList;
  },

  // document
  getDocumentNameById(docId) {
    const doc = this.state.documentList.find((d) => d.id == docId);
    return doc ? doc.name : "Unknown Document";
  },
  // activeDocument
  setActiveDocumentId(docId) {
    var currentActiveDocId = this.getActiveDocumentId();
    if (docId != currentActiveDocId) {
      this.state.activeDocumentId = docId;
      document.dispatchEvent(
        new CustomEvent("store:active-document-id-changed"),
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
          (trace) => trace.document_id == activeDocumentId,
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
  deleteModel(modelId) {
    this.state.models = this.state.models.filter(
      (model) => model.id != modelId,
    );
    document.dispatchEvent(
      new CustomEvent("store:model-deleted", {
        detail: { modelId: modelId },
      }),
    );
    if (this.getActiveModelId() == modelId) {
      this.setActiveModel(null);
    }
  },
  // activeModel
  async setActiveModelById(modelId) {
    // const model = this.state.models.find((m) => m.id == modelId) || null;
    // this.setActiveModel(model);
    var currentActiveModelId = this.getActiveModelId();
    if (modelId != currentActiveModelId) {
      if (modelId) {
        const model = await API.Model.getModelById(modelId);
        this.setActiveModel(model);
      } else {
        this.setActiveModel(null);
      }
    }
  },
  setActiveModel(model) {
    this.state.activeModel = model;
    document.dispatchEvent(new CustomEvent("store:active-model-changed"));
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
          (this.state.activeModel && this.state.activeModel.id),
      ) || null
    );
  },
  getActiveModelDocumentId() {
    const trace = this.getActiveModelTrace();
    return trace ? trace.document_id : null;
  },

  deleteDocumentTraces(docId) {
    this.state.traces = this.state.traces.filter(
      (trace) => trace.document_id != docId,
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
      // this.notify({ key: "documentList", operation: "delete", id: docId });
      const activeDocumentId = Store.activeDocument.getActiveDocumentId();
      if (activeDocumentId == docId) {
        Store.activeDocument.setActiveDocumentId(null);
      }
      const docModelIds = Store.traces.getDocumentModelIds(docId);
      console.log("Deleting document models:", docModelIds);
      //
      // const docTraces = Store.traces
      //   .getDocumentTraces(docId)
      //   .map((trace) => trace.id);
      // docTraces.forEach((traceId) => {
      //   Store.traces.state.traces = Store.traces.state.traces.filter(
      //     (trace) => trace.id != traceId,
      //   );

      // });

      // await API.Document.deleteDocumentById(docId);
      // this.state.documentList = this.state.documentList.filter(
      //   (doc) => doc.id != docId,
      // );

      // const activeDocumentId = Store.getActiveDocumentId();
      // if (activeDocumentId == docId) {
      //   Store.activeDocument.setActiveDocumentId(null);
      // }
      // const models = this.getDocumentModels(docId);
      // models.forEach((model) => {
      //   this.deleteModel(model.id);
      //   const modelIndex = this.state.models.findIndex((m) => m.id == model.id);
      //   if (modelIndex !== -1) {
      //     this.state.models.splice(modelIndex, 1);
      //   }
      // });
      // this.deleteDocumentTraces(docId);
      // if (this.getActiveDocumentId() == docId) {
      //   this.setActiveDocumentId(null);
      // }
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
    setStatus(status) {
      this.state.status = status;
      this.notify({ key: "status", newValue: status });
    },
    setContent(newValue) {
      this.state.content = newValue;
      this.notify({ key: "content", newValue });
    },
    getActiveDocumentId() {
      return this.state.activeDocumentId;
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
    getTraces() {
      const activeDocumentId = this.getActiveDocumentId();
      return Store.traces.getDocumentTraces(activeDocumentId);
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
      // return trace;
    },
    async deleteModelTrace(modelId) {
      const trace = this.state.traces.find(
        (trace) => trace.model_id == modelId,
      );
      if (trace) {
        await API.Trace.deleteTraceById(trace.id);
        this.state.traces = this.state.traces.filter(
          (trace) => trace.model_id != modelId,
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
      r;
      return this.state.models;
    },
    getModelNameById(modelId) {
      const model = this.state.model;
      return model && model.id == modelId ? model.name : `Model ${modelId}`;
    },
    async createModel(model) {
      const modelId = await API.Model.createModel(model);
      model = await API.Model.updateModel(modelId, {
        name: `Model_${modelId}`,
      });
      this.addModel(model);
      return model;
    },
    async updateModel(modelId, updatedFields) {
      // const updatedModel = await API.Model.updateModel(modelId, updatedFields);
      // const idx = this.state.models.findIndex((m) => m.id === updatedModel.id);
      // this.notify({ key: "models", newValue: this.state.models });
    },
    async deleteModelById(modelId) {
      this.state.models = this.state.models.filter(
        (model) => model.id != modelId,
      );
      // await API.Model.deleteModelById(modelId);
      // tracesStore.deleteModelTrace(modelId);

      // if (modelTrace) {
      //   await API.Trace.deleteTraceById(modelTrace.id);
      // getModelTrace
      // if (trace) {

      this.notify({ key: "models", operation: "delete", id: modelId });
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
    setStatus(status) {
      this.state.status = status;
      this.notify({ key: "status", newValue: status });
    },
    getModel() {
      return this.state.model;
    },
    getModelId() {
      return this.state.model ? this.state.model.id : null;
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
    deleteModel() {
      console.log("Deleting active model");
      this.setModel(null);
      modelsStore.deleteModelById(this.getModelId());
    },
  },
);
