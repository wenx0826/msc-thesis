const documentService = {
  async uploadDocument(doc) {
    const projectId = Store.workspace.getProjectId();
    const newDoc = await API.document.createDocument({ ...doc, projectId });
    documentsStore.addDocument(newDoc);
    const docId = newDoc.id;
    workspaceService.activateDocumentById(docId);
    Store.projectGraph.addDocumentNode(newDoc);
  },
};
