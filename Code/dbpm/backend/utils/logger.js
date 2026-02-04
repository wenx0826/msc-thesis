const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

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

module.exports = {
  logEvent,
  createEmptyLogFile,
  getISODate,
};
