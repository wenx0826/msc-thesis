import { documentsAPI } from "../../../api/index.js";
import {
  workspaceStore,
  documentsStore,
  documentViewerStore,
  projectGraphStore,
  modelsStore,
} from "../store/index.js";
import workspaceService from "./workspace.service.js";
import { getFileContentInHTML } from "../utils/file.js";

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
    const contentPromise = documentsAPI.getContentByVersionId(versionId);
    const tracesPromise = documentsAPI.getTracesByVersionId(versionId);
    // return new Promise((resolve, reject) => {
    contentPromise.then(
      (content) => {
        documentViewerStore.setContent(content);
        // this.setStatus(null);
        tracesPromise
          .then((traces) => {
            console.log("Loaded traces for version", versionId, traces);
            documentViewerStore.setTraces(traces);
            // resolve();
          })
          .catch((error) => {
            console.log("Error loading traces:", error);
            // resolve();
          });
      },
      (error) => {
        documentViewerStore.clear();
        // this.setStatus("error");
        // reject(error);
      },
    );
    // });
  },
};
