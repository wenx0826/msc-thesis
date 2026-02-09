import crypto from "crypto";
import modelService from "./models.service.js";
import {
  createModelSchema,
  getModelSchema,
  getModelDataSchema,
  getAllModelsSchema,
  updateModelSchema,
  updateModelDataSchema,
} from "./models.schema.js";
import { readModelData } from "../../utils/fileHelper.js";

async function modelsRoutes(fastify, options) {
  // POST /models - Create a new model
  fastify.post("/", { schema: createModelSchema }, async (request, reply) => {
    try {
      const result = await modelService.createModelAndTrace(request.body);
      reply.send(result);
    } catch (err) {
      console.error("Failed to create model:", err);
      reply.code(500).send({ error: "Failed to create model" });
    }
  });

  // GET /models/:id - Get model by ID
  fastify.get("/:id", { schema: getModelSchema }, async (request, reply) => {
    const modelId = request.params.id;
    console.log("Fetching model for ID:", modelId);
    try {
      const model = await modelService.getModel(modelId);
      reply.send(model);
    } catch (err) {
      console.error("Failed to fetch model:", err);
      if (err.message === "Model not found") {
        reply.code(404).send({ error: "Model not found" });
      } else {
        reply.code(500).send({ error: "Failed to fetch model" });
      }
    }
  });

  // GET /models/:id/data - Get model data
  fastify.get(
    "/:id/data",
    { schema: getModelDataSchema },
    async (request, reply) => {
      const modelId = request.params.id;
      console.log("Fetching model content for ID:", modelId);
      try {
        const data = readModelData(modelId);
        reply.send(data);
      } catch (err) {
        console.error("Failed to read model data:", err);
        reply.code(500).send({ error: "Failed to read model data" });
      }
    },
  );

  // GET /models/all - Get all models including soft-deleted ones (for stats)
  fastify.get(
    "/all",
    { schema: getAllModelsSchema },
    async (request, reply) => {
      console.log("Fetching all models including soft-deleted...");
      try {
        const models = modelRepo.findAll();
        reply.send(models);
      } catch (err) {
        console.error("Failed to fetch all models:", err);
        reply.code(500).send({ error: "Failed to fetch all models" });
      }
    },
  );

  // PUT /models/:id - Update model
  fastify.put(
    "/:id",
    // { schema: updateModelSchema },
    async (request, reply) => {
      const modelId = request.params.id;
      const { modelData, trace, type } = request.body;
      const projectId = modelRepo.getProjectIdByModelId(modelId);
      console.log("Updating model for ID:", modelId);

      try {
        writeModelData(modelId, modelData);

        let words = null;
        if (trace) {
          words = trace.selections.reduce(
            (acc, sel) => acc + countWords(sel.text),
            0,
          );
          traceRepo.updateByModelId(modelId, trace.prompt, trace.selections);
        }

        modelRepo.addStatUpdate(modelId, getISODate(), type, words);

        reply.send({ message: "Model content updated" });
        logEvent(projectId, `model_updated_${type}`, {
          id: modelId,
          data: modelData,
        });
      } catch (err) {
        console.error("Failed to update model:", err);
        reply.code(500).send({ error: "Failed to update model" });
      }
    },
  );

  // PUT /models/:id/data - Update model data only
  fastify.put(
    "/:id/data",
    { schema: updateModelDataSchema },
    async (request, reply) => {
      const modelId = request.params.id;
      const { modelData } = request.body;
      const projectId = modelRepo.getProjectIdByModelId(modelId);
      console.log("Updating model content for ID:", modelId);

      try {
        writeModelData(modelId, modelData);
        modelRepo.updateStatus(modelId, "updated_manual");
        modelRepo.addStatUpdate(modelId, getISODate(), "manual_update", null);

        reply.send({ message: "Model content updated" });
        logEvent(projectId, "model_updated_manual", {
          id: modelId,
          data: modelData,
        });
      } catch (err) {
        console.error("Failed to update model data:", err);
        reply.code(500).send({ error: "Failed to update model data" });
      }
    },
  );

  // DELETE /models/:id - Soft delete a model
  fastify.delete(
    "/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const modelId = request.params.id;
      const projectId = modelRepo.getProjectIdByModelId(modelId);
      try {
        const model = modelRepo.findById(modelId);
        if (!model) {
          return reply.code(404).send({ error: "Model not found" });
        }

        modelRepo.softDelete(modelId);
        reply.send({ message: "Model deleted" });
        logEvent(projectId, "model_deleted", { id: modelId, name: model.name });
      } catch (err) {
        console.error("Failed to delete model:", err);
        reply.code(500).send({ error: "Failed to delete model" });
      }
    },
  );
}

export default modelsRoutes;
