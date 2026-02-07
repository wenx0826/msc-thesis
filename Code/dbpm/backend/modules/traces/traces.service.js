import crypto from "crypto";
import traceRepo from "./traces.repo.js";

class TraceService {
  async createTrace({ documentId, modelId, selections }) {
    const id = crypto.randomUUID();
    const createdTrace = traceRepo.create({
      id,
      documentId,
      modelId,
      selections,
    });

    return createdTrace;
  }

  async updateTrace(traceId, documentId, modelId, selections) {
    const success = traceRepo.update(traceId, documentId, modelId, selections);

    if (!success) {
      throw new Error("Trace not found");
    }

    return { documentId, modelId, selections };
  }
}

export default new TraceService();
