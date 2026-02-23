import crypto from "crypto";
import traceRepo from "./repository.js";

export default {
  create({ documentVersionId, modelVersionId, selections }) {
    const createdTrace = traceRepo.create({
      id: crypto.randomUUID(),
      markerId: crypto.randomUUID(),
      documentVersionId,
      modelVersionId,
      selections,
    });

    return createdTrace;
  },

  update(traceId, documentVersionId, modelVersionId, selections) {
    const success = traceRepo.update(
      traceId,
      documentVersionId,
      modelVersionId,
      selections,
    );
    if (!success) {
      throw new Error("Trace not found");
    }
    return { documentVersionId, modelVersionId, selections };
  },
  getByDocumentVersionId(versionId) {
    return traceRepo.findByDocumentVersionId(versionId);
  },
};
