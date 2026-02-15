// Documents Store - Documents list state
import { createDomainStore } from "./createStore.js";
import { documentsAPI } from "../../../api/index.js";
import { workspaceStore } from "./workspace.store.js";

export const documentsStore = Object.assign(
  createDomainStore({
    documents: [],
  }),
  {
    async init(projectId) {
      const documents = await documentsAPI.getByProjectId(projectId);
      this.state.documents = documents;
      this.notify({ operation: "init" });
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
    async createDocument(doc) {
      const projectId = workspaceStore.getProjectId();
      const newDoc = await documentsAPI.createDocument({ ...doc, projectId });
      this.state.documents.push(newDoc);
      this.notify({ operation: "add", id: newDoc.id });
      return newDoc.id;
    },
    async deleteDocumentById(docId) {
      this.notify({ key: "documents", operation: "delete", id: docId });
      this.state.documents = this.state.documents.filter(
        (doc) => doc.id != docId,
      );
      documentsAPI.deleteDocumentById(docId);
    },
  },
);
