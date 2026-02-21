import crypto from "crypto";
import modelRepo from "./repositories/model.js";
import versionRepo from "./repositories/version.js";
import traceRepo from "../traces/repository.js";
import { logEvent, getISODate } from "../../utils/logger.js";
import {
  readModelData,
  writeModelData,
  countWords,
} from "../../utils/fileHelper.js";
import documentsService from "../documents/service.js";
import projectsService from "../projects/service.js";
import { version } from "os";

export default {
  async createModelAndTrace({ modelData, trace }) {
    const projectId = await documentsService.getProjectId(trace.documentId);
    if (!projectId) {
      throw new Error("Document not found or invalid");
    }

    const counterResult =
      await projectsService.getModelGenerationCounter(projectId);
    const counter = counterResult ? counterResult.modelGenerationCounter : 0;
    const newCounter = counter + 1;
    const name = `Model_${newCounter}`;

    console.log(
      "!!!!Current model generation counter for project:",
      trace.documentId,
      projectId,
      counter,
      "->",
      newCounter,
      name,
    );

    const id = crypto.randomUUID();
    trace.modelId = id;
    trace.id = crypto.randomUUID();

    const selectedModelWords = trace.selections.reduce(
      (acc, sel) => acc + countWords(sel.text),
      0,
    );

    try {
      writeModelData(id, modelData);

      const createdModelMeta = modelRepo.create({
        id,
        name,
        documentId: trace.documentId,
        selectedTextWords: selectedModelWords,
      });
      await projectsService.update(projectId, {
        modelGenerationCounter: newCounter,
      });
      const createdTrace = traceRepo.create({ ...trace });

      // Add stat update
      modelRepo.addStatUpdate(
        id,
        getISODate(),
        "generation",
        selectedModelWords,
      );

      // Log the event
      logEvent(projectId, "model_generated", {
        id: id,
        name,
        data: modelData,
      });

      return {
        model: {
          meta: createdModelMeta,
          data: modelData,
        },
        trace: createdTrace,
      };
    } catch (err) {
      throw err;
    }
  },

  async getModel(modelId) {
    const model = modelRepo.findById(modelId);
    if (!model) {
      throw new Error("Model not found");
    }
    const data = readModelData(modelId);
    model.data = data;
    return model;
  },

  async getModelData(modelId) {
    return readModelData(modelId);
  },
  async getByProjectId(projectId, includeDeleted) {
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

  async updateModel({ modelId, modelData, trace, type }) {
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

  async updateModelData(modelId, modelData) {
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

  async deleteModel(modelId) {
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
