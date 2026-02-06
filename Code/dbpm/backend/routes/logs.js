import modelRepo from "../repositories/modelRepository.js";
import { logEvent } from "../utils/logger.js";

const logEventSchema = {
  body: {
    type: "object",
    required: ["projectId", "event"],
    properties: {
      projectId: { type: "string" },
      event: { type: "string" },
      data: { type: "object" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
  },
};

async function logsRoutes(fastify, options) {
  // POST /logs - Log an event
  fastify.post("/", { schema: logEventSchema }, async (request, reply) => {
    const { projectId, event, data } = request.body;

    logEvent(projectId, event, data);

    switch (event) {
      case "model_regenerated_by_prompt":
        try {
          modelRepo.incrementRegeneratedByPrompt(data.modelId);
        } catch (err) {
          console.error("Failed to update regeneratedByPromptTimes:", err);
        }
        break;
      case "model_regenerated_by_selections":
        try {
          modelRepo.incrementRegeneratedBySelections(data.modelId);
        } catch (err) {
          console.error("Failed to update regeneratedBySelectionsTimes:", err);
        }
        break;
      default:
        break;
    }

    reply.send({ message: "Log entry added" });
  });
}

export default logsRoutes;
