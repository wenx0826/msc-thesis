import { documentsAPI } from "../../../api/index.js";
import {
  workspaceStore,
  documentsStore,
  documentViewerStore,
  projectGraphStore,
} from "../store/index.js";
import workspaceService from "./workspace.service.js";
import { getFileContentInHTML } from "../utils/file.js";

export default {
  async uploadDocument(file) {
    const projectId = workspaceStore.getProjectId();
    const filename = file.name;
    const content = await getFileContentInHTML(file);
    const newDoc = await documentsAPI.create({
      projectId,
      filename,
      content,
    });
    documentsStore.add(newDoc);
    workspaceService.displayDocument({
      id: newDoc.id,
      versionId: newDoc.latestVersionId,
    });

    return newDoc;
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
            console.log("!!!!!Loaded traces for document:", traces);
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
  async renameVersion(versionId, newName) {
    const newVersion = await documentsAPI.updateVersionMeta(versionId, {
      name: newName,
    });
    documentsStore.updateVersion(newVersion.documentId, newVersion);
  },
  async renameDocument(documentId, newName) {
    const newDoc = await documentsAPI.updateDocumentMeta(documentId, {
      name: newName,
    });
    documentsStore.updateDocumentName(newName);
  },
  async updateDocument(documentId, file) {
    const name = file.name;
    const filename = file.name;
    const content = await getFileContentInHTML(file);
    const newVersion = await documentsAPI.createVersion({
      documentId,
      name,
      filename,
      content,
    });
    workspaceService.displayDocument({
      id: documentId,
      versionId: newVersion.id,
    });
    documentsStore.addVersion(documentId, newVersion);
  },
  async deleteDocument(documentId) {
    await documentsAPI.delete(documentId);
    documentsStore.removeDocument(documentId);
    projectGraphStore.removeDocumentNode(documentId);
    // If the deleted document is currently active, clear the selection
    const viewedDocumentId = workspaceStore.getViewedDocumentId();
    if (viewedDocumentId === documentId) {
      workspaceService.clearDocumentSelection();
    }
  },
};
