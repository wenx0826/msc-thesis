import { createUI } from "../../../shared/util/ui.js";
import { projectsAPI } from "../../../api/index.js";
createUI({
  setup: async () => {
    const [documents, models] = await projectsAPI.getDetails(projectId);
    renderProjectLink();
    renderDocumentsList();
  },
  bindListeners: () => {},
});
