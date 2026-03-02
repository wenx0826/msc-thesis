import { VersionedEntityStore } from "./versioned-entity.store.js";

class ModelsStore extends VersionedEntityStore {
  constructor() {
    super({
      initialState: {
        cachedVersionsById: {},
      },
    });
  }

  // updateModelById(modelId, updates) {
  //   const value = this.getEntity(modelId);
  //   if (!value) {
  //     return;
  //   }

  //   Object.assign(value, updates);

  //   if (updates?.meta && typeof updates.meta === "object") {
  //     Object.assign(value.meta, updates.meta);
  //   }

  //   if (updates?.name !== undefined) {
  //     value.meta.name = updates.name;
  //   }
  //   if (updates?.latestVersionId !== undefined) {
  //     value.meta.latestVersionId = updates.latestVersionId;
  //   }
  //   if (updates?.documentId !== undefined) {
  //     value.meta.documentId = updates.documentId;
  //   }

  //   this.notify({ key: "models", operation: "update", value });
  // }
  hasCachedVersion(versionId) {
    return !!this.state.cachedVersionsById[versionId];
  }
  addCachedVersion(versionId, value) {
    this.state.cachedVersionsById[versionId] = {
      ...(this.state.cachedVersionsById[versionId] || {}),
      ...value,
    };
    return this.state.cachedVersionsById[versionId];
  }
  setCachedVersionData(versionId, value) {
    if (!versionId) return null;
    this.state.cachedVersionsById[versionId] = {
      ...(this.state.cachedVersionsById[versionId] || {}),
      ...value,
    };
    return this.state.cachedVersionsById[versionId];
  }

  getCachedModelByVersionId(versionId) {
    return this.state.cachedVersionsById[versionId] || null;
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

  getModelDocumentId(modelId) {
    return this.getEntity(modelId)?.documentId || null;
  }
}

export default new ModelsStore();
