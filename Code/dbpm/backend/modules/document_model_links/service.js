import documentModelLinkRepo, { AUTO_REANCHOR_TYPE } from "./repository.js";

function cloneSelections(selections) {
  return selections.map((selection) => ({
    textPosition: { ...selection.textPosition },
    textQuote: { ...selection.textQuote },
    style: { ...(selection.style || {}) },
    reviewStatus: selection.reviewStatus,
  }));
}

export default {
  create({ documentVersionId, modelVersionId, selections }) {
    const normalizedSelections = Array.isArray(selections) ? selections : [];
    return documentModelLinkRepo.createWithSelections({
      documentVersionId,
      modelVersionId,
      selections: normalizedSelections,
    });
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

    const sourceLinks = documentModelLinkRepo.findLatestByDocumentVersionId(
      sourceDocumentVersionId,
      true,
    );
    if (!sourceLinks.length) {
      return [];
    }

    return sourceLinks.map((link) =>
      documentModelLinkRepo.createWithSelections({
        documentVersionId: targetDocumentVersionId,
        modelVersionId: link.modelVersionId,
        selections: cloneSelections(link.selections),
        type: AUTO_REANCHOR_TYPE,
      }),
    );
  },

  copyLatestByModelVersionId({ sourceModelVersionId, targetModelVersionId }) {
    const sourceLink =
      documentModelLinkRepo.findLatestByModelVersionId(sourceModelVersionId);
    if (!sourceLink) {
      return null;
    }

    const copiedLink = this.create({
      documentVersionId: sourceLink.documentVersionId,
      modelVersionId: targetModelVersionId,
      selections: cloneSelections(sourceLink.selections),
    });

    return this.getById(copiedLink.id);
  },

  getById(id) {
    return documentModelLinkRepo.findById(id);
  },

  getLatestByDocumentVersionId(versionId, includeDeletedModels = false) {
    return documentModelLinkRepo.findLatestByDocumentVersionId(
      versionId,
      includeDeletedModels,
    );
  },

  getLatestByModelVersionId(modelVersionId) {
    return documentModelLinkRepo.findLatestByModelVersionId(modelVersionId);
  },

  update(id, updates) {
    if (!updates || !Array.isArray(updates.selections)) {
      throw new Error("Selections are required");
    }
    return documentModelLinkRepo.replaceSelections(id, updates.selections);
  },

  createSelection(linkId, selection) {
    return documentModelLinkRepo.createSelection(linkId, selection);
  },

  updateSelection(linkId, selectionId, updates) {
    return documentModelLinkRepo.updateSelection(linkId, selectionId, updates);
  },

  deleteSelection(linkId, selectionId) {
    return documentModelLinkRepo.softDeleteSelection(linkId, selectionId);
  },
};
