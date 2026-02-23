import crypto from "crypto";
import modelRepo from "./repositories/model.js";
import versionRepo from "./repositories/version.js";
import storageRepo from "./repositories/storage.js";
import traceRepo from "../traces/repository.js";
import { logEvent, getISODate } from "../../utils/logger.js";
import {
  readModelData,
  writeModelData,
  countWords,
} from "../../utils/fileHelper.js";
import documentsService from "../documents/service.js";
import projectsService from "../projects/service.js";
import traceService from "../traces/service.js";

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

    const selectedWordsCount = trace.selections.reduce(
      (acc, sel) => acc + countWords(sel.text),
      0,
    );

    try {
      // writeModelData(versionId, modelData);
      storageRepo.write(versionId, modelData);
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
      logEvent(projectId, "model_generated", {
        id: id,
        name,
        data: modelData,
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
    const data = readModelData(modelId);
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
    const projectId = modelRepo.getProjectIdByModelId(modelId);
    // Write model data to file
    writeModelData(modelId, modelData);

    // Update model status
    // modelRepo.updateStatus(modelId, "updated");

    let words = null;
    if (trace) {
      words = trace.selections.reduce(
        (acc, sel) => acc + countWords(sel.text),
        0,
      );
      traceRepo.updateByModelId(modelId, trace.selections);
    }

    // Add stat update
    modelRepo.addStatUpdate(modelId, getISODate(), type, words);

    // Log the event
    logEvent(projectId, `model_updated_${type}`, {
      id: modelId,
      data: modelData,
    });

    return { message: "Model content updated" };
  },

  updateModelData(modelId, modelData) {
    const projectId = modelRepo.getProjectIdByModelId(modelId);
    writeModelData(modelId, modelData);

    // Add stat update
    modelRepo.addStatUpdate(modelId, getISODate(), "manual_update", null);

    // Log the event
    logEvent(projectId, "model_updated_manual", {
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
    logEvent(projectId, "model_deleted", { id: modelId, name: model.name });

    return { message: "Model deleted" };
  },
};
