import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsPath = path.join(__dirname, "..", "..", "data", "logs");

const getISODate = () => new Date().toISOString();

const logEvent = (projectId, event, data = {}) => {
  const logEntry = {
    timestamp: getISODate(),
    event,
    data,
  };

  const yamlEntry =
    "---\n" +
    yaml.dump(logEntry, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

  fs.appendFile(path.join(logsPath, `${projectId}.yaml`), yamlEntry, (err) => {
    if (err) console.error("Log write failed:", err);
  });
};

const createEmptyLogFile = (projectId) => {
  fs.writeFile(path.join(logsPath, `${projectId}.yaml`), "", (err) => {
    if (err) {
      console.error("Failed to create log file for project:", projectId);
    }
  });
};

export { logEvent, createEmptyLogFile, getISODate };
