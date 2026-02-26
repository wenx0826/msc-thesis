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
        console.log("Uploaded document:", result.value);
        documentsStore.add(result.value);
        lastUploadedDoc = result.value;
      } else {
        console.error("Error uploading document:", result.reason);
      }
    }

    if (lastUploadedDoc) {
      console.log("Displaying last uploaded document:", lastUploadedDoc);
      workspaceService.displayDocument({
        id: lastUploadedDoc.id,
        versionId: lastUploadedDoc.latestVersionId,
      });
    }
  },
  async renameDocument(docId, newName) {
    const newDoc = await documentsAPI.updateMeta(docId, {
      name: newName,
    });
    documentsStore.update(docId, { name: newDoc.name });
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
      workspaceService.displayDocument({
        id: documentId,
        versionId: newVersion.id,
      });
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
