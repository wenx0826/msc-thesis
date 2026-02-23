import crypto from "crypto";
import documentRepo from "./repositories/document.js";
import versionRepo from "./repositories/version.js";
import storageRepo from "./repositories/storage.js";
import logService from "../logs/service.js";
import { countWords } from "../../utils/fileHelper.js";
import traceService from "../traces/service.js";
export default {
  create({ projectId, name, content }) {
    const id = crypto.randomUUID();
    const versionId = crypto.randomUUID();

    try {
      storageRepo.write(versionId, content);
      const wordsCount = countWords(content);

      const createdDocument = documentRepo.create({
        id,
        projectId,
      });
      const createdVersion = versionRepo.create({
        id: versionId,
        documentId: id,
        name,
        wordsCount,
      });
      documentRepo.update(id, { latestVersionId: versionId });
      logService.logEvent(projectId, "document_uploaded", createdDocument);
      return { ...createdDocument, versions: [createdVersion] };
    } catch (err) {
      // Cleanup on failure
      // storageRepo.delete(versionId);
      throw err;
    }
  },

  createVersion({ documentId, name, content }) {
    const versionId = crypto.randomUUID();

    try {
      storageRepo.write(versionId, content);
      const wordsCount = countWords(content);
      const createdVersion = versionRepo.create({
        id: versionId,
        documentId,
        name,
        wordsCount,
      });
      documentRepo.update(documentId, { latestVersionId: versionId });
      logService.logEvent(
        documentRepo.findProjectIdById(documentId),
        "document_updated",
        {
          documentId,
          versionId,
        },
      );
      return createdVersion;
    } catch (err) {
      // Cleanup on failure
      // storageRepo.delete(versionId);
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
    const documents = documentRepo.findByProjectId(projectId, includeDeleted);
    if (!documents) {
      throw new Error("No documents found for this project");
    }
    for (const doc of documents) {
      const versions = versionRepo.findByDocumentId(doc.id);
      doc.versions = versions;
    }
    return documents;
  },

  getAllByProjectId(projectId) {
    return documentRepo.findByProjectId(projectId);
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
  getProjectId(docId) {
    return documentRepo.getProjectId(docId);
  },
  getAllModels(docId) {
    return documentRepo.getAllModels(docId);
  },
  updateVersionMeta(versionId, updates) {
    const version = versionRepo.update(versionId, updates);
    if (!version) {
      throw new Error("Document version not found");
    }
    return version;
  },
  deleteDocument(docId) {
    const doc = documentRepo.findById(docId);
    if (!doc) {
      throw new Error("Document not found");
    }
    return { message: "Document deleted" };
  },
};
