import modelService from "./service.js";
import {
  createModelSchema,
  updateMetaSchema,
  getModelSchema,
  getVersionDataSchema,
} from "./schema.js";

export default async function (fastify, options) {
  // POST /models - Create a new model
  fastify.post("/", { schema: createModelSchema }, (request, reply) => {
    try {
      const result = modelService.createModelAndTrace(request.body);
      reply.send(result);
    } catch (err) {
      console.error("Failed to create model:", err);
      reply.code(500).send({ error: "Failed to create model" });
    }
  });
  // PUT /models/:id/meta - Update model metadata (e.g., name)
  fastify.put(
    "/:modelId/meta",
    { schema: updateMetaSchema },
    async (request, reply) => {
      const { modelId } = request.params;
      try {
        const updatedModel = modelService.updateMeta(modelId, request.body);
        reply.send(updatedModel);
      } catch (err) {
        console.error("Failed to update model metadata:", err);
        reply.code(500).send({ error: "Failed to update model metadata" });
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
    (request, reply) => {
      const modelId = request.params.id;
      try {
        const result = modelService.deleteModel(modelId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to delete model:", err);
        if (err.message === "Model not found") {
          reply.code(404).send({ error: "Model not found" });
        } else {
          reply.code(500).send({ error: "Failed to delete model" });
        }
      }
    },
  );
  // GET /models/:id - Get model by ID
  fastify.get("/:id", { schema: getModelSchema }, (request, reply) => {
    const modelId = request.params.id;
    console.log("Fetching model for ID:", modelId);
    try {
      const model = modelService.getModel(modelId);
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
    "/versions/:versionId/data",
    { schema: getVersionDataSchema },
    (request, reply) => {
      const versionId = request.params.versionId;
      try {
        const data = modelService.getData(versionId);
        reply.send(data);
      } catch (err) {
        console.error("Failed to read model data:", err);
        reply.code(500).send({ error: "Failed to read model data" });
      }
    },
  );

  // PUT /models/:id - Update model
  fastify.put("/:id", (request, reply) => {
    const modelId = request.params.id;
    const { modelData, trace, type } = request.body;
    console.log("Updating model for ID:", modelId);
    console.log("Update payload:", { modelData, trace, type });
    try {
      modelService.updateModel({ modelId, modelData, trace, type });
      reply.send({ message: "Model content updated" });
    } catch (err) {
      console.error("Failed to update model:", err);
      reply.code(500).send({ error: "Failed to update model" });
    }
  });
}
