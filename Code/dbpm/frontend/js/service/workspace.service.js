const workspaceService = {
  async loadWorkspace(projectId) {
    await projectStore.init(projectId);
    await documentsStore.init(projectId);
    const documentList = documentsStore.getDocuments();
    await modelsStore.init(documentList);

    let activeDocumentId = null;
    if (documentList.length > 0) {
      activeDocumentId = documentList[documentList.length - 1]?.id;
      //   workspaceStore.setActiveDocumentId(lastDocId);
    }
    workspaceStore.setWorkspace({
      projectId,
      activeDocumentId,
    });
  },
};
