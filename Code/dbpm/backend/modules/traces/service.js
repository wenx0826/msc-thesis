import traceRepo from "./repository.js";

export default {
  create({ documentVersionId, modelVersionId, selections }) {
    return traceRepo.create({
      documentVersionId,
      modelVersionId,
      selections,
    });
  },
  update(id, updates) {
    const updatedTrace = traceRepo.updateById(id, updates);
    if (!updatedTrace) {
      throw new Error("Trace not found or no valid fields to update");
    }
    return updatedTrace;
  },
  getByDocumentVersionId(versionId) {
    return traceRepo.findByDocumentVersionId(versionId);
  },
};
