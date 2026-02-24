import crypto from "crypto";
import traceRepo from "./repository.js";

export default {
  create({ documentVersionId, modelVersionId, selections }) {
    const createdTrace = traceRepo.create({
      id: crypto.randomUUID(),
      traceId: crypto.randomUUID(),
      documentVersionId,
      modelVersionId,
      selections,
    });
    return createdTrace;
  },
  update(id, updates) {
    const success = traceRepo.update(id, updates);
    if (!success) {
      throw new Error("Trace not found");
    }
    return { documentVersionId, modelVersionId, selections };
  },
  getByDocumentVersionId(versionId) {
    return traceRepo.findByDocumentVersionId(versionId);
  },
};
