import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { append, write } from "../../utils/fileHelper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsPath = path.join(__dirname, "..", "..", "..", "data", "logs");

const YAML_DUMP_OPTIONS = {
  indent: 2,
  lineWidth: -1,
  noRefs: true,
};

const getLogFilePath = (projectId) => path.join(logsPath, `${projectId}.yaml`);

const appendEntry = (projectId, entry) => {
  const yamlEntry = `---\n${yaml.dump(entry, YAML_DUMP_OPTIONS)}`;
  try {
    append(getLogFilePath(projectId), yamlEntry);
  } catch (err) {
    console.error("Log write failed:", err);
  }
};

const createEmptyFile = (projectId) => {
  try {
    write(getLogFilePath(projectId), "");
  } catch (err) {
    console.error("Failed to create log file for project:", projectId, err);
  }
};

export default {
  appendEntry,
  createEmptyFile,
};
