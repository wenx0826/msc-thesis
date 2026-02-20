// Workspace Init - Entry point for workspace.html
// This file initializes all stores, services, and UI components

// Import stores
import {
  workspaceStore,
  modelsStore,
  activeDocumentStore,
  projectGraphStore,
} from "./store/index.js";

// Import services
import { documentService } from "./services/index.js";
import { workspaceService } from "./services/workspace.service.js";

// Import utilities
import "./util/selection.util.js";
import { getProjectIdFromURL } from "../../shared/util/url.js";

// Import UI modules individually
import "./ui/index.js";

const projectId = getProjectIdFromURL();
workspaceStore.setProjectId(projectId);
workspaceService.initAllStores(projectId);
// const documents = await documentService.initDocumentsStore(projectId);
// await modelsStore.init(documents);

// const models = modelsStore.getModels();
// projectGraphStore.init(documents, models);

// const activeDocumentId =
//   documents.length > 0 ? documents[documents.length - 1].id : null;
// activeDocumentStore.init(activeDocumentId);

// workspaceStore.setActiveDocumentId(activeDocumentId);
