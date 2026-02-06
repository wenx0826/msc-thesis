import crypto from "crypto";
import modelService from "../services/modelService.js";

const createModelSchema = {
  body: {
    type: "object",
    required: ["model", "trace"],
    properties: {
      model: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
            required: ["name"],
          },
          data: { type: "string" },
        },
        required: ["data", "meta"],
      },
      trace: {
        type: "object",
        properties: {
          documentId: { type: "string" },
          selections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
              },
            },
          },
        },
        required: ["documentId", "selections"],
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        modelMeta: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            timestamp: { type: "string" },
          },
        },
        trace: { type: "object" },
      },
    },
  },
};

const getModelSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        timestamp: { type: "string" },
        documentId: { type: "string" },
        words: { type: "number" },
        data: { type: "object" },
      },
    },
  },
};

const getModelDataSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  response: {
    200: { type: "object" },
  },
};

const getAllModelsSchema = {
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          timestamp: { type: "string" },
          documentId: { type: "string" },
          words: { type: "number" },
        },
      },
    },
  },
};

const updateModelSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  body: {
    type: "object",
    properties: {
      modelData: { type: "object" },
      trace: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          selections: { type: "array" },
        },
      },
      type: { type: "string" },
    },
  },
};

const updateModelDataSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  body: {
    type: "object",
    required: ["modelData"],
    properties: {
      modelData: { type: "object" },
    },
  },
};

async function modelsRoutes(fastify, options) {
  // POST /models - Create a new model
  fastify.post("/", { schema: createModelSchema }, async (request, reply) => {
    const { model, trace } = request.body;

    try {
      const result = await modelService.createModel(model, trace);
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
  fastify.put("/:id", { schema: updateModelSchema }, async (request, reply) => {
    const modelId = request.params.id;
    const { modelData, trace, type } = request.body;
    const projectId = modelRepo.getProjectIdByModelId(modelId);
    console.log("Updating model for ID:", modelId);

    try {
      writeModelData(modelId, modelData);
      modelRepo.updateStatus(modelId, "updated");

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
  });

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
