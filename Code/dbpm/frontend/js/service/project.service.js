const projectService = {
  updateGeneratedModelNumber(number) {
    API.project
      .updateProjectById(workspaceStore.getProjectId(), {
        generatedModelNumber: number,
      })
      .then(() => {
        projectStore.setGeneratedModelNumber(number);
      });
  },
  async createProject(project) {
    return API.project.createProject(project).then((createdProject) => {
      return createdProject;
    });
  },
  async getDocumentCount(projectId) {
    return API.project.getDocumentCount(projectId).then((count) => {
      return count;
    });
  },
  async getModelCount(projectId) {
    return API.project.getModelCount(projectId).then((count) => {
      return count;
    });
  },
};
