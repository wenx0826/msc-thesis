// Document Service - Handles document operations
import { documentsAPI } from "../../api/index.js";
import {
  workspaceStore,
  documentsStore,
  projectGraphStore,
} from "../store/index.js";
import { workspaceService } from "./workspace.service.js";

export const documentService = {
  async uploadDocument(doc) {
    const projectId = workspaceStore.getProjectId();
    const newDoc = await documentsAPI.createDocument({ ...doc, projectId });
    documentsStore.addDocument(newDoc);
    const docId = newDoc.id;
    projectGraphStore.addDocumentNode(newDoc);
    workspaceService.activateDocumentById(docId);
    return newDoc;
  },
};
