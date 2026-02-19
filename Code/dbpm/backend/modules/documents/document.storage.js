import {
  readDocumentContent,
  writeDocumentContent,
  deleteDocumentFile,
} from "../../utils/fileHelper.js";

class DocumentStorage {
  writeDocumentContent(versionId, content) {
    const filePath = this.getDocumentFilePath(versionId);
    writeDocumentContent(filePath, content);
  }

  readDocumentContent(versionId) {
    const filePath = this.getDocumentFilePath(versionId);
    return readDocumentContent(filePath);
  }

  deleteDocumentFile(versionId) {
    const filePath = this.getDocumentFilePath(versionId);
    deleteDocumentFile(filePath);
  }

  getDocumentFilePath(versionId) {
    return `data/documents/${versionId}.txt`;
  }
}

export default new DocumentStorage();
