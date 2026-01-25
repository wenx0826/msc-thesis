const workspaceService = {
  async loadWorkspace(projectId) {
    await projectStore.init(projectId);
    await documentsStore.init(projectId);
    const documents = documentsStore.getDocuments();
    await modelsStore.init(documents);

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
  activateDocumentById(documentId) {
    workspaceStore.setActiveDocumentId(documentId);
    activeDocumentStore.setDocumentById(documentId);
    const activeModelDocumentId = activeModelStore.getDocumentId();
    if (documentId !== activeModelDocumentId) {
      workspaceStore.setActiveModelId(null);
      activeModelStore.setModel(null);
    }
  },
  toggleModelSelection(modelId) {
    // workspaceStore.setLoading(true);
    const currentActiveModelId = workspaceStore.getActiveModelId();
    if (currentActiveModelId === modelId) {
      modelId = null;
    }
    workspaceStore.setActiveModelId(modelId);
    activeModelStore.setModelById(modelId);
    if (modelId) {
      const currentActiveDocumentId = workspaceStore.getActiveDocumentId();
      const activeModelDocumentId = modelsStore.getModelDocumentIdById(modelId);
      console.log(
        "Toggling model selection. Current active document ID:",
        currentActiveDocumentId,
        "Active model's document ID:",
        activeModelDocumentId,
      );
      if (currentActiveDocumentId != activeModelDocumentId) {
        this.activateDocumentById(activeModelDocumentId);
      }
    }
  },
};
