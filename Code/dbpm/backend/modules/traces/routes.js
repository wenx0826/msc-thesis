import traceService from "./service.js";
import { updateTraceSchema } from "./schema.js";

export default async function (fastify, options) {
  fastify.put("/:id", { schema: updateTraceSchema }, async (request, reply) => {
    const traceId = request.params.id;
    const updatedTrace = request.body;

    try {
      const result = await traceService.updateTrace(
        traceId,
        updatedTrace.documentId,
        updatedTrace.modelId,
        updatedTrace.selections,
      );
      reply.send(result);
    } catch (err) {
      console.error("Failed to update trace:", err);
      if (err.message === "Trace not found") {
        reply.code(404).send({ error: "Trace not found" });
      } else {
        reply.code(500).send({ error: "Failed to update trace" });
      }
    }
  });
}
