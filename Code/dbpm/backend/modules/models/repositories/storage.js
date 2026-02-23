import {
  read,
  write,
  delete as deleteFile,
} from "../../../utils/fileHelper.js";
import { fileURLToPath } from "url";

const modelsDirUrl = new URL("../../../../data/models/", import.meta.url);

export default {
  getFilePath(versionId) {
    return fileURLToPath(new URL(`${versionId}.xml`, modelsDirUrl));
  },
  write(versionId, content) {
    const filePath = this.getFilePath(versionId);
    write(filePath, content);
  },

  read(versionId) {
    const filePath = this.getFilePath(versionId);
    return read(filePath);
  },

  delete(versionId) {
    const filePath = this.getFilePath(versionId);
    deleteFile(filePath);
  },
};
