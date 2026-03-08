import { documentsAPI } from "../../../api/index.js";
import {
  workspaceStore,
  documentsStore,
  documentViewerStore,
  projectGraphStore,
  modelsStore,
} from "../store/index.js";
import workspaceService from "./workspace.service.js";
import { getFileContentInHTML } from "../../../modules/document/file.js";

export default {
  async uploadDocuments(files) {
    const projectId = workspaceStore.getProjectId();

    const uploadResults = await Promise.allSettled(
      Array.from(files).map(async (file) => {
        const filename = file.name;
        const content = await getFileContentInHTML(file);
        return documentsAPI.create({
          projectId,
          filename,
          content,
        });
      }),
    );

    let lastUploadedDoc = null;
    for (const result of uploadResults) {
      if (result.status === "fulfilled") {
        documentsStore.add(result.value);
        projectGraphStore.addDocumentNode(result.value);
        lastUploadedDoc = result.value;
      } else {
        console.error("Error uploading document:", result.reason);
      }
    }

    if (lastUploadedDoc) {
      workspaceService.displayDocument(
        lastUploadedDoc.id,
        lastUploadedDoc.latestVersionId,
      );
    }
  },
  async renameDocument(docId, newName) {
    const newDoc = await documentsAPI.updateMeta(docId, {
      name: newName,
    });
    documentsStore.update(docId, { name: newDoc.name });
  },
  async deleteDocument(documentId) {
    if (!documentId) {
      return null;
    }

    const relatedModelIds = modelsStore
      .getList()
      .filter(
        (model) =>
          String(model?.documentId ?? "") === String(documentId),
      )
      .map((model) => model.id);

    const result = await documentsAPI.delete(documentId);

    relatedModelIds.forEach((modelId) => {
      modelsStore.delete(modelId);
      documentViewerStore.removeTracesByModelId(modelId);
      projectGraphStore.removeModelNodeAndEdge(modelId);
    });

    const isViewedDocumentDeleted =
      workspaceStore.getViewedDocumentId() === documentId;
    const isEditingModelDeleted = relatedModelIds.includes(
      workspaceStore.getEditingModelId(),
    );

    documentsStore.delete(documentId);
    projectGraphStore.removeDocumentNodeAndEdges(documentId);

    if (isEditingModelDeleted) {
      workspaceService.clearModelDisplay();
    }

    if (isViewedDocumentDeleted) {
      workspaceService.clearDocumentDisplay();
    }

    return result;
  },
  async deleteDocumentsBulk(documentIds = []) {
    const uniqueIds = [...new Set((documentIds || []).filter(Boolean))];
    const failed = [];
    const deletedIds = [];

    for (const documentId of uniqueIds) {
      try {
        await this.deleteDocument(documentId);
        deletedIds.push(documentId);
      } catch (error) {
        failed.push({
          id: documentId,
          error,
        });
      }
    }

    return {
      deletedIds,
      failed,
    };
  },
  async uploadNewVersion(documentId, file) {
    const filename = file.name;
    const content = await getFileContentInHTML(file);
    const newVersion = await documentsAPI.createVersion({
      documentId,
      filename,
      content,
    });
    documentsStore.addVersion(documentId, newVersion);
    const currViewedDocId = workspaceStore.getViewedDocumentId();
    if (currViewedDocId === documentId) {
      workspaceService.displayDocument(documentId, newVersion.id);
    }
  },
  async loadVersion(versionId) {
    documentViewerStore.clear();
    const [contentResult, tracesResult] = await Promise.allSettled([
      documentsAPI.getContentByVersionId(versionId),
      documentsAPI.getTracesByVersionId(versionId),
    ]);

    if (contentResult.status !== "fulfilled") {
      documentViewerStore.clear();
      console.log("Error loading document content:", contentResult.reason);
      return;
    }

    documentViewerStore.setContent(contentResult.value);

    if (tracesResult.status !== "fulfilled") {
      console.log("Error loading traces:", tracesResult.reason);
      return;
    }

    const traces = Array.isArray(tracesResult.value) ? tracesResult.value : [];
    console.log("Loaded traces for version", versionId, traces);
    documentViewerStore.setTraces(traces);

    const { versionId: editingModelVersionId } = workspaceStore.getEditingModel() || {};
    const preferredModelVersionId = editingModelVersionId || null;
    if (preferredModelVersionId) {
      documentViewerStore.setActiveModelTraceByModelVersionId(
        preferredModelVersionId,
      );
    }
  },
};
