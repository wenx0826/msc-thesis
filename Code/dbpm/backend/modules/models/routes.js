import modelService from "./service.js";
import {
  createModelSchema,
  createVersionSchema,
  updateMetaSchema,
  getModelSchema,
  getVersionDataSchema,
  updateVersionSchema,
  updateSubprocessLinkSchema,
  restoreModelSchema,
  createGenerationAttemptSchema,
} from "./schema.js";

export default async function (fastify, options) {
  // POST /models - Create a new model
  fastify.post("/", { schema: createModelSchema }, (request, reply) => {
    try {
      const result = modelService.createModelAndLink(request.body);
      reply.send(result);
    } catch (err) {
      console.error("Failed to create model:", err);
      reply.code(500).send({ error: "Failed to create model" });
    }
  });
  // POST /models/versions - Create a new version from a source model version
  fastify.post(
    "/versions",
    { schema: createVersionSchema },
    (request, reply) => {
      try {
        const result = modelService.createVersion(request.body);
        reply.send(result);
      } catch (err) {
        console.error("Failed to create model version:", err);
        if (
          [
            "Model not found",
            "Model deleted",
            "Source model version not found",
          ].includes(err.message)
        ) {
          reply.code(404).send({ error: err.message });
          return;
        }
        if (
          [
            "Source version does not belong to the model",
            "Payload version creation only supports reason 'new_version'",
            "Model data is required for payload version creation",
            "Link is required for payload version creation",
          ].includes(err.message)
        ) {
          reply.code(400).send({ error: err.message });
          return;
        }
        reply.code(500).send({
          error: "Failed to create model version",
          details: err.message,
        });
      }
    },
  );
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
        if (["Model not found", "Model deleted"].includes(err.message)) {
          reply.code(404).send({ error: err.message });
          return;
        }
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

  // PUT /models/:id/restore - Restore a soft-deleted model
  fastify.put(
    "/:id/restore",
    { schema: restoreModelSchema },
    (request, reply) => {
      const modelId = request.params.id;
      try {
        const result = modelService.restoreModel(modelId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to restore model:", err);
        if (err.message === "Model not found") {
          reply.code(404).send({ error: "Model not found" });
        } else {
          reply.code(500).send({ error: "Failed to restore model" });
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

  // PUT /models/versions/:versionId/subprocesses/:taskId - Bind subprocess model for a task in a model version
  fastify.put(
    "/versions/:versionId/subprocesses/:taskId",
    { schema: updateSubprocessLinkSchema },
    (request, reply) => {
      const { versionId, taskId } = request.params;
      const { subprocessModelId } = request.body;
      try {
        const result = modelService.updateSubprocessLink({
          modelVersionId: versionId,
          taskId,
          subprocessModelId,
        });
        reply.send(result);
      } catch (err) {
        console.error("Failed to update subprocess link:", err);
        if (
          [
            "Model version not found",
            "Model not found",
            "Model deleted",
            "Subprocess model not found",
            "Subprocess model deleted",
          ].includes(err.message)
        ) {
          reply.code(404).send({ error: err.message });
          return;
        }
        if (
          [
            "Task not found",
            "Model cannot reference itself as subprocess",
          ].includes(err.message)
        ) {
          reply.code(400).send({ error: err.message });
          return;
        }
        reply.code(500).send({ error: "Failed to update subprocess link" });
      }
    },
  );

  // PUT /models/versions/:versionId - Update model
  fastify.put(
    "/versions/:versionId",
    { schema: updateVersionSchema },
    (request, reply) => {
      const versionId = request.params.versionId;
      const { modelData, link, type } = request.body;
      console.log("Update payload:", { modelData, link, type });
      try {
        modelService.updateVersion({ versionId, ...request.body });
        reply.send({ message: "Model content updated" });
      } catch (err) {
        console.error("Failed to update model:", err);
        if (["Model not found", "Model deleted"].includes(err.message)) {
          reply.code(404).send({ error: err.message });
          return;
        }
        reply.code(500).send({ error: "Failed to update model" });
      }
    },
  );

  // POST /models/generation-attempts - Record a generation attempt result
  fastify.post(
    "/generation-attempts",
    { schema: createGenerationAttemptSchema },
    (request, reply) => {
      try {
        const result = modelService.recordGenerationAttempt(request.body);
        reply.send(result);
      } catch (err) {
        console.error("Failed to record generation attempt:", err);
        reply.code(500).send({ error: "Failed to record generation attempt" });
      }
    },
  );
}
