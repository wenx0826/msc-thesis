import { createStore } from "../../../shared/utils/store.js";

export default Object.assign(
  createStore({
    documentsById: {},
  }),
  {
    init(documents = []) {
      this.state.documentsById = documents.reduce((acc, doc) => {
        acc[doc.id] = doc;
        return acc;
      }, {});
      this.notify({ operation: "init", value: documents });
    },
    getDocumentVersions(docId) {
      return this.state.documentsById[docId]?.versions || [];
    },
    add(document) {
      console.log("Adding document to store:", document);
      this.state.documentsById[document.id] = document;
      this.notify({ operation: "add", value: document });
    },
    addDocumentVersion(docId, version) {
      const doc = this.state.documentsById[docId];
      doc.versions.push(version);
      this.notify({ operation: "versions.add", value: doc });
    },
    deleteDocument(docId) {
      delete this.state.documentsById[docId];
      this.notify({ operation: "delete", id: docId });
    },
  },
);
