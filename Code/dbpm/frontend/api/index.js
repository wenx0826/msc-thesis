// API Module - Entry point
// Re-exports all API modules and exposes to window for backward compatibility

import { logsAPI } from "./logs.api.js";
import { projectsAPI } from "./projects.api.js";
import { documentsAPI } from "./documents.api.js";
import { tracesAPI } from "./traces.api.js";
import { modelsAPI } from "./models.api.js";
import { statsAPI } from "./stats.api.js";

export { logsAPI, projectsAPI, documentsAPI, tracesAPI, modelsAPI, statsAPI };
