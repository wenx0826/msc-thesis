import { MetaByIdStore } from "./meta-by-id.store.js";

function normalizeDocumentMeta(value) {
  if (!value || typeof value !== "object" || !value.id) {
    return null;
  }

  const normalized = { ...value };
  if (!Array.isArray(normalized.versions)) {
    normalized.versions = [];
  }
  return normalized;
}

class DocumentsStore extends MetaByIdStore {
  constructor() {
    super({
      normalizeMeta: normalizeDocumentMeta,
    });
  }

  getDocuments() {
    return this.getList();
  }

  getDocumentById(documentId) {
    return this.getMeta(documentId);
  }

  removeDocument(documentId) {
    return this.delete(documentId);
  }
}

export default new DocumentsStore();
