import crypto from "crypto";
import documentRepo from "./repositories/document.js";
import versionRepo from "./repositories/version.js";
import dstorageRepo from "./repositories/storage.js";
import { logEvent } from "../../utils/logger.js";
import { countWords } from "../../utils/fileHelper.js";

export default {
  async create({ projectId, name, content }) {
    const id = crypto.randomUUID();
    const versionId = crypto.randomUUID();

    try {
      dstorageRepo.write(versionId, content);
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
      logEvent(projectId, "document_uploaded", createdDocument);

      return { createdDocument, versions: [createdVersion] };
    } catch (err) {
      // Cleanup on failure
      // dstorageRepo.delete(versionId);
      throw err;
    }
  },

  async getDocuments() {
    return documentRepo.findAll();
  },
  async getByProjectId(projectId, includeDeleted = false) {
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

  async getAllByProjectId(projectId) {
    return documentRepo.findByProjectId(projectId);
  },
  async getAllDocuments() {
    // Documents don't have soft delete yet, so this is the same as getDocuments
    return documentRepo.findAll();
  },

  async getDocumentContent(docId) {
    // const doc = documentRepo.findById(docId);
    // if (!doc) {
    //   throw new Error("Document not found");
    // }
    return dstorageRepo.read(docId);
  },

  async getTraces(docId) {
    return documentRepo.getTraces(docId);
  },

  async getModels(docId) {
    return documentRepo.getModels(docId);
  },
  async getProjectId(docId) {
    return documentRepo.getProjectId(docId);
  },
  async getAllModels(docId) {
    return documentRepo.getAllModels(docId);
  },

  async deleteDocument(docId) {
    const doc = documentRepo.findById(docId);
    if (!doc) {
      throw new Error("Document not found");
    }
    documentRepo.delete(docId);
    dstorageRepo.delete(docId);
    return { message: "Document deleted" };
  },
};
