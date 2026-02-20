// Documents Store - Documents list state
import { createDomainStore } from "./createStore.js";

export const documentsStore = Object.assign(
  createDomainStore({
    documents: [],
  }),
  {
    init(documents = []) {
      this.state.documents = documents;
      this.notify({ operation: "init", value: documents });
    },
    getDocuments() {
      return this.state.documents;
    },
    addDocument(document) {
      this.state.documents.push(document);
      this.notify({ operation: "add", id: document.id });
    },
    getDocumentNameById(docId) {
      const doc = this.state.documents.find((d) => d.id == docId);
      return doc ? doc.name : null;
    },
    removeDocumentById(docId) {
      this.notify({ key: "documents", operation: "delete", id: docId });
      this.state.documents = this.state.documents.filter((doc) => doc.id != docId);
    },
  },
);
