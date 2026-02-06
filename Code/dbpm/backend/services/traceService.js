import crypto from "crypto";
import traceRepo from "../repositories/traceRepository.js";

class TraceService {
  async createTrace(documentId, modelId, selections) {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const created = traceRepo.create(
      id,
      documentId,
      modelId,
      selections,
      timestamp,
    );

    return { ...created, id, timestamp };
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
