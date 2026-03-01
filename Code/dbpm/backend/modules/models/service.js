import modelRepo from "./repositories/model.js";
import versionRepo from "./repositories/version.js";
import storageRepo from "./repositories/storage.js";
import traceRepo from "../traces/repository.js";
import logService from "../logs/service.js";
import { countWords } from "../../utils/fileHelper.js";
import projectsService from "../projects/service.js";
import traceService from "../traces/service.js";
import documentVersionRepo from "../documents/repositories/version.js";
import { injectDbpmMeta } from "./utils/dbpmMetaXml.js";

function selectionsToText(selections) {
  if (!Array.isArray(selections)) {
    return "";
  }
  return selections
    .map((selection) =>
      typeof selection?.text === "string" ? selection.text.trim() : "",
    )
    .filter(Boolean)
    .join(" ");
}

function pickLatestTracesByModelVersionId(traces) {
  const tracesByModelVersionId = new Map();

  for (const trace of traces || []) {
    const modelVersionId = trace?.modelVersionId;
    if (!modelVersionId) {
      continue;
    }

    const existingTrace = tracesByModelVersionId.get(modelVersionId);
    if (!existingTrace) {
      tracesByModelVersionId.set(modelVersionId, trace);
      continue;
    }

    const existingCreatedAt = existingTrace.createdAt || "";
    const currentCreatedAt = trace.createdAt || "";
    if (currentCreatedAt >= existingCreatedAt) {
      tracesByModelVersionId.set(modelVersionId, trace);
    }
  }

  return [...tracesByModelVersionId.values()];
}

function enrichModelData(modelData, documentVersionId, selections) {
  if (!documentVersionId) {
    return modelData;
  }

  const documentInfo =
    documentVersionRepo.findDocumentInfoByVersionId(documentVersionId);
  if (!documentInfo) {
    return modelData;
  }

  return injectDbpmMeta(modelData, {
    ...documentInfo,
    selectedText: selectionsToText(selections),
  });
}

