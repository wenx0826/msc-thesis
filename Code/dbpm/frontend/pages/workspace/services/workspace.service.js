import { projectsAPI } from "../../../api/index.js";
import documentService from "./document.service.js";
import modelService from "./model.service.js";
import {
  workspaceStore,
  documentsStore,
  documentViewerStore,
  modelsStore,
  modelEditorStore,
  projectGraphStore,
} from "../store/index.js";

export default {
  async loadWorkspace(projectId) {
    let viewedDocument = undefined;
    const { documentsMeta, modelsMeta, subprocessLinks = [] } =
      await projectsAPI.getComponents(projectId);
    console.log("Loaded workspace components:", {
      documentsMeta,
      modelsMeta,
      subprocessLinks,
    });
    documentsStore.init(documentsMeta);
    modelsStore.init(modelsMeta);
    projectGraphStore.init(documentsMeta, modelsMeta, subprocessLinks);

    if (documentsMeta.length > 0) {
      const docMeta = documentsMeta.at(-1);
      viewedDocument = {
        id: docMeta.id,
        versionId: docMeta.latestVersionId,
      };
      documentService.loadVersion(docMeta.latestVersionId);
    }

    workspaceStore.set({
      projectId,
      viewedDocument,
    });
  },

  async displayDocument(id, versionId) {
    if (!id) {
      return;
    }
    if (!versionId) versionId = documentsStore.getLatestVersionId(id);
    const { id: currViewedDocId, versionId: currViewedDocVersionId } =
      workspaceStore.getViewedDocument();
    if (currViewedDocId === id && currViewedDocVersionId === versionId) {
      return;
    }
    documentService.loadVersion(versionId);
    workspaceStore.setViewedDocument({ id, versionId });
    const editingModelId = workspaceStore.getEditingModelId();
    if (!!editingModelId) {
      const editingModelDocumentId =
        modelsStore.getModelDocumentId(editingModelId);
      if (editingModelDocumentId !== id) {
        this.toggleModelDisplay(null, null);
      }
    }
  },
  clearModelDisplay() {
    workspaceStore.setEditingModel({
      id: null,
      versionId: null,
    });
    modelEditorStore.clearStatusMessage();
    modelEditorStore.setData(null, {
      updateType: null,
    });
    documentViewerStore.setActiveModelTrace(null);
  },
  clearDocumentDisplay() {
    workspaceStore.setViewedDocument({
      id: null,
      versionId: null,
    });
    documentViewerStore.clear();
    workspaceStore.setModelPopoverParams(null);
    this.clearModelDisplay();
  },
  clearDocumentSelection() {
    this.clearDocumentDisplay();
  },
  toggleModelDisplay(id, versionId) {
    if (!id) {
      this.clearModelDisplay();
      return;
    }
    if (!versionId) {
      versionId = modelsStore.getLatestVersionId(id);
    }
    const { id: currEditingModelId, versionId: currEditingModelVersionId } =
      workspaceStore.getEditingModel();

    if (currEditingModelId === id && currEditingModelVersionId === versionId) {
      this.clearModelDisplay();
      return;
    }
    workspaceStore.setEditingModel({ id, versionId });
    modelService.loadVersion(versionId);
    workspaceStore.setModelPopoverParams(null);

    const currDisplayedDocumentId = workspaceStore.getViewedDocumentId();
    const currModelDocumentId = modelsStore.getModelDocumentId(id);
    if (currDisplayedDocumentId !== currModelDocumentId) {
      this.displayDocument(currModelDocumentId);
    } else {
      documentViewerStore.setActiveModelTraceByModelId(id);
    }
  },
};
