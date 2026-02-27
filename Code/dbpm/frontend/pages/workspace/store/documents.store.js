import { VersionedEntityStore } from "./versioned-entity.store.js";

class DocumentsStore extends VersionedEntityStore {
  constructor() {
    super();
  }
  getFileName(documentId, versionId) {
    const version = this.getVersion(documentId, versionId);
    return version ? version.filename : null;
  }
}

export default new DocumentsStore();
