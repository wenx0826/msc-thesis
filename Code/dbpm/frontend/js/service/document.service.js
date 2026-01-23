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
};
