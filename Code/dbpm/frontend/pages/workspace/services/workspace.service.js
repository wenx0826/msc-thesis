// Workspace Service - Orchestrates workspace operations
import init from "../../../shared/widgets/inlineEditor.js";
import { documentsAPI } from "../../../api/index.js";

import {
  workspaceStore,
  documentsStore,
  modelsStore,
  activeDocumentStore,
  activeModelStore,
  projectGraphStore,
} from "../store/index.js";
import { documentService } from "./document.service.js";
import { modelsAPI } from "../../../api/index.js";
const STORAGE_KEY = "dbpm_workspace";

export const workspaceService = {
  async initAllStores(projectId) {
    // documentService.initDocumentsStore(projectId);
    // Placeholder for any future initialization logic
    const documentsReady = documentsAPI
      .getByProjectId(projectId)
      .then((documents) => {
        documentsStore.init(documents); // remove await if init is sync
        return documents;
      });

    const modelsReady = modelsAPI.getByProjectId(projectId).then((models) => {
      modelsStore.init(models); // remove await if init is sync
      return models;
    });

    const [documents, models] = await Promise.all([
      documentsReady,
      modelsReady,
    ]);

    projectGraphStore.init(documents, models);

    // return documents;
  },
  // localStorage helpers
  _saveToStorage() {
    const data = {
      projectId: workspaceStore.getProjectId(),
      activeDocumentId: workspaceStore.getActiveDocumentId(),
      activeModelId: workspaceStore.getActiveModelId(),
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  _loadFromStorage(projectId) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return data?.projectId === projectId ? data : null;
    } catch {
      return null;
    }
  },

  async loadWorkspace(projectId) {
    // Phase 1: Init independent stores (parallel)
    // console.log("Loading workspace for project ID:", projectId);
    // projectStore.init(projectId);
    // await documentsStore.init(projectId);
    // // Phase 2: Init dependent stores (pass data explicitly)
    // const documents = documentsStore.getDocuments();
    // await modelsStore.init(documents);
    // // Phase 3: Init aggregate stores
    // const models = modelsStore.getModels();
    // projectGraphStore.init(documents, models);
    // // Phase 4: Restore workspace state
    // this.restoreWorkspaceState(projectId);
  },

  restoreWorkspaceState(projectId) {
    const documents = documentsStore.getDocuments();

    // Try to restore from localStorage
    const cached = this._loadFromStorage(projectId);

    // Determine active document
    let docId = cached?.activeDocumentId ?? null;
    console.log("Restoring workspace - cached docId:", docId);
    // Validate cached docId still exists
    if (docId && !documents.find((d) => d.id === docId)) {
      docId = null;
    }

    // Fallback to last document if no valid cached selection
    if (!docId && documents.length > 0) {
      docId = documents[documents.length - 1]?.id;
    }

    if (docId) {
      this.activateDocumentById(docId);
    }

    workspaceStore.setWorkspace({
      projectId,
      activeDocumentId: docId,
    });

    // Restore model selection if valid
    if (cached?.activeModelId) {
      const model = modelsStore.getModelById(cached.activeModelId);
      if (model) {
        this.toggleModelSelection(cached.activeModelId);
      }
    }
    this._saveToStorage();
  },

  clearModelSelection() {
    workspaceStore.setActiveModelId(null);
    activeModelStore.setModel(null);
    activeDocumentStore.setActiveModelTrace(null);
  },

  async activateDocumentById(documentId) {
    const currentActiveDocumentId = workspaceStore.getActiveDocumentId();
    if (currentActiveDocumentId === documentId) {
      return;
    }
    workspaceStore.setActiveDocumentId(documentId);
    await activeDocumentStore.setDocumentById(documentId);
    const activeModelId = workspaceStore.getActiveModelId();
    if (activeModelId) {
      const activeModelDocumentId =
        modelsStore.getModelDocumentIdById(activeModelId);
      if (documentId === activeModelDocumentId) {
        activeDocumentStore.setActiveModelTraceByModelId(activeModelId);
      } else {
        this.clearModelSelection();
      }
    }
    this._saveToStorage();
  },

  toggleModelSelection(modelId) {
    const currentActiveModelId = workspaceStore.getActiveModelId();

    if (currentActiveModelId === modelId) {
      modelId = null;
      this.clearModelSelection();
      return;
    }
    workspaceStore.setActiveModelId(modelId);
    activeModelStore.setModelById(modelId);

    if (modelId) {
      const currentActiveDocumentId = workspaceStore.getActiveDocumentId();
      const activeModelDocumentId = modelsStore.getModelDocumentIdById(modelId);
      if (currentActiveDocumentId != activeModelDocumentId) {
        this.activateDocumentById(activeModelDocumentId);
      } else {
        activeDocumentStore.setActiveModelTraceByModelId(modelId);
      }
      workspaceStore.setModelPopoverParams(null);
    }
    this._saveToStorage();
  },
};
