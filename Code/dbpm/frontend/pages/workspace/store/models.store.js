import { VersionedEntityStore } from "./versioned-entity.store.js";

class ModelsStore extends VersionedEntityStore {
  constructor() {
    super({
      initialState: {
        cachedVersionsById: {},
      },
    });
  }

  init(entities) {
    super.init(entities);
    this.state.cachedVersionsById = {};
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
    const oldValue = this.state.cachedVersionsById[versionId] || null;
    const operation = oldValue ? "update" : "add";
    const newValue = {
      ...(oldValue || {}),
      ...value,
    };
    this.state.cachedVersionsById[versionId] = newValue;
    this.notify({
      key: "cachedVersionsById",
      operation,
      value: {
        versionId,
        ...newValue,
      },
      oldValue: oldValue ? { versionId, ...oldValue } : null,
    });
    return newValue;
  }
  setCachedVersionData(versionId, value) {
    return this.addCachedVersion(versionId, value);
  }

  getCachedModelByVersionId(versionId) {
    return this.state.cachedVersionsById[versionId] || null;
  }

  getCachedVersionErrors(versionId) {
    const cacheEntry = this.getCachedModelByVersionId(versionId) || {};
    return Array.isArray(cacheEntry.errors) ? [...cacheEntry.errors] : [];
  }

  setCachedVersionErrors(versionId, errors) {
    const nextErrors = Array.isArray(errors) ? [...errors] : [];
    const existingEntry = this.getCachedModelByVersionId(versionId);
    if (!existingEntry && nextErrors.length === 0) {
      return [];
    }
    this.addCachedVersion(versionId, {
      errors: nextErrors,
    });
    return [...nextErrors];
  }

  upsertCachedVersionError(versionId, error) {
    const errors = this.getCachedVersionErrors(versionId);
    const existingIndex = errors.findIndex((item) => item.id === error.id);
    if (existingIndex >= 0) {
      errors[existingIndex] = {
        ...errors[existingIndex],
        ...error,
      };
    } else {
      errors.push(error);
    }
    return this.setCachedVersionErrors(versionId, errors);
  }

  clearCachedVersionErrors(versionId) {
    return this.setCachedVersionErrors(versionId, []);
  }

  clearCachedVersionErrorsByCode(versionId, code) {
    const errors = this.getCachedVersionErrors(versionId).filter(
      (error) => error.code !== code,
    );
    return this.setCachedVersionErrors(versionId, errors);
  }

  getModelIdByVersionId(versionId) {
    return (
      this.getList().find((model) =>
        (model.versions || []).some((version) => version?.id === versionId),
      )?.id || null
    );
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
