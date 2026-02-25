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
    const { documentsMeta, modelsMeta } =
      await projectsAPI.getComponents(projectId);
    console.log("Loaded workspace components:", { documentsMeta, modelsMeta });
    documentsStore.init(documentsMeta);
    modelsStore.init(modelsMeta);
    projectGraphStore.init(documentsMeta, modelsMeta);

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

  clearModelDisplay() {
    workspaceStore.setEditingModel({
      id: null,
      versionId: null,
    });
    modelEditorStore.setModel(null);
    documentViewerStore.setActiveModelTrace(null);
  },

  async displayDocument({ id, versionId }) {
    const { id: currViewedDocId, versionId: currViewedDocVersionId } =
      workspaceStore.getViewedDocument();
    if (!versionId) versionId = documentsStore.getLatestVersionId(id);
    if (currViewedDocId === id && currViewedDocVersionId === versionId) {
      return;
    }
    documentService.loadVersion(versionId);
    workspaceStore.setViewedDocument({ id, versionId });
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
  },

  toggleModelDisplay({ id, versionId }) {
    console.log("Toggling model display for:", { id, versionId });
    if (!id) {
      this.clearModelDisplay();
      return;
    }
    const { id: currEditingModelId, versionId: currEditingModelVersionId } =
      workspaceStore.getEditingModel();

    if (currEditingModelId === id && currEditingModelVersionId === versionId) {
      this.clearModelDisplay();
      return;
    }
    workspaceStore.setEditingModel({ id, versionId });
    modelService.loadVersion(versionId);
    // modelEditorStore.setModelById(modelId);
    // documentViewerStore.setActiveModelTraceByModelId(modelId);
    workspaceStore.setModelPopoverParams(null);
    // if (currActiveModelId === id) {
    //   id = null;
    //   this.clearModelDisplay();
    //   return;
    // }
    // workspaceStore.setActiveModelId(model.id);
    // modelEditorStore.setModelById(model.id);

    // if (model.id) {
    //   const currDisplayedDocumentId = workspaceStore.getActiveDocumentId();
    //   const activeModelDocumentId = modelsStore.getModelDocumentIdById(
    //     model.id,
    //   );
    //   if (currDisplayedDocumentId != activeModelDocumentId) {
    //     // this.displayDocument({ id: activeModelDocumentId });
    //   } else {
    //     documentViewerStore.setActiveModelTraceByModelId(model.id);
    //   }
    //   workspaceStore.setModelPopoverParams(null);
    // }
  },
};
