import crypto from "crypto";
import modelRepo from "../repositories/modelRepository.js";
import traceRepo from "../repositories/traceRepository.js";
import { logEvent, getISODate } from "../utils/logger.js";
import {
  readModelData,
  writeModelData,
  countWords,
} from "../utils/fileHelper.js";

class ModelService {
  async createModel(model, trace) {
    const { data: modelData, meta } = model;
    const projectId = modelRepo.getProjectIdByDocumentId(trace.documentId);
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    trace.modelId = id;
    trace.id = crypto.randomUUID();
    trace.timestamp = timestamp;

    const words = trace.selections.reduce(
      (acc, sel) => acc + countWords(sel.text),
      0,
    );

    try {
      // Write model data to file
      writeModelData(id, modelData);

      // Create model record
      modelRepo.create(id, meta.name, timestamp, trace.documentId, words);

      // Create trace record
      traceRepo.create(
        trace.id,
        trace.documentId,
        trace.modelId,
        trace.selections,
        trace.timestamp,
      );

      // Add stat update
      modelRepo.addStatUpdate(id, getISODate(), "generation", words);

      // Log the event
      logEvent(projectId, "model_generated", {
        id: id,
        name: meta.name,
        data: modelData,
      });

      return {
        modelMeta: { id, name: meta.name, timestamp },
        trace,
      };
    } catch (err) {
      throw err;
    }
  }

  async getModel(modelId) {
    const model = modelRepo.findById(modelId);
    if (!model) {
      throw new Error("Model not found");
    }

    const data = readModelData(modelId);
    model.data = data;

    return model;
  }

  async getModelData(modelId) {
    return readModelData(modelId);
  }

  async getAllModels() {
    return modelRepo.findAll();
  }

  async updateModel(modelId, modelData, trace, type) {
    const projectId = modelRepo.getProjectIdByModelId(modelId);

    // Write model data to file
    writeModelData(modelId, modelData);

    // Update model status
    modelRepo.updateStatus(modelId, "updated");

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
  }

  async updateModelData(modelId, modelData) {
    const projectId = modelRepo.getProjectIdByModelId(modelId);

    // Write model data to file
    writeModelData(modelId, modelData);

    // Update model status
    modelRepo.updateStatus(modelId, "updated_manual");

    // Add stat update
    modelRepo.addStatUpdate(modelId, getISODate(), "manual_update", null);

    // Log the event
    logEvent(projectId, "model_updated_manual", {
      id: modelId,
      data: modelData,
    });

    return { message: "Model content updated" };
  }

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
  }
}

export default new ModelService();
