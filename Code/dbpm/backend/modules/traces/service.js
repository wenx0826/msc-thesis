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
      true,
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
  copyLatestByModelVersionId({ sourceModelVersionId, targetModelVersionId }) {
    const sourceTrace =
      traceRepo.findLatestByModelVersionId(sourceModelVersionId);

    const copiedTrace = this.create({
      documentVersionId: sourceTrace.documentVersionId,
      modelVersionId: targetModelVersionId,
      selections: cloneSelections(sourceTrace.selections),
    });

    return this.getById(copiedTrace.id);
  },
  getById(id) {
    return traceRepo.findById(id);
  },
  getByDocumentVersionId(versionId, includeDeletedModels = false) {
    return traceRepo.findByDocumentVersionId(versionId, includeDeletedModels);
  },
  update(id, updates) {
    const updatedTrace = traceRepo.updateById(id, updates);
    if (!updatedTrace) {
      throw new Error("Trace not found or no valid fields to update");
    }
    return updatedTrace;
  },
};
