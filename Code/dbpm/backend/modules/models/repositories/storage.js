import { read, write } from "../../../utils/fileHelper.js";
import { fileURLToPath } from "url";

const modelsDirUrl = new URL("../../../../data/models/", import.meta.url);

export default {
  getFilePath(versionId) {
    return fileURLToPath(new URL(`${versionId}.xml`, modelsDirUrl));
  },

  getModelFilePath(modelId) {
    return fileURLToPath(new URL(`${modelId}.xml`, modelsDirUrl));
  },

  write(versionId, content) {
    const filePath = this.getFilePath(versionId);
    write(filePath, content);
  },

  writeByModelId(modelId, content) {
    const filePath = this.getModelFilePath(modelId);
    write(filePath, content);
  },

  read(versionId) {
    const filePath = this.getFilePath(versionId);
    return read(filePath);
  },
};
