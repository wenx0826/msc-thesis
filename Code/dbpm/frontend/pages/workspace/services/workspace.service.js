import { projectsAPI } from "../../../api/index.js";
import documentService from "./document.service.js";
import {
  workspaceStore,
  documentsStore,
  documentViewerStore,
  modelsStore,
  modelEditorStore,
  projectGraphStore,
} from "../store/index.js";

const STORAGE_KEY = "dbpm_workspace";

export default {
  // localStorage helpers
  _saveToStorage() {
    const data = {
      projectId: workspaceStore.getProjectId(),
      // displayedDocumentId: workspaceStore.getActiveDocumentId(),
      // displayModelId: workspaceStore.getDisplayedModelId(),
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
    // workspaceStore.setStatus("loading");
    // workspaceStore.setWorkspace({ projectId });
    let displayedDocument = {};
    const { documents, models } = await projectsAPI.getComponents(projectId);
    documentsStore.init(documents);
    modelsStore.init(models);
    projectGraphStore.init(documents, models);
    if (documents.length > 0) {
      const doc = documents.at(-1);
      const docLatestVersion = doc.versions.at(-1);
      displayedDocument = {
        id: doc.id,
        versionId: docLatestVersion.id,
      };
      documentService.loadVersion(docLatestVersion.id);
    }
    workspaceStore.set({
      projectId,
      displayedDocument,
    });
    // workspaceStore.setStatus("ready");
  },

  restoreWorkspaceState(projectId) {
    const documents = documentsStore.getDocuments();

    // Try to restore from localStorage
    const cached = this._loadFromStorage(projectId);

    // Determine active document
    let docId = cached?.displayedDocumentId ?? null;
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
      this.displayDocument({ id: docId });
    }

    workspaceStore.setWorkspace({
      projectId,
      displayedDocumentId: docId,
    });

    // Restore model selection if valid
    if (cached?.displayModelId) {
      const model = modelsStore.getModelById(cached.displayModelId);
      if (model) {
        this.toggleModelDisplay(cached.displayModelId);
      }
    }
    this._saveToStorage();
  },

  clearModelDisplay() {
    workspaceStore.setDisplayedModel({});
    modelEditorStore.setModel(null);
    documentViewerStore.setActiveModelTrace(null);
  },

  async displayDocument(doc) {
    const currDisplayedDocument = workspaceStore.getDisplayedDocument();
    const curDisplayedDocId = currDisplayedDocument?.id;
    const curDisplayedDocVersionId = currDisplayedDocument?.versionId;
    if (
      curDisplayedDocId === doc.id &&
      curDisplayedDocVersionId === doc.versionId
    ) {
      return;
    }
    documentService.loadVersion(doc.versionId);
    workspaceStore.setDisplayedDocument(doc);
    // await documentViewerStore.setDocumentById(docId);
    // const displayedModelId = workspaceStore.getDisplayedModelId();
    // if (displayedModelId) {
    //   const activeModelDocumentId =
    //     modelsStore.getModelDocumentIdById(displayModelId);
    //   if (doc.id === activeModelDocumentId) {
    //     documentViewerStore.setActiveModelTraceByModelId(displayModelId);
    //   } else {
    //     this.clearModelDisplay();
    //   }
    // }
    // this._saveToStorage();
  },

  toggleModelDisplay({ id, versionId }) {
    const curActiveModel = workspaceStore.getDisplayedModel();
    if (!versionId) {
    }
    workspaceStore.setActiveModel({ id, versionId });
    // if (curActiveModelId === id) {
    //   id = null;
    //   this.clearModelDisplay();
    //   return;
    // }
    // workspaceStore.setActiveModelId(model.id);
    // modelEditorStore.setModelById(model.id);

    // if (model.id) {
    //   const curDisplayedDocumentId = workspaceStore.getActiveDocumentId();
    //   const activeModelDocumentId = modelsStore.getModelDocumentIdById(
    //     model.id,
    //   );
    //   if (curDisplayedDocumentId != activeModelDocumentId) {
    //     // this.displayDocument({ id: activeModelDocumentId });
    //   } else {
    //     documentViewerStore.setActiveModelTraceByModelId(model.id);
    //   }
    //   workspaceStore.setModelPopoverParams(null);
    // }
    // this._saveToStorage();
  },
};
