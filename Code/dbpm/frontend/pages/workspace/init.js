// Workspace Init - Entry point for workspace.html
// This file initializes all stores, services, and UI components

// Import stores
import {
  workspaceStore,
  documentsStore,
  modelsStore,
  activeDocumentStore,
  activeModelStore,
  projectGraphStore,
} from "./store/index.js";

// Import services
import { workspaceService } from "./services/index.js";

// Import utilities
import "./util/selection.util.js";
import { getProjectIdFromURL } from "../../shared/util/url.js";

// Import UI modules individually
import { initActiveDocumentUI, initActiveModelUI } from "./ui/index.js";

const projectId = getProjectIdFromURL();
workspaceStore.setProjectId(projectId);

await documentsStore.init(projectId);
const documents = documentsStore.getDocuments();
await modelsStore.init(documents);

const models = modelsStore.getModels();
projectGraphStore.init(documents, models);

const activeDocumentId =
  documents.length > 0 ? documents[documents.length - 1].id : null;
activeDocumentStore.init(activeDocumentId);
initActiveDocumentUI();
initActiveModelUI();
workspaceStore.setActiveDocumentId(activeDocumentId);
