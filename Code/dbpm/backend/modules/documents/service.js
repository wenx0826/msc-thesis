import documentRepo from "./repositories/document.js";
import versionRepo from "./repositories/version.js";
import storageRepo from "./repositories/storage.js";
import logService from "../logs/service.js";
import { countWords } from "../../utils/fileHelper.js";
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
      storageRepo.write(createdVersion.id, content);
      documentRepo.updateById(createdDocument.id, {
        latestVersionId: createdVersion.id,
      });
      logService.logEvent(projectId, "document_uploaded", createdDocument);
      return {
        ...createdDocument,
        latestVersionId: createdVersion.id,
        versions: [createdVersion],
      };
    } catch (err) {
      // Cleanup on failure
      // If storage was already written, remove by created version id.
      throw err;
    }
  },
  updateMeta(docId, updates) {
    documentRepo.updateById(docId, updates);
    return documentRepo.findById(docId);
  },

  createVersion({ documentId, name, filename, content }) {
    try {
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
      logService.logEvent(
        documentRepo.findProjectIdById(documentId),
        "document_updated",
        {
          documentId,
          versionId: createdVersion.id,
        },
      );
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
  getDocuments() {
    return documentRepo.findAll();
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

  getTraces(versionId) {
    return traceService.getByDocumentVersionId(versionId);
  },

  getModels(docId) {
    return documentRepo.getModels(docId);
  },

  getAllModels(docId) {
    return documentRepo.getAllModels(docId);
  },

  deleteDocument(docId) {
    const doc = documentRepo.findById(docId);
    if (!doc) {
      throw new Error("Document not found");
    }
    return { message: "Document deleted" };
  },
};
