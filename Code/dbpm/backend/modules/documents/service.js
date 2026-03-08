import documentRepo from "./repositories/document.js";
import versionRepo from "./repositories/version.js";
import storageRepo from "./repositories/storage.js";
import logService from "../logs/service.js";
import { countWords } from "../../utils/fileHelper.js";
import modelService from "../models/service.js";
import traceService from "../traces/service.js";
export default {
  create({ projectId, filename, content }) {
    try {
      const wordsCount = countWords(content);
      const documentName = filename; // Default document name to filename, can be updated later
      const createdDocument = documentRepo.create({
        projectId,
        name: documentName,
      });
      const documentId = createdDocument.id;
      const latestVersionNumber = documentRepo.allocateLatestVersionNumber(
        createdDocument.id,
      );
      if (!latestVersionNumber) {
        throw new Error("Failed to allocate document version number");
      }
      const createdVersion = versionRepo.create({
        documentId: createdDocument.id,
        versionNumber: latestVersionNumber,
        name: `v${latestVersionNumber}`,
        filename,
        wordsCount,
      });
      const versionId = createdVersion.id;
      storageRepo.write(versionId, content);
      documentRepo.updateById(documentId, {
        latestVersionId: versionId,
      });
      logService.logEvent(projectId, "document_uploaded", createdDocument);
      return documentRepo.findByIdWithVersions(documentId);
    } catch (err) {
      // Cleanup on failure
      // If storage was already written, remove by created version id.
      throw err;
    }
  },
  updateMeta(docId, updates) {
    documentRepo.updateById(docId, updates);
    return documentRepo.findByIdWithVersions(docId);
  },

  createVersion({ documentId, name, filename, content }) {
    try {
      const document = documentRepo.findById(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      const sourceVersionId = document.latestVersionId ?? null;
      const wordsCount = countWords(content);
      const latestVersionNumber =
        documentRepo.allocateLatestVersionNumber(documentId);
      if (!latestVersionNumber) {
        throw new Error("Document not found");
      }
      const createdVersion = versionRepo.create({
        documentId,
        versionNumber: latestVersionNumber,
        name: `v${latestVersionNumber}`,
        filename,
        wordsCount,
      });
      const versionId = createdVersion.id;
      storageRepo.write(versionId, content);
      const documentUpdates = {
        latestVersionId: versionId,
      };
      documentRepo.updateById(documentId, documentUpdates);
      traceService.copyLatestByDocumentVersionId({
        sourceDocumentVersionId: sourceVersionId,
        targetDocumentVersionId: versionId,
      });
      logService.logEvent(
        documentRepo.findProjectIdById(documentId),
        "document_updated",
        {
          documentId,
          versionId: createdVersion.id,
        },
      );
      modelService.scheduleModelXmlRewriteByDocumentVersion(versionId);
      return createdVersion;
    } catch (err) {
      // Cleanup on failure
      // If storage was already written, remove by created version id.
      throw err;
    }
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
    if (!doc) {
      throw new Error("Document not found");
    }
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
    if (!doc) {
      throw new Error("Document not found");
    }
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
