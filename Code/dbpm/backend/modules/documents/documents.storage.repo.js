import {
  readTextFile,
  writeTextFile,
  deleteFile,
} from "../../utils/fileHelper.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const documentsPath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "data",
  "documents",
);

class DocumentStorage {
  write(versionId, content) {
    const filePath = this.getDocumentFilePath(versionId);
    writeTextFile(filePath, content);
  }

  read(versionId) {
    const filePath = this.getDocumentFilePath(versionId);
    return readTextFile(filePath);
  }

  delete(versionId) {
    const filePath = this.getDocumentFilePath(versionId);
    deleteFile(filePath);
  }

  getDocumentFilePath(versionId) {
    return path.join(documentsPath, `${versionId}.html`);
  }
}

export default new DocumentStorage();
