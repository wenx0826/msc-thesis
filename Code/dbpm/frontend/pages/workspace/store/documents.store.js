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
    add(document) {
      console.log("Adding document to store:", document);
      this.state.documentsById[document.id] = document;
      this.notify({ operation: "add", value: document });
    },
    deleteDocument(docId) {
      delete this.state.documentsById[docId];
      this.notify({ operation: "delete", id: docId });
    },
    getDocumentVersions(docId) {
      return this.state.documentsById[docId]?.versions || [];
    },
    getDocumentVersionName(docId, versionId) {
      const versions = this.getDocumentVersions(docId);
      const version = versions.find((v) => v.id === versionId);
      return version ? version.name : null;
    },
    addDocumentVersion(version) {
      // console.log(`Adding version to document ${docId}:`, version);
      const doc = this.state.documentsById[version.documentId];
      doc.versions.push(version);
      this.notify({ operation: "versions.add", value: version });
    },
    updateDocumentVersion(newVersion) {
      const doc = this.state.documentsById[newVersion.documentId];
      const versionIndex = doc.versions.findIndex(
        (v) => v.id === newVersion.id,
      );
      if (versionIndex !== -1) {
        doc.versions[versionIndex] = newVersion;
        // this.notify({ operation: "versions.update", value: newVersion });
      }
    },
  },
);
