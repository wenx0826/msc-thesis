import { VersionedEntityStore } from "./versioned-entity.store.js";

class DocumentsStore extends VersionedEntityStore {
  constructor() {
    super();
  }
}

export default new DocumentsStore();
