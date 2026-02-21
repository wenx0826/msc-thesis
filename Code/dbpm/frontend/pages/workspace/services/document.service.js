// Document Service - Handles document operations
import { documentsAPI } from "../../../api/index.js";
import {
  workspaceStore,
  documentsStore,
  projectGraphStore,
} from "../store/index.js";
import workspaceService from "./workspace.service.js";
import { getFileContentInHTML } from "../util/document.js";

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
    documentsStore.addDocument(newDoc);
    const docId = newDoc.id;
    projectGraphStore.addDocumentNode(newDoc);
    workspaceService.activateDocumentById(docId);
    return newDoc;
  },
};
