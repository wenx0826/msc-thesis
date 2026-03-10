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
      id: selection.id,
      textPosition:
        selection.textPosition && typeof selection.textPosition === "object"
          ? { ...selection.textPosition }
          : selection.textPosition,
      textQuote:
        selection.textQuote && typeof selection.textQuote === "object"
          ? { ...selection.textQuote }
          : selection.textQuote,
      style:
        selection.style && typeof selection.style === "object"
          ? { ...selection.style }
          : selection.style,
    };
  });
}

export default {
  create({ documentVersionId, modelVersionId, selections }) {
    const createdTrace = traceRepo.create({
      documentVersionId,
      modelVersionId,
      selections,
    });
    return traceRepo.findById(createdTrace.id);
  },
  copyLatestByDocumentVersionId({
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

    const sourceTraces = traceRepo.findLatestByDocumentVersionId(
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
  getLatestByDocumentVersionId(versionId, includeDeletedModels = false) {
    return traceRepo.findLatestByDocumentVersionId(
      versionId,
      includeDeletedModels,
    );
  },
  getLatestByModelVersionId(modelVersionId) {
    return traceRepo.findLatestByModelVersionId(modelVersionId);
  },
  update(id, updates) {
    const updatedTrace = traceRepo.updateById(id, updates);
    if (!updatedTrace) {
      throw new Error("Trace not found or no valid fields to update");
    }
    return updatedTrace;
  },
};
