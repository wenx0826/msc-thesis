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
  state: {
    temporarySelections: [],
  },
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
        return newDoc;
      });
    },
    async deleteDocumentById(docId) {
      await API.Document.deleteDocumentById(docId);
      this.state.documentList = this.state.documentList.filter(
        (doc) => doc.id != docId,
      );
      const activeDocumentId = Store.getActiveDocumentId();
      if (activeDocumentId == docId) {
        Store.activeDocument.setActiveDocumentId(null);
      }
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
Store.traces = Object.assign(
  createDomainStore({
    traces: [],
  }),
  {
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
    getDocumentTraces(docId) {
      return this.state.traces.filter((trace) => trace.document_id == docId);
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

    getActiveDocumentTraces() {
      const activeDocumentId = this.getActiveDocumentId();
      return activeDocumentId
        ? this.state.traces.filter(
            (trace) => trace.document_id == activeDocumentId,
          )
        : [];
    },
  },
);
Store.activeModel = Object.assign(
  createDomainStore({
    status: null, // 'loading', 'ready', 'error','generating'
    error: null,
    svg: null,
    data: null,
  }),
  {
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
  },
);
