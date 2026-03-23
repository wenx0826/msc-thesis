import modelRepo from "./repositories/model.js";
import modelVersionEventRepo from "./repositories/versionEvent.js";
import modelGenerationAttemptRepo from "./repositories/generationAttempt.js";
import versionRepo from "./repositories/version.js";
import storageRepo from "./repositories/storage.js";
import subprocessRepo from "./repositories/subprocess.js";
import logService from "../logs/service.js";
import { countWords } from "../../utils/fileHelper.js";
import projectsService from "../projects/service.js";
import documentModelLinkService from "../document_model_links/service.js";
import documentVersionRepo from "../documents/repositories/version.js";
import { injectDbpmMeta } from "./utils/dbpmMetaXml.js";

function selectionsToExactTexts(selections) {
  if (!Array.isArray(selections)) {
    return [];
  }
  return selections
    .map((selection) =>
      typeof selection?.textQuote?.exact === "string"
        ? selection.textQuote.exact.trim()
        : "",
    )
    .filter(Boolean);
}

function pickLatestLinksByModelVersionId(links) {
  const linksByModelVersionId = new Map();

  for (const link of links || []) {
    const modelVersionId = link?.modelVersionId;
    if (!modelVersionId) {
      continue;
    }

    const existingLink = linksByModelVersionId.get(modelVersionId);
    if (!existingLink) {
      linksByModelVersionId.set(modelVersionId, link);
      continue;
    }

    const existingCreatedAt = existingLink.createdAt || "";
    const currentCreatedAt = link.createdAt || "";
    if (currentCreatedAt >= existingCreatedAt) {
      linksByModelVersionId.set(modelVersionId, link);
    }
  }

  return [...linksByModelVersionId.values()];
}

