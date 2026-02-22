import { createUI } from "../../../shared/utils/ui.js";
import { documentsAPI, projectsAPI } from "../../../api/index.js";
import {
  getProjectIdFromURL,
  getProjectWorkspaceURL,
  getDocumentURL,
} from "../../../shared/utils/url.js";
import store from "../store.js";
createUI({
  setup: () => {
    // const
    renderProjectLink();
    renderDocumentsList();
  },
  bindListeners: () => {},
});
