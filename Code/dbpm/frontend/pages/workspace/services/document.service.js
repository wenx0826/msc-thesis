import { documentsAPI } from "../../../api/index.js";
import {
  workspaceStore,
  documentsStore,
  documentViewerStore,
  projectGraphStore,
} from "../store/index.js";
import workspaceService from "./workspace.service.js";
import { getFileContentInHTML } from "../utils/document.js";

export default {
  async uploadDocument(file) {
    const projectId = workspaceStore.getProjectId();
    const name = file.name;
    const content = await getFileContentInHTML(file);
    const newDoc = await documentsAPI.create({
      projectId,
      name,
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
    // const tracesPromise = tracesAPI.getTracesByDocumentId(id);
    return new Promise((resolve, reject) => {
      contentPromise.then(
        (content) => {
          documentViewerStore.setContent(content);
          // this.setStatus(null);
          // tracesPromise
          //   .then((traces) => {
          //     console.log("Loaded traces for document:", traces);
          //     this.setTraces(traces);
          //     resolve();
          //   })
          //   .catch((error) => {
          //     console.log("Error loading traces:", error);
          //     resolve();
          //   });
        },
        (error) => {
          documentViewerStore.clear();
          this.setStatus("error");
          reject(error);
        },
      );
    });
  },
  async updateDocument(documentId, file) {
    const name = file.name;
    const content = await getFileContentInHTML(file);
    const newVersion = await documentsAPI.createVersion({
      documentId,
      name,
      content,
    });
    workspaceService.displayDocument({
      id: documentId,
      versionId: newVersion.id,
    });
    documentsStore.addDocumentVersion(documentId, newVersion);
  },
  async deleteDocument(documentId) {
    await documentsAPI.delete(documentId);
    documentsStore.removeDocument(documentId);
    projectGraphStore.removeDocumentNode(documentId);
    // If the deleted document is currently active, clear the selection
    const displayedDocumentId = workspaceStore.getActiveDocumentId();
    if (displayedDocumentId === documentId) {
      workspaceService.clearDocumentSelection();
    }
  },
};