function enrichModelData(
  modelData,
  documentVersionId,
  selections,
  {
    prompt = null,
    type = null,
    modelId = null,
    modelVersionId = null,
    modelVersionName = null,
  } = {},
) {
  if (!documentVersionId) {
    return modelData;
  }

  const documentInfo =
    documentVersionRepo.findDocumentInfoByVersionId(documentVersionId);
  if (!documentInfo) {
    return modelData;
  }

  const isReset = !type || type.startsWith("regeneration_");

  return injectDbpmMeta(modelData, {
    ...documentInfo,
    selections: selectionsToExactTexts(selections),
    prompt,
    isReset,
    modelId,
    modelVersionId,
    modelVersionName,
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

function countSelectedWords(selections) {
  return (Array.isArray(selections) ? selections : []).reduce(
    (acc, sel) => acc + countWords(sel?.textQuote?.exact ?? ""),
    0,
  );
}

function resolveValidatedCreateVersionContext({ modelId, sourceVersionId }) {
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

  return { model, sourceVersion };
}

function createNextVersionRecord({
  modelId,
  sourceVersionId,
  reason,
  selectedWordsCount,
}) {
  const latestVersionNumber = modelRepo.allocateLatestVersionNumber(modelId);
  if (!latestVersionNumber) {
    throw new Error("Failed to allocate model version number");
  }

  return versionRepo.create({
    modelId,
    restoredFrom: reason === "revert" ? sourceVersionId : null,
    versionNumber: latestVersionNumber,
    name: `v${latestVersionNumber}`,
    selectedWordsCount,
  });
}

function persistCreatedVersionContent({
  modelId,
  createdVersionId,
  modelData,
}) {
  storageRepo.write(createdVersionId, modelData);
  modelRepo.updateById(modelId, {
    latestVersionId: createdVersionId,
  });
  storageRepo.writeByModelId(modelId, modelData);
}

function recordVersionCreation({
  model,
  modelId,
  sourceVersionId,
  createdVersionId,
  reason,
  mode,
  type = null,
  selectedWordsCount,
}) {
  if (mode === "copy") {
    modelVersionEventRepo.add({
      modelVersionId: createdVersionId,
      type:
        reason === "revert"
          ? "manual_new_version_revert"
          : "manual_new_version_latest",
      selectedWordsCount: selectedWordsCount ?? null,
    });
  }

  const projectId = model.projectId || modelRepo.getProjectIdByModelId(modelId);
  if (projectId) {
    logService.logEvent(projectId, "model_version_created", {
      modelId,
      sourceVersionId,
      newVersionId: createdVersionId,
      reason,
      mode,
      ...(type ? { type } : {}),
    });
  }
}

export default {
  createModelAndLink({ projectId, modelData, link, prompt = null }) {
    const latestModelNumber =
      projectsService.allocateLatestModelNumberById(projectId);
    const modelName = `Model_${latestModelNumber}`;

    const selections = Array.isArray(link?.selections) ? link.selections : [];
    const selectedWordsCount = selections.reduce(
      (acc, sel) => acc + countWords(sel?.textQuote?.exact ?? ""),
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
        restoredFrom: null,
        versionNumber: latestVersionNumber,
        name: `v${latestVersionNumber}`,
        selectedWordsCount,
      });

      const enrichedModelData = enrichModelData(
        modelData,
        link?.documentVersionId ?? null,
        selections,
        {
          prompt,
          type: null,
          modelId: createdModel.id,
          modelVersionId: createdModelVersion.id,
          modelVersionName: createdModelVersion.name,
        },
      );
      storageRepo.write(createdModelVersion.id, enrichedModelData);
      modelRepo.updateById(createdModel.id, {
        latestVersionId: createdModelVersion.id,
      });
      storageRepo.writeByModelId(createdModel.id, enrichedModelData);

      const createdLink = documentModelLinkService.create({
        ...link,
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
        link: createdLink,
      };
    } catch (err) {
      throw err;
    }
  },
  createVersion({
    modelId,
    sourceVersionId,
    reason,
    mode = null,
    type = null,
    modelData = null,
    link = null,
    prompt = null,
  }) {
    const { model, sourceVersion } = resolveValidatedCreateVersionContext({
      modelId,
      sourceVersionId,
    });
    const normalizedReason = reason === "revert" ? "revert" : "new_version";
    const inferredPayloadMode =
      mode === "payload" ||
      (typeof modelData === "string" && modelData.trim()) ||
      !!link;
    const normalizedMode = inferredPayloadMode ? "payload" : "copy";

    if (normalizedMode === "payload" && normalizedReason !== "new_version") {
      throw new Error(
        "Payload version creation only supports reason 'new_version'",
      );
    }

    let selectedWordsCount = 0;
    let createdVersion = null;
    let createdLink = null;

    if (normalizedMode === "payload") {
      if (typeof modelData !== "string" || !modelData.trim()) {
        throw new Error("Model data is required for payload version creation");
      }
      if (!link || typeof link !== "object") {
        throw new Error("Link is required for payload version creation");
      }

      const selections = Array.isArray(link.selections) ? link.selections : [];
      selectedWordsCount = countSelectedWords(selections);
      createdVersion = createNextVersionRecord({
        modelId,
        sourceVersionId,
        reason: normalizedReason,
        selectedWordsCount,
      });

      const enrichedModelData = enrichModelData(
        modelData,
        typeof link.documentVersionId === "string"
          ? link.documentVersionId
          : null,
        selections,
        {
          prompt,
          type,
          modelId,
          modelVersionId: createdVersion.id,
          modelVersionName: createdVersion.name,
        },
      );
      persistCreatedVersionContent({
        modelId,
        createdVersionId: createdVersion.id,
        modelData: enrichedModelData,
      });

      createdLink = documentModelLinkService.create({
        documentVersionId: link.documentVersionId,
        modelVersionId: createdVersion.id,
        selections,
      });
    } else {
      const sourceModelData = storageRepo.read(sourceVersionId);
      selectedWordsCount =
        typeof sourceVersion.selectedWordsCount === "number"
          ? sourceVersion.selectedWordsCount
          : 0;
      createdVersion = createNextVersionRecord({
        modelId,
        sourceVersionId,
        reason: normalizedReason,
        selectedWordsCount,
      });

      persistCreatedVersionContent({
        modelId,
        createdVersionId: createdVersion.id,
        modelData: sourceModelData,
      });

      createdLink = documentModelLinkService.copyLatestByModelVersionId({
        sourceModelVersionId: sourceVersionId,
        targetModelVersionId: createdVersion.id,
      });
    }

    recordVersionCreation({
      model,
      modelId,
      sourceVersionId,
      createdVersionId: createdVersion.id,
      reason: normalizedReason,
      mode: normalizedMode,
      type,
      selectedWordsCount,
    });

    return {
      modelMeta: modelRepo.findByIdWithVersions(modelId),
      versionMeta: createdVersion,
      link: createdLink,
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
    const countsByType = modelVersionEventRepo.countByTypeByProjectId(
      projectId,
      includeDeleted,
    );
    const countsByModelType = modelVersionEventRepo.countByTypeByProjectModelId(
      projectId,
      includeDeleted,
    );
    const countsByModelVersionLevel =
      modelVersionEventRepo.countByTypeByProjectModelVersionLevel(
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
  /**
   * Record a model generation attempt (new, regeneration, or refinement).
   * Should be called from the generation flow after the user accepts or declines.
   */
  recordGenerationAttempt({
    projectId,
    baseModelVersionId = null,
    resultModelVersionId = null,
    generationType,
    generationInputMode,
    result,
    prompt = null,
    selectedWordsCount = null,
    selectedTextSimilarity = null,
  }) {
    return modelGenerationAttemptRepo.add({
      projectId,
      baseModelVersionId,
      resultModelVersionId,
      generationType,
      generationInputMode,
      result,
      prompt,
      selectedWordsCount,
      selectedTextSimilarity,
    });
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

  updateVersion({ versionId, modelData, link, type, prompt = null }) {
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

    const currentLink =
      documentModelLinkService.getLatestByModelVersionId(versionId);
    let documentVersionId = currentLink?.documentVersionId ?? null;
    let effectiveSelections = Array.isArray(currentLink?.selections)
      ? currentLink.selections
      : [];

    let words = null;
    if (link) {
      effectiveSelections = Array.isArray(link.selections)
        ? link.selections
        : [];
      words = effectiveSelections.reduce(
        (acc, sel) => acc + countWords(sel?.textQuote?.exact ?? ""),
        0,
      );
      const linkIdToUpdate =
        typeof link.id === "string" ? link.id : currentLink?.id;
      if (linkIdToUpdate) {
        documentModelLinkService.update(linkIdToUpdate, {
          selections: effectiveSelections,
        });
      }
      documentVersionId =
        documentVersionId ||
        (typeof link.documentVersionId === "string"
          ? link.documentVersionId
          : null);
    }

    const enrichedModelData = enrichModelData(
      modelData,
      documentVersionId,
      effectiveSelections,
      {
        prompt,
        type,
        modelId,
        modelVersionId: versionId,
        modelVersionName: version.name,
      },
    );
    storageRepo.write(versionId, enrichedModelData);
    syncLatestModelAlias(modelId, versionId, enrichedModelData);

    // Record version event for manual edits and lifecycle changes.
    // Regeneration outcomes are recorded separately via recordGenerationAttempt().
    const regenerationTypes = [
      "regeneration_by_selections",
      "regeneration_by_prompt",
    ];
    if (!regenerationTypes.includes(type)) {
      modelVersionEventRepo.add({
        modelVersionId: versionId,
        type,
        selectedWordsCount: typeof words === "number" ? words : null,
      });
    }

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

    const links = documentModelLinkService.getLatestByDocumentVersionId(
      documentVersionId,
      true,
    );
    const latestLinks = pickLatestLinksByModelVersionId(links);

    let updated = 0;
    let failed = 0;
    let skipped = 0;
    for (const link of latestLinks) {
      const modelVersionId = link?.modelVersionId;
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

        const modelVersion = versionRepo.findById(modelVersionId);
        const enrichedModelData = injectDbpmMeta(modelData, {
          ...documentInfo,
          selections: selectionsToExactTexts(link?.selections),
          modelId: modelVersion?.modelId ?? null,
          modelVersionId,
          modelVersionName: modelVersion?.name ?? null,
        });
        storageRepo.write(modelVersionId, enrichedModelData);
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
