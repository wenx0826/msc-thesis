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

export default {
  async loadWorkspace(projectId) {
    let displayedDocument = null;
    const { documentsMeta = [], modelsMeta = [] } =
      await projectsAPI.getComponents(projectId);

    documentsStore.init(documentsMeta);
    modelsStore.init(modelsMeta);
    projectGraphStore.init(documentsMeta, modelsMeta);

    if (documentsMeta.length > 0) {
      const doc = documentsMeta.at(-1);
      const docLatestVersion = doc.versions.at(-1);
      if (docLatestVersion?.id) {
        displayedDocument = {
          id: doc.id,
          versionId: docLatestVersion.id,
        };
        documentService.loadVersion(docLatestVersion.id);
      }
    }

    workspaceStore.set({
      projectId,
      displayedDocument,
    });
  },
  clearModelDisplay() {
    workspaceStore.setDisplayedModel({
      id: null,
      versionId: null,
    });
    modelEditorStore.setModel(null);
    documentViewerStore.setActiveModelTrace(null);
  },

  async displayDocument(doc) {
    if (!doc?.id) {
      return;
    }

    const versionId =
      doc.versionId || documentsStore.getVersions(doc.id).at(-1)?.id || null;
    if (!versionId) {
      return;
    }

    const currDisplayedDocument = workspaceStore.getDisplayedDocument();
    const curDisplayedDocId = currDisplayedDocument?.id;
    const curDisplayedDocVersionId = currDisplayedDocument?.versionId;
    if (
      curDisplayedDocId === doc.id &&
      curDisplayedDocVersionId === versionId
    ) {
      return;
    }
    documentService.loadVersion(versionId);
    workspaceStore.setDisplayedDocument({
      id: doc.id,
      versionId,
    });
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

  toggleModelDisplay(modelRef) {
    const payload = typeof modelRef === "string" ? { id: modelRef } : modelRef;
    if (!payload?.id) {
      this.clearModelDisplay();
      return;
    }

    const modelId = payload.id;
    const versionId =
      payload.versionId || modelsStore.getModelLatestVersionIdById(modelId);
    const curActiveModel = workspaceStore.getDisplayedModel();

    if (
      curActiveModel?.id === modelId &&
      curActiveModel?.versionId === versionId
    ) {
      this.clearModelDisplay();
      return;
    }

    workspaceStore.setActiveModel({
      id: modelId,
      versionId: versionId || null,
    });
    modelEditorStore.setModelById(modelId);
    documentViewerStore.setActiveModelTraceByModelId(modelId);
    workspaceStore.setModelPopoverParams(null);
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
  },
};
