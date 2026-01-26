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
};
