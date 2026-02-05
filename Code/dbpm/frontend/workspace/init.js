// Workspace Init - Entry point for workspace.html
// This file initializes all stores, services, and UI components

// Import stores
import {
  workspaceStore,
  projectStore,
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
import { getProjectIdFromURL } from "../util/url.js";

// Import UI modules individually
import {
  initHeaderUI,
  initDocumentsUI,
  initActiveDocumentUI,
  initModelsUI,
  initActiveModelUI,
  initActiveModelDetailsUI,
  initProjectGraphUI,
} from "./ui/index.js";

// Get project ID from URL (works before DOM ready)
const projectId = getProjectIdFromURL();
// console.log("Workspace init - Project ID:", projectId);
workspaceStore.setProjectId(projectId);
const projectStoreReady = projectStore.init(projectId);
const documentsReady = documentsStore.init(projectId);

// Initialize UI progressively as stores become ready
// $(document).ready(async () => {
console.log("workspace/init.js - DOM ready", new Date().toISOString());

// Header UI - needs projectStore
projectStoreReady.then(() => {
  initHeaderUI();
});

await documentsReady;
const documents = documentsStore.getDocuments();
initDocumentsUI();
await modelsStore.init(documents);
initModelsUI();

const models = modelsStore.getModels();
projectGraphStore.init(documents, models);
initProjectGraphUI();

const activeDocumentId =
  documents.length > 0 ? documents[documents.length - 1].id : null;
activeDocumentStore.init(activeDocumentId);
initActiveDocumentUI();
initActiveModelUI();
initActiveModelDetailsUI();
workspaceStore.setActiveDocumentId(activeDocumentId);

console.log("Workspace init complete", new Date().toISOString());
// });
