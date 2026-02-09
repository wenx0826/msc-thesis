import crypto from "crypto";
import documentRepo from "./documents.repo.js";
import { logEvent } from "../../utils/logger.js";
import {
  readDocumentContent,
  writeDocumentContent,
  deleteDocumentFile,
  countWords,
} from "../../utils/fileHelper.js";

class DocumentService {
  async createDocument(name, content, projectId) {
    const id = crypto.randomUUID();
    const uploadedAt = new Date().toISOString();

    try {
      // Write file content
      writeDocumentContent(id, content);

      // Count words
      const wordsCount = countWords(content);

      // Create database record
      const createdDocument = documentRepo.create({
        id,
        name,
        projectId,
        wordsCount,
      });

      // Log the event
      logEvent(projectId, "document_uploaded", createdDocument);

      return createdDocument;
    } catch (err) {
      // Cleanup on failure
      deleteDocumentFile(id);
      throw err;
    }
  }

  async getDocuments() {
    return documentRepo.findAll();
  }

  async getAllDocuments() {
    // Documents don't have soft delete yet, so this is the same as getDocuments
    return documentRepo.findAll();
  }

  async getDocumentContent(docId) {
    const doc = documentRepo.findById(docId);
    if (!doc) {
      throw new Error("Document not found");
    }
    const content = readDocumentContent(docId);
    return { content };
  }

  async getTraces(docId) {
    return documentRepo.getTraces(docId);
  }

  async getModels(docId) {
    return documentRepo.getModels(docId);
  }
  async getProjectId(docId) {
    return documentRepo.getProjectId(docId);
  }
  async getAllModels(docId) {
    return documentRepo.getAllModels(docId);
  }

  async deleteDocument(docId) {
    const doc = documentRepo.findById(docId);
    if (!doc) {
      throw new Error("Document not found");
    }

    documentRepo.delete(docId);
    deleteDocumentFile(docId);

    return { message: "Document deleted" };
  }
}

export default new DocumentService();
