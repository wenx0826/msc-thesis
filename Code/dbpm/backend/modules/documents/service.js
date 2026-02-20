import crypto from "crypto";
import documentMetaRepo from "./repositories/document.js";
import documentContentRepo from "./repositories/storage.js";
import { logEvent } from "../../utils/logger.js";
import { countWords } from "../../utils/fileHelper.js";

class DocumentService {
  async createDocument(name, content, projectId) {
    const documentId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    // const storagePath = documentContentRepo.getDocumentFilePath(versionId);

    try {
      documentContentRepo.write(versionId, content);
      const wordsCount = countWords(content);
      const createdDocument = documentMetaRepo.create({
        versionId,
        documentId,
        projectId,
        name,
        // storagePath,
        wordsCount,
      });

      logEvent(projectId, "document_uploaded", createdDocument);

      return createdDocument;
    } catch (err) {
      // Cleanup on failure
      documentContentRepo.delete(versionId);
      throw err;
    }
  }

  async getDocuments() {
    return documentMetaRepo.findAll();
  }
  async findMetaByProjectId(projectId) {
    return documentMetaRepo.findByProjectId(projectId);
  }
  async getAllDocuments() {
    // Documents don't have soft delete yet, so this is the same as getDocuments
    return documentMetaRepo.findAll();
  }

  async getDocumentContent(docId) {
    // const doc = documentMetaRepo.findById(docId);
    // if (!doc) {
    //   throw new Error("Document not found");
    // }
    return documentContentRepo.read(docId);
  }

  async getTraces(docId) {
    return documentMetaRepo.getTraces(docId);
  }

  async getModels(docId) {
    return documentMetaRepo.getModels(docId);
  }
  async getProjectId(docId) {
    return documentMetaRepo.getProjectId(docId);
  }
  async getAllModels(docId) {
    return documentMetaRepo.getAllModels(docId);
  }

  async deleteDocument(docId) {
    const doc = documentMetaRepo.findById(docId);
    if (!doc) {
      throw new Error("Document not found");
    }
    documentMetaRepo.delete(docId);
    documentContentRepo.delete(docId);
    return { message: "Document deleted" };
  }
}

export default new DocumentService();