export default {
  createModelAndTrace({ projectId, modelData, trace }) {
    const latestModelNumber =
      projectsService.allocateLatestModelNumberById(projectId);
    const modelName = `Model_${latestModelNumber}`;

    const selections = Array.isArray(trace.selections) ? trace.selections : [];
    const selectedWordsCount = selections.reduce(
      (acc, sel) => acc + countWords(sel?.text ?? ""),
      0,
    );
    const enrichedModelData = enrichModelData(
      modelData,
      trace.documentVersionId,
      selections,
    );

    try {
      const createdModel = modelRepo.create({ projectId, name: modelName });
      const latestVersionNumber = modelRepo.allocateLatestVersionNumber(
        createdModel.id,
      );
      if (!latestVersionNumber) {
        throw new Error("Failed to allocate model version number");
      }
      const createdModelVersion = versionRepo.create({
        modelId: createdModel.id,
        versionNumber: latestVersionNumber,
        name: `v${latestVersionNumber}`,
        selectedWordsCount,
      });

      // Persist model XML for this version.
      storageRepo.write(createdModelVersion.id, enrichedModelData);
      modelRepo.updateById(createdModel.id, {
        latestVersionId: createdModelVersion.id,
      });

      const createdTrace = traceService.create({
        ...trace,
        modelVersionId: createdModelVersion.id,
      });

      // Log the event
      logService.logEvent(projectId, "model_generated", {
        id: createdModel.id,
        name: modelName,
        data: enrichedModelData,
      });

      return {
        modelMeta: modelRepo.findByIdWithVersions(createdModel.id),
        trace: traceService.getById(createdTrace.id),
      };
    } catch (err) {
      throw err;
    }
  },
  createVersion({ modelId, sourceVersionId, reason }) {
    if (!modelId) {
      throw new Error("Model not found");
    }
    if (!sourceVersionId) {
      throw new Error("Source model version not found");
    }

    const model = modelRepo.findById(modelId, true);
    if (!model) {
      throw new Error("Model not found");
    }
    if (model.deletedAt) {
      throw new Error("Model deleted");
    }

    const sourceVersion = versionRepo.findById(sourceVersionId);
    if (!sourceVersion) {
      throw new Error("Source model version not found");
    }
    if (sourceVersion.modelId !== modelId) {
      throw new Error("Source version does not belong to the model");
    }

    const normalizedReason = reason === "revert" ? "revert" : "new_version";
    const sourceModelData = storageRepo.read(sourceVersionId);
    const latestVersionNumber = modelRepo.allocateLatestVersionNumber(modelId);
    if (!latestVersionNumber) {
      throw new Error("Failed to allocate model version number");
    }

    const selectedWordsCount =
      typeof sourceVersion.selectedWordsCount === "number"
        ? sourceVersion.selectedWordsCount
        : 0;
    const createdVersion = versionRepo.create({
      modelId,
      versionNumber: latestVersionNumber,
      name: `v${latestVersionNumber}`,
      selectedWordsCount,
    });

    storageRepo.write(createdVersion.id, sourceModelData);
    modelRepo.updateById(modelId, {
      latestVersionId: createdVersion.id,
    });

    const copiedTraces = traceService.copyByModelVersionId({
      sourceModelVersionId: sourceVersionId,
      targetModelVersionId: createdVersion.id,
    });

    const projectId =
      model.projectId || modelRepo.getProjectIdByModelId(modelId);
    if (projectId) {
      logService.logEvent(projectId, "model_version_created", {
        modelId,
        sourceVersionId,
        newVersionId: createdVersion.id,
        reason: normalizedReason,
        copiedTracesCount: copiedTraces.length,
      });
    }

    return {
      modelMeta: modelRepo.findByIdWithVersions(modelId),
      newVersion: createdVersion,
      copiedTracesCount: copiedTraces.length,
    };
  },
  updateMeta(modelId, updates) {
    const model = modelRepo.findById(modelId, true);
    if (!model) {
      throw new Error("Model not found");
    }
    if (model.deletedAt) {
      throw new Error("Model deleted");
    }
    modelRepo.updateById(modelId, updates);
    return modelRepo.findById(modelId);
  },
  getModel(modelId) {
    const model = modelRepo.findById(modelId);
    if (!model) {
      throw new Error("Model not found");
    }
    if (!model.latestVersionId) {
      throw new Error("Model has no versions");
    }
    const data = storageRepo.read(model.latestVersionId);
    model.data = data;
    return model;
  },
  getData(versionId) {
    return storageRepo.read(versionId);
  },
  count(includeDeleted = false) {
    return modelRepo.count(includeDeleted);
  },
  getAverageSelectedWordsCount(includeDeleted = false) {
    return modelRepo.getAverageSelectedWordsCount(includeDeleted);
  },
  getAverageVersionsCount(includeDeleted = false) {
    return modelRepo.getAverageVersionsCount(includeDeleted);
  },
  getByProjectId(projectId, includeDeleted = false) {
    return modelRepo.findByProjectIdWithVersions(projectId, includeDeleted);
  },
  updateModel({ modelId, modelData, trace, type }) {
    const model = modelRepo.findById(modelId);
    if (!model) {
      throw new Error("Model not found");
    }
    if (!model.latestVersionId) {
      throw new Error("Model has no versions");
    }

    return this.updateVersion({
      versionId: model.latestVersionId,
      modelData,
      trace,
      type,
    });
  },
  updateVersion({ versionId, modelData, trace, type }) {
    const version = versionRepo.findById(versionId);
    if (!version) {
      throw new Error("Model version not found");
    }
    const modelId = version.modelId;
    const model = modelRepo.findById(modelId);
    if (!model) {
      throw new Error("Model not found");
    }
    const projectId = model.projectId || modelRepo.getProjectIdByModelId(modelId);

    // Update model status
    // modelRepo.updateStatus(modelId, "updated");

    const currentTrace = traceRepo.findLatestByModelVersionId(versionId);
    let documentVersionId = currentTrace?.documentVersionId ?? null;
    let effectiveSelections = Array.isArray(currentTrace?.selections)
      ? currentTrace.selections
      : [];

    let words = null;
    if (trace) {
      effectiveSelections = Array.isArray(trace.selections)
        ? trace.selections
        : [];
      words = effectiveSelections.reduce(
        (acc, sel) => acc + countWords(sel?.text ?? ""),
        0,
      );
      const traceIdToUpdate =
        typeof trace.id === "string" ? trace.id : currentTrace?.id;
      if (traceIdToUpdate) {
        traceRepo.updateById(traceIdToUpdate, {
          selections: effectiveSelections,
        });
      }
      documentVersionId =
        documentVersionId ||
        (typeof trace.documentVersionId === "string"
          ? trace.documentVersionId
          : null);
    }

    const enrichedModelData = enrichModelData(
      modelData,
      documentVersionId,
      effectiveSelections,
    );
    storageRepo.write(versionId, enrichedModelData);

    // Add stat update
    modelRepo.addStatUpdate(modelId, new Date().toISOString(), type, words);

    // Log the event
    logService.logEvent(projectId, `model_updated_${type}`, {
      id: modelId,
      versionId,
      data: enrichedModelData,
    });

    return { message: "Model content updated" };
  },

  deleteModel(modelId) {
    const model = modelRepo.findById(modelId, true);
    if (!model) {
      throw new Error("Model not found");
    }
    if (model.deletedAt) {
      return { message: "Model deleted" };
    }

    const result = modelRepo.softDelete(modelId);
    if (result.changes === 0) {
      return { message: "Model deleted" };
    }

    const projectId = model.projectId || modelRepo.getProjectIdByModelId(modelId);

    // Log the event
    logService.logEvent(projectId, "model_deleted", {
      id: modelId,
      name: model.name,
    });

    return { message: "Model deleted" };
  },
  restoreModel(modelId) {
    const model = modelRepo.findById(modelId, true);
    if (!model) {
      throw new Error("Model not found");
    }
    if (!model.deletedAt) {
      return modelRepo.findByIdWithVersions(modelId, true);
    }

    const result = modelRepo.restore(modelId);
    if (result.changes > 0) {
      const projectId =
        model.projectId || modelRepo.getProjectIdByModelId(modelId);
      logService.logEvent(projectId, "model_restored", {
        id: model.id,
        name: model.name,
      });
    }

    return modelRepo.findByIdWithVersions(modelId, true);
  },
  deleteModelsByDocumentId(documentId, { source } = {}) {
    if (!documentId) {
      return { deletedModelIds: [], deletedCount: 0 };
    }

    const deletedModelIds = [];
    const relatedModelIds = modelRepo.findIdsByDocumentId(documentId, false);
    for (const modelId of relatedModelIds) {
      const model = modelRepo.findById(modelId, true);
      if (!model || model.deletedAt) {
        continue;
      }

      const result = modelRepo.softDelete(modelId);
      if (result.changes === 0) {
        continue;
      }

      deletedModelIds.push(modelId);
      const projectId = model.projectId || modelRepo.getProjectIdByModelId(modelId);
      logService.logEvent(projectId, "model_deleted", {
        id: modelId,
        name: model.name,
        ...(source ? { source } : {}),
        sourceDocumentId: documentId,
      });
    }

    return { deletedModelIds, deletedCount: deletedModelIds.length };
  },
  rewriteModelXmlByDocumentVersion(documentVersionId) {
    const documentInfo =
      documentVersionRepo.findDocumentInfoByVersionId(documentVersionId);
    if (!documentInfo) {
      return { updated: 0, failed: 0, skipped: 0 };
    }

    const traces = traceService.getByDocumentVersionId(documentVersionId, true);
    const latestTraces = pickLatestTracesByModelVersionId(traces);

    let updated = 0;
    let failed = 0;
    let skipped = 0;
    for (const trace of latestTraces) {
      const modelVersionId = trace?.modelVersionId;
      if (!modelVersionId) {
        skipped += 1;
        continue;
      }

      try {
        const modelData = storageRepo.read(modelVersionId);
        if (!modelData) {
          skipped += 1;
          continue;
        }

        const enrichedModelData = injectDbpmMeta(modelData, {
          ...documentInfo,
          selectedText: selectionsToText(trace?.selections),
        });
        storageRepo.write(modelVersionId, enrichedModelData);
        updated += 1;
      } catch (error) {
        failed += 1;
        console.error("Failed to rewrite model XML for document update", {
          documentVersionId,
          modelVersionId,
          error: error?.message || String(error),
        });
      }
    }

    return { updated, failed, skipped };
  },
  scheduleModelXmlRewriteByDocumentVersion(documentVersionId) {
    if (!documentVersionId) {
      return;
    }

    setImmediate(() => {
      try {
        const result = this.rewriteModelXmlByDocumentVersion(documentVersionId);
        console.log("Background model XML rewrite completed", {
          documentVersionId,
          ...result,
        });
      } catch (error) {
        console.error("Background model XML rewrite failed", {
          documentVersionId,
          error: error?.message || String(error),
        });
      }
    });
  },
};
