import documentRepo from "./repositories/document.js";
import versionRepo from "./repositories/version.js";
import storageRepo from "./repositories/storage.js";
import logService from "../logs/service.js";
import { countWords } from "../../utils/fileHelper.js";
import modelService from "../models/service.js";
import documentModelLinkService from "../document_model_links/service.js";
export default {
  create({ projectId, filename, content }) {
    const wordsCount = countWords(content);
    const createdDocument = documentRepo.create({ projectId, name: filename });
    const documentId = createdDocument.id;
    const latestVersionNumber =
      documentRepo.allocateLatestVersionNumber(documentId);
    const createdVersion = versionRepo.create({
      documentId,
      restoredFrom: null,
      versionNumber: latestVersionNumber,
      name: `v${latestVersionNumber}`,
      filename,
      wordsCount,
    });
    const versionId = createdVersion.id;
    storageRepo.write(versionId, content);
    documentRepo.updateById(documentId, { latestVersionId: versionId });
    logService.logEvent(projectId, "document_uploaded", createdDocument);
    return documentRepo.findByIdWithVersions(documentId);
  },
  updateMeta(docId, updates) {
    documentRepo.updateById(docId, updates);
    return documentRepo.findByIdWithVersions(docId);
  },

  createVersion({ documentId, name, filename, content }) {
    const document = documentRepo.findById(documentId);
    const sourceVersionId = document.latestVersionId ?? null;
    const wordsCount = countWords(content);
    const latestVersionNumber =
      documentRepo.allocateLatestVersionNumber(documentId);
    const createdVersion = versionRepo.create({
      documentId,
      restoredFrom: sourceVersionId,
      versionNumber: latestVersionNumber,
      name: `v${latestVersionNumber}`,
      filename,
      wordsCount,
    });
    const versionId = createdVersion.id;
    storageRepo.write(versionId, content);
    documentRepo.updateById(documentId, { latestVersionId: versionId });
    documentModelLinkService.copyLatestByDocumentVersionId({
      sourceDocumentVersionId: sourceVersionId,
      targetDocumentVersionId: versionId,
    });
    logService.logEvent(
      documentRepo.findProjectIdById(documentId),
      "document_updated",
      { documentId, versionId: createdVersion.id },
    );
    modelService.scheduleModelXmlRewriteByDocumentVersion(versionId);
    return createdVersion;
  },
  count(includeDeleted = false) {
    return documentRepo.count(includeDeleted);
  },
  getAverageWordsCount(includeDeleted = false) {
    return documentRepo.getAverageWordsCount(includeDeleted);
  },
  getAverageVersionsCount(includeDeleted = false) {
    return documentRepo.getAverageVersionsCount(includeDeleted);
  },
  getByProjectId(projectId, includeDeleted = false) {
    return documentRepo.findByProjectIdWithVersions(projectId, includeDeleted);
  },
  getContent(versionId) {
    // const doc = documentRepo.findById(docId);
    // if (!doc) {
    //   throw new Error("Document not found");
    // }
    return storageRepo.read(versionId);
  },
  deleteDocument(docId) {
    const doc = documentRepo.findById(docId);
    if (doc.deletedAt) {
      return { message: "Document deleted" };
    }

    modelService.deleteModelsByDocumentId(docId, {
      source: "document_deleted_cascade",
    });

    const documentDeleteResult = documentRepo.softDelete(docId);
    if (documentDeleteResult.changes > 0) {
      logService.logEvent(doc.projectId, "document_deleted", {
        id: doc.id,
        name: doc.name,
      });
    }

    return { message: "Document deleted" };
  },
  restoreDocument(docId) {
    const doc = documentRepo.findById(docId);
    if (!doc.deletedAt) {
      return documentRepo.findByIdWithVersions(docId);
    }

    const result = documentRepo.restore(docId);
    if (result.changes > 0) {
      logService.logEvent(doc.projectId, "document_restored", {
        id: doc.id,
        name: doc.name,
      });
    }

    return documentRepo.findByIdWithVersions(docId);
  },
};
