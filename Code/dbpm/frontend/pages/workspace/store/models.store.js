import { VersionedEntityStore } from "./versioned-entity.store.js";

class ModelsStore extends VersionedEntityStore {
  constructor() {
    super({
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
    const value = this.getEntity(modelId);
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
    return this.getEntity(modelId);
  }

  getModelLatestVersionIdById(modelId) {
    return this.getLatestVersionId(modelId);
  }

  getModelGraphById(modelId) {
    const model = this.getEntity(modelId);
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
    return this.getEntity(modelId)?.documentId || null;
  }

  async deleteModelById(modelId) {
    const deletedValue = this.getEntity(modelId);
    if (!deletedValue) return;

    delete this.state.entitiesById[modelId];
    if (deletedValue.latestVersionId) {
      delete this.state.cachedModelsVersionById[deletedValue.latestVersionId];
    }
    this.notify({ key: "models", operation: "delete", value: deletedValue });
  }
}

export default new ModelsStore();
