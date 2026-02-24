import crypto from "crypto";
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
    // const projectId = documentsService.getProjectId(trace.documentId);
    if (!projectId) {
      throw new Error("Document not found or invalid");
    }

    const modelGenerationIndex =
      projectsService.getModelGenerationIndexById(projectId);
    const nextModelGenerationIndex = modelGenerationIndex + 1;
    const name = `Model_${nextModelGenerationIndex}`;
    const id = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    trace.modelVersionId = versionId;
    trace.id = crypto.randomUUID();

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
      // Persist model XML for this version.
      storageRepo.write(versionId, enrichedModelData);
      const createdModel = modelRepo.create({
        id,
        projectId,
      });
      const createdModelVersion = versionRepo.create({
        id: versionId,
        modelId: id,
        name,
        selectedWordsCount,
      });

      modelRepo.update(id, { latestVersionId: versionId });
      projectsService.update(projectId, {
        modelGenerationIndex: nextModelGenerationIndex,
      });

      const createdTrace = traceService.create({ ...trace });

      // Log the event
      logService.logEvent(projectId, "model_generated", {
        id: id,
        name,
        data: enrichedModelData,
      });

      return {
        model: {
          ...createdModel,
          latestVersionId: versionId,
          versions: [createdModelVersion],
          // meta: createdModelMeta,
          // data: modelData,
        },
        trace: createdTrace,
      };
    } catch (err) {
      throw err;
    }
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
    return storageRepo.read(versionId);
  },
  getAllModels(includeDeleted = true) {
    const models = modelRepo.findAll(includeDeleted);
    for (const model of models) {
      const versions = versionRepo.findByModelId(model.id);
      model.versions = versions;
    }
    return models;
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
    const models = modelRepo.findByProjectId(projectId, includeDeleted);
    if (!models) {
      throw new Error("No models found for this project");
    }
    for (const model of models) {
      const versions = versionRepo.findByModelId(model.id);
      model.versions = versions;
    }
    return models;
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
      effectiveSelections = Array.isArray(trace.selections) ? trace.selections : [];
      words = effectiveSelections.reduce(
        (acc, sel) => acc + countWords(sel?.text ?? ""),
        0,
      );
      traceRepo.updateByModelId(versionId, effectiveSelections);
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

  updateModelData(modelId, modelData) {
    const projectId = modelRepo.getProjectIdByModelId(modelId);
    storageRepo.write(modelId, modelData);

    // Add stat update
    modelRepo.addStatUpdate(
      modelId,
      new Date().toISOString(),
      "manual_update",
      null,
    );

    // Log the event
    logService.logEvent(projectId, "model_updated_manual", {
      id: modelId,
      data: modelData,
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
