import { VersionedEntityStore } from "./versioned-entity.store.js";

class DocumentsStore extends VersionedEntityStore {
  constructor() {
    super();
  }

  getDocuments() {
    return this.getList();
  }

  getDocumentById(documentId) {
    return this.getEntity(documentId);
  }

  removeDocument(documentId) {
    return this.delete(documentId);
  }
}

export default new DocumentsStore();
