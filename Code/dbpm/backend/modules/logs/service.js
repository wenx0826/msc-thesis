import logRepo from "./repository.js";

export default {
  logEvent(projectId, event, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
    };
    logRepo.appendEntry(projectId, logEntry);
  },

  create(projectId) {
    logRepo.createEmptyFile(projectId);
  },
};
