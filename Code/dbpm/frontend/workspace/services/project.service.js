// Project Service - Handles project operations
import { projectsAPI } from "../../api/index.js";
import { workspaceStore, projectStore } from "../store/index.js";

export const projectService = {
  updateGeneratedModelNumber(number) {
    projectsAPI
      .updateProjectById(workspaceStore.getProjectId(), {
        generatedModelNumber: number,
      })
      .then(() => {
        projectStore.setGeneratedModelNumber(number);
      });
  },
};
