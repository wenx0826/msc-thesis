import { VersionedEntityStore } from "./versioned-entity.store.js";

function normalizeCachedVersionError(error) {
  const message =
    typeof error?.message === "string" ? error.message.trim() : "";
  if (!message) {
    return null;
  }

  const code =
    typeof error?.code === "string" && error.code.trim()
      ? error.code.trim()
      : "unknown";
  const id =
    typeof error?.id === "string" && error.id.trim() ? error.id.trim() : code;

  return {
    id,
    code,
    message,
    source:
      typeof error?.source === "string" && error.source.trim()
        ? error.source.trim()
        : null,
    modelId:
      typeof error?.modelId === "string" && error.modelId.trim()
        ? error.modelId.trim()
        : null,
    modelVersionId:
      typeof error?.modelVersionId === "string" && error.modelVersionId.trim()
        ? error.modelVersionId.trim()
        : null,
    traceId:
      typeof error?.traceId === "string" && error.traceId.trim()
        ? error.traceId.trim()
        : null,
    createdAt: error?.createdAt || Date.now(),
  };
}

function normalizeCachedVersionErrorList(errors) {
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors.map(normalizeCachedVersionError).filter(Boolean);
}

class ModelsStore extends VersionedEntityStore {
  constructor() {
    super({
      initialState: {
        cachedVersionsById: {},
      },
    });
  }

  init(entities) {
    this.state.cachedVersionsById = {};
    return super.init(entities);
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
    if (!versionId) return null;
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
    const normalizedVersionId =
      versionId === undefined || versionId === null ? null : String(versionId);
    if (!normalizedVersionId) {
      return [];
    }
    const cacheEntry =
      this.getCachedModelByVersionId(normalizedVersionId) || {};
    return normalizeCachedVersionErrorList(cacheEntry.errorList);
  }

  setCachedVersionErrors(versionId, errors) {
    const normalizedVersionId =
      versionId === undefined || versionId === null ? null : String(versionId);
    if (!normalizedVersionId) {
      return [];
    }
    const nextErrors = normalizeCachedVersionErrorList(errors);
    const existingEntry = this.getCachedModelByVersionId(normalizedVersionId);
    if (!existingEntry && nextErrors.length === 0) {
      return [];
    }
    this.addCachedVersion(normalizedVersionId, {
      errorList: nextErrors,
    });
    return [...nextErrors];
  }

  upsertCachedVersionError(versionId, error) {
    const normalizedVersionId =
      versionId === undefined || versionId === null ? null : String(versionId);
    if (!normalizedVersionId) {
      return [];
    }
    const normalizedError = normalizeCachedVersionError(error);
    if (!normalizedError) {
      return this.getCachedVersionErrors(normalizedVersionId);
    }

    const errors = this.getCachedVersionErrors(normalizedVersionId);
    const existingIndex = errors.findIndex(
      (item) => item?.id === normalizedError.id,
    );
    if (existingIndex >= 0) {
      errors[existingIndex] = {
        ...errors[existingIndex],
        ...normalizedError,
      };
    } else {
      errors.push(normalizedError);
    }
    return this.setCachedVersionErrors(normalizedVersionId, errors);
  }

  clearCachedVersionErrors(versionId) {
    const normalizedVersionId =
      versionId === undefined || versionId === null ? null : String(versionId);
    if (!normalizedVersionId) {
      return [];
    }
    return this.setCachedVersionErrors(normalizedVersionId, []);
  }

  clearCachedVersionErrorsByCode(versionId, code) {
    const normalizedVersionId =
      versionId === undefined || versionId === null ? null : String(versionId);
    if (!normalizedVersionId || typeof code !== "string" || !code.trim()) {
      return this.getCachedVersionErrors(normalizedVersionId);
    }
    const normalizedCode = code.trim();
    const errors = this.getCachedVersionErrors(normalizedVersionId).filter(
      (error) => error?.code !== normalizedCode,
    );
    return this.setCachedVersionErrors(normalizedVersionId, errors);
  }

  getModelIdByVersionId(versionId) {
    const normalizedVersionId =
      versionId === undefined || versionId === null ? null : String(versionId);
    if (!normalizedVersionId) {
      return null;
    }
    return (
      this.getList().find((model) =>
        (model.versions || []).some(
          (version) => String(version?.id || "") === normalizedVersionId,
        ),
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
