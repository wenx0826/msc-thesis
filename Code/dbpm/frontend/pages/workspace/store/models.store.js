import { VersionedEntityStore } from "./versioned-entity.store.js";

class ModelsStore extends VersionedEntityStore {
  constructor() {
    super({
      initialState: {
        cachedVersionsById: {}, // { [versionId]: { modelId?, dataXml?, svg?, status?, error?, errors? } }
      },
    });
  }

  init(entities) {
    super.init(entities);
    this.state.cachedVersionsById = {};
  }

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
        key: versionId,
        ...newValue,
      },
      oldValue: oldValue ? { key: versionId, ...oldValue } : null,
    });
    return newValue;
  }
  setCachedVersionData(versionId, value) {
    return this.addCachedVersion(versionId, value);
  }
  // todo getCache
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
