const workspaceService = {
  async loadWorkspace(projectId) {
    await projectStore.init(projectId);
    await documentsStore.init(projectId);
    const documents = documentsStore.getDocuments();
    await modelsStore.init(documents);

    let docId = null;
    if (documents.length > 0) {
      docId = documents[documents.length - 1]?.id;
      activeDocumentStore.setDocumentById(docId);
    }

    workspaceStore.setWorkspace({
      projectId,
      activeDocumentId: docId,
    });
  },
};
