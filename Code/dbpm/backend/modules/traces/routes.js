import traceService from "./service.js";
import {
  getLatestTracesByDocumentVersionSchema,
  getLatestTraceByModelVersionSchema,
  updateTraceSchema,
} from "./schema.js";

export default async function (fastify, options) {
  fastify.get(
    "/document-versions/:versionId",
    { schema: getLatestTracesByDocumentVersionSchema },
    (request, reply) => {
      const { versionId } = request.params;
      const { includeDeletedModels = false } = request.query || {};
      try {
        const result = traceService.getLatestByDocumentVersionId(
          versionId,
          includeDeletedModels,
        );
        reply.send(result);
      } catch (err) {
        console.error("Failed to fetch latest traces by document version:", err);
        reply
          .code(500)
          .send({ error: "Failed to fetch latest traces by document version" });
      }
    },
  );

  fastify.get(
    "/model-versions/:modelVersionId/latest",
    { schema: getLatestTraceByModelVersionSchema },
    (request, reply) => {
      const { modelVersionId } = request.params;
      try {
        const result = traceService.getLatestByModelVersionId(modelVersionId);
        if (!result) {
          reply.code(404).send({ error: "Trace not found" });
          return;
        }
        reply.send(result);
      } catch (err) {
        console.error("Failed to fetch latest trace by model version:", err);
        reply
          .code(500)
          .send({ error: "Failed to fetch latest trace by model version" });
      }
    },
  );

  fastify.put("/:id", { schema: updateTraceSchema }, (request, reply) => {
    const traceId = request.params.id;
    const updatedTrace = request.body;

    try {
      const result = traceService.update(traceId, updatedTrace);
      reply.send(result);
    } catch (err) {
      console.error("Failed to update trace:", err);
      if (err.message === "Trace not found or no valid fields to update") {
        reply
          .code(404)
          .send({ error: "Trace not found or no valid fields to update" });
      } else {
        reply.code(500).send({ error: "Failed to update trace" });
      }
    }
  });
}
