const workspaceService = {
  async loadWorkspace(projectId) {
    await projectStore.init(projectId);
    await documentsStore.init(projectId);
    const documents = documentsStore.getDocuments();
    await modelsStore.init(documents);
    const models = modelsStore.getModels();
    Store.projectGraph.init();
    console.log("Store.projectGraph.init()", Store.projectGraph.getElements());
    let docId = null;
    if (documents.length > 0) {
      docId = documents[documents.length - 1]?.id;
      this.activateDocumentById(docId);
    }
    workspaceStore.setWorkspace({
      projectId,
      activeDocumentId: docId,
    });
  },

  clearModelSelection() {
    workspaceStore.setActiveModelId(null);
    activeModelStore.setModel(null);
    activeDocumentStore.setActiveModelTrace(null);
  },
  async activateDocumentById(documentId) {
    workspaceStore.setActiveDocumentId(documentId);
    await activeDocumentStore.setDocumentById(documentId);
    const activeModelId = workspaceStore.getActiveModelId();
    if (activeModelId) {
      const activeModelDocumentId =
        modelsStore.getModelDocumentIdById(activeModelId);
      if (documentId === activeModelDocumentId) {
        activeDocumentStore.setActiveModelTraceByModelId(activeModelId);
      } else {
        this.clearModelSelection();
      }
    }
  },

  toggleModelSelection(modelId) {
    // workspaceStore.setLoading(true);
    const currentActiveModelId = workspaceStore.getActiveModelId();

    if (currentActiveModelId === modelId) {
      modelId = null;
      this.clearModelSelection();
      return;
    }
    workspaceStore.setActiveModelId(modelId);
    activeModelStore.setModelById(modelId);

    if (modelId) {
      const currentActiveDocumentId = workspaceStore.getActiveDocumentId();
      // activeModelStore.getDocumentId(); canbe empty
      const activeModelDocumentId = modelsStore.getModelDocumentIdById(modelId);
      if (currentActiveDocumentId != activeModelDocumentId) {
        this.activateDocumentById(activeModelDocumentId);
      } else {
        activeDocumentStore.setActiveModelTraceByModelId(modelId);
      }
    }
  },
};
