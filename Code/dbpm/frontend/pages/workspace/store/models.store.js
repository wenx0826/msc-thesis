import { MetaByIdStore } from "./meta-by-id.store.js";

function normalizeModelMeta(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const rawMeta =
    value.meta && typeof value.meta === "object" ? value.meta : {};
  const id = value.id ?? rawMeta.id;
  if (!id) {
    return null;
  }

  const normalized = {
    ...rawMeta,
    ...value,
    id,
  };

  if (!Array.isArray(normalized.versions)) {
    normalized.versions = [];
  }
  if (!Array.isArray(normalized.documentVersionIds)) {
    normalized.documentVersionIds = [];
  }

  normalized.meta = {
    ...rawMeta,
    id: normalized.id,
    name: normalized.name ?? rawMeta.name ?? null,
    latestVersionId: normalized.latestVersionId ?? rawMeta.latestVersionId,
    documentId: normalized.documentId ?? rawMeta.documentId,
  };

  return normalized;
}

class ModelsStore extends MetaByIdStore {
  constructor() {
    super({
      normalizeMeta: normalizeModelMeta,
      initialState: {
        cachedModelsVersionById: {},
      },
    });
  }

  async init(models = []) {
    return super.init(models);
  }

  addModel(value) {
    return this.add(value);
  }

  updateModelById(modelId, updates) {
    const value = this.getMeta(modelId);
    if (!value) {
      return;
    }

    Object.assign(value, updates);

    if (updates?.meta && typeof updates.meta === "object") {
      Object.assign(value.meta, updates.meta);
    }

    if (updates?.name !== undefined) {
      value.meta.name = updates.name;
    }
    if (updates?.latestVersionId !== undefined) {
      value.meta.latestVersionId = updates.latestVersionId;
    }
    if (updates?.documentId !== undefined) {
      value.meta.documentId = updates.documentId;
    }

    this.notify({ key: "models", operation: "update", value });
  }

  setCachedModelByVersionId(versionId, value) {
    if (!versionId) return null;
    this.state.cachedModelsVersionById[versionId] = {
      ...(this.state.cachedModelsVersionById[versionId] || {}),
      ...value,
    };
    return this.state.cachedModelsVersionById[versionId];
  }

  getCachedModelByVersionId(versionId) {
    return this.state.cachedModelsVersionById[versionId] || null;
  }

  getModels() {
    return this.getList();
  }

  getModelById(modelId) {
    return this.getMeta(modelId);
  }

  getModelLatestVersionIdById(modelId) {
    return this.getMeta(modelId)?.latestVersionId || null;
  }

  getModelNameById(modelId) {
    const model = this.getMeta(modelId);
    return model?.name ?? model?.meta?.name ?? null;
  }

  getModelGraphById(modelId) {
    const model = this.getMeta(modelId);
    if (!model) return null;

    const versionId = model.latestVersionId;
    if (versionId) {
      const cachedVersion = this.getCachedModelByVersionId(versionId);
      if (cachedVersion?.svg) {
        return cachedVersion.svg;
      }
    }

    return model.svg || null;
  }

  getModelDocumentIdById(modelId) {
    return this.getMeta(modelId)?.documentId || null;
  }

  async deleteModelById(modelId) {
    const deletedValue = this.getMeta(modelId);
    if (!deletedValue) return;

    delete this.state.metaById[modelId];
    if (deletedValue.latestVersionId) {
      delete this.state.cachedModelsVersionById[deletedValue.latestVersionId];
    }
    this.notify({ key: "models", operation: "delete", value: deletedValue });
  }
}

export default new ModelsStore();
