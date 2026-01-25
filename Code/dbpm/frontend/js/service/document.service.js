const documentService = {
  async getHtmlContentById(documentId) {
    const content = await API.document.getDocumentContentById(documentId);
    const htmlContent = new DOMParser().parseFromString(content, "text/html")
      .body.innerHTML;
    return htmlContent;
  },
  getTracesById(documentId) {
    return API.trace.getTracesByDocumentId(documentId);
  },
  async uploadDocument(doc) {
    const projectId = workspaceStore.getProjectId();
    const newDoc = await API.document.createDocument({ ...doc, projectId });
    documentsStore.addDocument(newDoc);
    const docId = newDoc.id;
    workspaceStore.setActiveDocumentId(docId);
  },
};
