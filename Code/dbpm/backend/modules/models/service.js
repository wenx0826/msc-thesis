import modelRepo from "./repositories/model.js";
import modelUpdateEventRepo from "./repositories/updateEvent.js";
import versionRepo from "./repositories/version.js";
import storageRepo from "./repositories/storage.js";
import subprocessRepo from "./repositories/subprocess.js";
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

function syncLatestModelAlias(modelId, modelVersionId, content) {
  if (!modelId || !modelVersionId) {
    return;
  }

  const model = modelRepo.findById(modelId, true);
  if (!model || model.latestVersionId !== modelVersionId) {
    return;
  }

  storageRepo.writeByModelId(modelId, content);
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

      // Persist model XML exactly as received from the client.
      storageRepo.write(createdModelVersion.id, modelData);
      modelRepo.updateById(createdModel.id, {
        latestVersionId: createdModelVersion.id,
      });
      storageRepo.writeByModelId(createdModel.id, modelData);

      const createdTrace = traceService.create({
        ...trace,
        modelVersionId: createdModelVersion.id,
      });

      // Log the event
      logService.logEvent(projectId, "model_generated", {
        id: createdModel.id,
        name: modelName,
        data: modelData,
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
    storageRepo.writeByModelId(modelId, sourceModelData);

    const createdTrace = traceService.copyLatestByModelVersionId({
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
      });
    }

    return {
      modelMeta: modelRepo.findByIdWithVersions(modelId),
      versionMeta: createdVersion,
      trace: createdTrace,
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
  updateSubprocessLink({ modelVersionId, taskId, subprocessModelId }) {
    if (!modelVersionId) {
      throw new Error("Model version not found");
    }
    if (!taskId || typeof taskId !== "string") {
      throw new Error("Task not found");
    }

    const sourceVersion = versionRepo.findById(modelVersionId);
    if (!sourceVersion) {
      throw new Error("Model version not found");
    }

    const sourceModel = modelRepo.findById(sourceVersion.modelId, true);
    if (!sourceModel) {
      throw new Error("Model not found");
    }
    if (sourceModel.deletedAt) {
      throw new Error("Model deleted");
    }

    const targetModelId =
      typeof subprocessModelId === "string" ? subprocessModelId.trim() : "";

    if (!targetModelId) {
      subprocessRepo.softDeleteByModelVersionAndTask(modelVersionId, taskId);
      return { message: "Subprocess link removed" };
    }
    if (targetModelId === sourceVersion.modelId) {
      throw new Error("Model cannot reference itself as subprocess");
    }

    const targetModel = modelRepo.findById(targetModelId, true);
    if (!targetModel) {
      throw new Error("Subprocess model not found");
    }
    if (targetModel.deletedAt) {
      throw new Error("Subprocess model deleted");
    }

    subprocessRepo.upsertActive({
      modelVersionId,
      taskId,
      subprocessModelId: targetModelId,
    });
    return { message: "Subprocess link updated" };
  },
  count(includeDeleted = false) {
    return modelRepo.count(includeDeleted);
  },
  getLatestSubprocessLinksByProjectId(projectId, includeDeleted = false) {
    return subprocessRepo.findLatestByProjectId(projectId, includeDeleted);
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
  getUpdateEventsSummaryByProjectId(
    projectId,
    includeDeleted = true,
    models = [],
  ) {
    const countsByType = modelUpdateEventRepo.countByTypeByProjectId(
      projectId,
      includeDeleted,
    );
    const countsByModelType = modelUpdateEventRepo.countByTypeByProjectModelId(
      projectId,
      includeDeleted,
    );
    const countsByModelVersionLevel =
      modelUpdateEventRepo.countByTypeByProjectModelVersionLevel(
        projectId,
        includeDeleted,
      );
    const byType = {};
    let totalCount = 0;

    for (const item of countsByType) {
      const type = typeof item?.type === "string" ? item.type : "unknown";
      const count = Number(item?.count) || 0;
      byType[type] = count;
      totalCount += count;
    }

    const modelMap = new Map();
    const versionLevelMap = new Map();

    function ensureModelSummary(item) {
      const modelId =
        typeof item?.modelId === "string" && item.modelId.length > 0
          ? item.modelId
          : "unknown";

      if (modelMap.has(modelId)) {
        return modelMap.get(modelId);
      }

      const modelSummary = {
        modelId,
        modelName:
          typeof item?.modelName === "string" && item.modelName.length > 0
            ? item.modelName
            : "Unnamed Model",
        deletedAt: item?.modelDeletedAt ?? null,
        totalCount: 0,
        byType: {},
        byVersionLevel: [],
      };
      modelMap.set(modelId, modelSummary);
      return modelSummary;
    }

    for (const model of Array.isArray(models) ? models : []) {
      ensureModelSummary({
        modelId: model?.id,
        modelName: model?.name,
        modelDeletedAt: model?.deletedAt ?? null,
      });
    }

    for (const item of countsByModelType) {
      const modelSummary = ensureModelSummary(item);
      const type = typeof item?.type === "string" ? item.type : "unknown";
      const count = Number(item?.count) || 0;
      modelSummary.byType[type] = count;
      modelSummary.totalCount += count;
    }

    for (const item of countsByModelVersionLevel) {
      const modelSummary = ensureModelSummary(item);
      const type = typeof item?.type === "string" ? item.type : "unknown";
      const count = Number(item?.count) || 0;
      const versionNumber = Number(item?.versionNumber) || 0;

      let modelVersionLevel = modelSummary.byVersionLevel.find(
        (entry) => entry.versionNumber === versionNumber,
      );
      if (!modelVersionLevel) {
        modelVersionLevel = {
          versionNumber,
          totalCount: 0,
          byType: {},
        };
        modelSummary.byVersionLevel.push(modelVersionLevel);
      }
      modelVersionLevel.byType[type] = count;
      modelVersionLevel.totalCount += count;

      let projectVersionLevel = versionLevelMap.get(versionNumber);
      if (!projectVersionLevel) {
        projectVersionLevel = {
          versionNumber,
          totalCount: 0,
          byType: {},
        };
        versionLevelMap.set(versionNumber, projectVersionLevel);
      }
      projectVersionLevel.byType[type] =
        (projectVersionLevel.byType[type] || 0) + count;
      projectVersionLevel.totalCount += count;
    }

    for (const summary of modelMap.values()) {
      summary.byVersionLevel.sort((a, b) => a.versionNumber - b.versionNumber);
    }

    const byVersionLevel = Array.from(versionLevelMap.values()).sort(
      (a, b) => a.versionNumber - b.versionNumber,
    );
    const byModel = Array.from(modelMap.values());

    return { totalCount, byType, byVersionLevel, byModel };
  },
  attachUpdatesStatsToModels(models = [], modelUpdateEventsSummary = null) {
    const byModel = Array.isArray(modelUpdateEventsSummary?.byModel)
      ? modelUpdateEventsSummary.byModel
      : [];
    const summaryByModelId = new Map(
      byModel
        .filter((entry) => typeof entry?.modelId === "string")
        .map((entry) => [entry.modelId, entry]),
    );

    const toSummaryArray = (byType = {}) =>
      Object.entries(byType || {})
        .map(([type, count]) => ({
          type,
          count: Number(count) || 0,
        }))
        .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

    return (Array.isArray(models) ? models : []).map((model) => {
      const modelSummary = summaryByModelId.get(model?.id);
      const byVersionLevel = Array.isArray(modelSummary?.byVersionLevel)
        ? modelSummary.byVersionLevel
        : [];
      const versionSummaryByNumber = new Map(
        byVersionLevel.map((entry) => [
          Number(entry.versionNumber) || 0,
          entry,
        ]),
      );

      const versions = (
        Array.isArray(model?.versions) ? model.versions : []
      ).map((version) => {
        const versionSummary = versionSummaryByNumber.get(
          Number(version?.versionNumber) || 0,
        );
        return {
          ...version,
          updatesStats: toSummaryArray(versionSummary?.byType || {}),
        };
      });

      return {
        ...model,
        versions,
        updatesStats: toSummaryArray(modelSummary?.byType || {}),
      };
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
    const projectId =
      model.projectId || modelRepo.getProjectIdByModelId(modelId);

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
    syncLatestModelAlias(modelId, versionId, enrichedModelData);

    // Store model update event for this version.
    const details = {
      modelId,
      ...(typeof words === "number" ? { words } : {}),
    };
    modelUpdateEventRepo.add({
      modelVersionId: versionId,
      type,
      details: Object.keys(details).length > 0 ? details : null,
    });

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

    const projectId =
      model.projectId || modelRepo.getProjectIdByModelId(modelId);

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
      const projectId =
        model.projectId || modelRepo.getProjectIdByModelId(modelId);
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
        const modelVersion = versionRepo.findById(modelVersionId);
        syncLatestModelAlias(
          modelVersion?.modelId ?? null,
          modelVersionId,
          enrichedModelData,
        );
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
