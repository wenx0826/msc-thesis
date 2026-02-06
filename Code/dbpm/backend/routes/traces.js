import crypto from "crypto";
import traceRepo from "../repositories/traceRepository.js";

const createTraceSchema = {
  body: {
    type: "object",
    properties: {
      documentId: { type: "string" },
      modelId: { type: "string" },
      selections: { type: "array" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        documentId: { type: "string" },
        modelId: { type: "string" },
        selections: { type: "string" },
        timestamp: { type: "string" },
      },
    },
  },
};

const updateTraceSchema = {
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
      documentId: { type: "string" },
      modelId: { type: "string" },
      selections: { type: "array" },
    },
  },
};

async function tracesRoutes(fastify, options) {
  // POST /traces - Create a new trace
  fastify.post("/", { schema: createTraceSchema }, async (request, reply) => {
    const trace = request.body;
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    try {
      const created = traceRepo.create(
        id,
        trace.documentId,
        trace.modelId,
        trace.selections,
        timestamp,
      );
      reply.send({ ...created, id, timestamp });
    } catch (err) {
      console.error("Failed to create trace:", err);
      reply.code(500).send({ error: "Failed to create trace" });
    }
  });

  // PUT /traces/:id - Update a trace
  fastify.put("/:id", { schema: updateTraceSchema }, async (request, reply) => {
    const traceId = request.params.id;
    const updatedTrace = request.body;

    try {
      const success = traceRepo.update(
        traceId,
        updatedTrace.documentId,
        updatedTrace.modelId,
        updatedTrace.selections,
      );

      if (!success) {
        return reply.code(404).send({ error: "Trace not found" });
      }

      reply.send(updatedTrace);
    } catch (err) {
      console.error("Failed to update trace:", err);
      reply.code(500).send({ error: "Failed to update trace" });
    }
  });
}

export default tracesRoutes;
