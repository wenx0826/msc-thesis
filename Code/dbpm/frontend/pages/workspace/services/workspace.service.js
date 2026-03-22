import { projectsAPI, documentModelLinksAPI } from "../../../api/index.js";
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

function resolveDocumentIsLatest(documentId, versionId) {
  if (!documentId || !versionId) {
    return null;
  }
  return documentsStore.isLatestVersion(documentId, versionId);
}

function resolveDocumentIdByVersionId(versionId) {
  if (!versionId) {
    return null;
  }
  const documents = documentsStore.getList();
  for (const document of documents) {
    const versions = Array.isArray(document?.versions) ? document.versions : [];
    if (
      versions.some(
        (version) => String(version?.id || "") === String(versionId),
      )
    ) {
      return document.id;
    }
  }
  return null;
}

export default {
  async loadWorkspace(projectId) {
    let viewedDocument = null;
    const {
      documentsMeta,
      modelsMeta,
      subprocessLinks = [],
    } = await projectsAPI.getComponents(projectId);
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
        isLatest: true,
      };
      documentService.loadVersion(docMeta.latestVersionId);
    }

    workspaceStore.set({
      projectId,
      viewedDocument,
    });
  },

  async displayDocument(id, versionId, clearModelOnContextChange = true) {
    if (!id) {
      return;
    }
    if (!versionId) versionId = documentsStore.getLatestVersionId(id);
    const nextIsLatest = resolveDocumentIsLatest(id, versionId);
    const {
      id: currViewedDocId,
      versionId: currViewedDocVersionId,
    } = workspaceStore.getViewedDocument() || {};
    if (currViewedDocId === id && currViewedDocVersionId === versionId) {
      return;
    }
    await documentService.loadVersion(versionId);
    workspaceStore.setViewedDocument({
      id,
      versionId,
      isLatest: nextIsLatest,
    });

    if (clearModelOnContextChange) {
      this.clearModelDisplay();
    }

    // const editingModelId = workspaceStore.getEditingModelId();
    // if (!!editingModelId) {
    //   const editingModelDocumentId =
    //     modelsStore.getModelDocumentId(editingModelId);
    //   const versionChangedWithinSameDocument =
    //     currViewedDocId === id &&
    //     String(currViewedDocVersionId || "") !== String(versionId || "");

    //   if (editingModelDocumentId !== id || versionChangedWithinSameDocument) {
    //     this.clearModelDisplay();
    //   }
    // }
  },
  clearModelDisplay() {
    modelService.discardPendingNewModelDraft({ clearEditorData: false });
    workspaceStore.setEditingModel(null);
    modelEditorStore.clearStatusMessage();
    modelEditorStore.setData(null, {
      updateType: null,
    });
    documentViewerStore.setEditingModelLink(null);
  },
  clearDocumentDisplay() {
    workspaceStore.setViewedDocument(null);
    documentViewerStore.clear();
    workspaceStore.setModelPopover(null);
    this.clearModelDisplay();
  },
  clearDocumentSelection() {
    this.clearDocumentDisplay();
  },
  async toggleModelDisplay(id, versionId, shouldUpdateViewedDocument = true) {
    if (!id) {
      this.clearModelDisplay();
      return;
    }

    const resolvedVersionId = versionId || modelsStore.getLatestVersionId(id);
    const { id: currEditingModelId, versionId: currEditingModelVersionId } =
      workspaceStore.getEditingModel() || {};

    const isSameModelVersion =
      currEditingModelId === id &&
      currEditingModelVersionId === resolvedVersionId;

    if (isSameModelVersion) {
      this.clearModelDisplay();
      return;
    }

    await this.displayModel(id, resolvedVersionId, shouldUpdateViewedDocument);
  },
  async displayModel(id, versionId, shouldUpdateViewedDocument = true) {
    let isLatest;
    if (!id) {
      this.clearModelDisplay();
      return;
    }
    if (!versionId) {
      versionId = modelsStore.getLatestVersionId(id);
      isLatest = true;
    } else {
      isLatest = modelsStore.isLatestVersion(id, versionId);
    }

    const { id: currEditingModelId, versionId: currEditingModelVersionId } =
      workspaceStore.getEditingModel() || {};

    if (currEditingModelId === id && currEditingModelVersionId === versionId) {
      return;
    }

    workspaceStore.setEditingModel({
      id,
      versionId,
      isLatest,
    });
    modelService.loadVersion(versionId);
    workspaceStore.setModelPopover(null);

    let resolvedHistoricalLink = null;
    if (shouldUpdateViewedDocument) {
      let targetDocumentId, targetDocumentVersionId;
      if (isLatest) {
        targetDocumentId = modelsStore.getModelDocumentId(id) || null;
      } else {
        const latestLink =
          await documentModelLinksAPI.getLatestLinkByModelVersionId(versionId);
        resolvedHistoricalLink = latestLink || null;
        targetDocumentId = latestLink?.documentId;
        targetDocumentVersionId = latestLink?.documentVersionId;
      }
      await this.displayDocument(
        targetDocumentId,
        targetDocumentVersionId || null,
        false,
      );
    }
    if (resolvedHistoricalLink) {
      documentViewerStore.setEditingModelLinkBySerializedLink(
        resolvedHistoricalLink,
      );
    } else {
      documentViewerStore.setEditingModelLinkByModelVersionId(versionId);
    }
  },
};
