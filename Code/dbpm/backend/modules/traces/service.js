import crypto from "crypto";
import traceRepo from "./repository.js";

export default {
  async createTrace({ documentId, modelId, selections }) {
    const id = crypto.randomUUID();
    const createdTrace = traceRepo.create({
      id,
      documentId,
      modelId,
      selections,
    });

    return createdTrace;
  },

  async updateTrace(traceId, documentId, modelId, selections) {
    const success = traceRepo.update(traceId, documentId, modelId, selections);
    if (!success) {
      throw new Error("Trace not found");
    }

    return { documentId, modelId, selections };
  },
};
