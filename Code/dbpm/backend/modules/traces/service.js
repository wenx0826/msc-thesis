import { get } from "http";
import traceRepo from "./repository.js";

function cloneSelections(selections) {
  if (!Array.isArray(selections)) {
    return [];
  }

  return selections.map((selection) => {
    if (!selection || typeof selection !== "object") {
      return selection;
    }

    return {
      ...selection,
      range:
        selection.range && typeof selection.range === "object"
          ? { ...selection.range }
          : selection.range,
    };
  });
}

export default {
  create({ documentVersionId, modelVersionId, selections }) {
    return traceRepo.create({
      documentVersionId,
      modelVersionId,
      selections,
    });
  },
  copyByDocumentVersionId({
    sourceDocumentVersionId,
    targetDocumentVersionId,
  }) {
    if (
      !sourceDocumentVersionId ||
      !targetDocumentVersionId ||
      sourceDocumentVersionId === targetDocumentVersionId
    ) {
      return [];
    }

    const sourceTraces = traceRepo.findByDocumentVersionId(
      sourceDocumentVersionId,
    );
    if (!sourceTraces.length) {
      return [];
    }

    return sourceTraces.map((trace) =>
      this.create({
        documentVersionId: targetDocumentVersionId,
        modelVersionId: trace.modelVersionId,
        selections: cloneSelections(trace.selections),
      }),
    );
  },
  copyByModelVersionId({ sourceModelVersionId, targetModelVersionId }) {
    if (
      !sourceModelVersionId ||
      !targetModelVersionId ||
      sourceModelVersionId === targetModelVersionId
    ) {
      return [];
    }

    const sourceTraces = traceRepo.findByModelVersionId(sourceModelVersionId);
    if (!sourceTraces.length) {
      return [];
    }

    return sourceTraces.map((trace) =>
      this.create({
        documentVersionId: trace.documentVersionId,
        modelVersionId: targetModelVersionId,
        selections: cloneSelections(trace.selections),
      }),
    );
  },
  getById(id) {
    return traceRepo.findById(id);
  },
  getByDocumentVersionId(versionId) {
    return traceRepo.findByDocumentVersionId(versionId);
  },
  update(id, updates) {
    const updatedTrace = traceRepo.updateById(id, updates);
    if (!updatedTrace) {
      throw new Error("Trace not found or no valid fields to update");
    }
    return updatedTrace;
  },
};
