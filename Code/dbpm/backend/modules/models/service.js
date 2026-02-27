import modelRepo from "./repositories/model.js";
import versionRepo from "./repositories/version.js";
import storageRepo from "./repositories/storage.js";
import traceRepo from "../traces/repository.js";
import logService from "../logs/service.js";
import { countWords } from "../../utils/fileHelper.js";
import projectsService from "../projects/service.js";
import traceService from "../traces/service.js";
import documentVersionRepo from "../documents/repositories/version.js";
import { injectDbpmMeta, getDescription } from "./utils/dbpmMetaXml.js";

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
    if (!projectId) {
      throw new Error("Document not found or invalid");
    }

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
        trace: createdTrace,
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

    const model = modelRepo.findById(modelId);
    if (!model) {
      throw new Error("Model not found");
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

    const projectId = model.projectId || modelRepo.getProjectIdByModelId(modelId);
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
    modelRepo.updateById(modelId, updates);
    return modelRepo.findById(modelId);
  },
  getModel(modelId) {
    const model = modelRepo.findById(modelId);
    if (!model) {
      throw new Error("Model not found");
    }
    const data = storageRepo.read(modelId);
    model.data = data;
    return model;
  },
  getData(versionId) {
    const model = storageRepo.read(versionId);
    return getDescription(model);
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
  getByProjectId(projectId, includeDeleted) {
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
    const projectId = modelRepo.getProjectIdByModelId(modelId);

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
    const projectId = modelRepo.getProjectIdByModelId(modelId);
    const model = modelRepo.findById(modelId);
    if (!model) {
      throw new Error("Model not found");
    }

    modelRepo.softDelete(modelId);

    // Log the event
    logService.logEvent(projectId, "model_deleted", {
      id: modelId,
      name: model.name,
    });

    return { message: "Model deleted" };
  },
};
