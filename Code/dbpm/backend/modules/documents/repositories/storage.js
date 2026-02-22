import {
  readTextFile,
  writeTextFile,
  deleteFile,
} from "../../../utils/fileHelper.js";
import { fileURLToPath } from "url";

const documentsDirUrl = new URL("../../../../data/documents/", import.meta.url);

export default {
  getDocumentFilePath(versionId) {
    return fileURLToPath(new URL(`${versionId}.html`, documentsDirUrl));
  },
  write(versionId, content) {
    const filePath = this.getDocumentFilePath(versionId);
    writeTextFile(filePath, content);
  },

  read(versionId) {
    const filePath = this.getDocumentFilePath(versionId);
    return readTextFile(filePath);
  },

  delete(versionId) {
    const filePath = this.getDocumentFilePath(versionId);
    deleteFile(filePath);
  },
};
