import traceService from "./service.js";
import { updateTraceSchema } from "./schema.js";

export default async function (fastify, options) {
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
