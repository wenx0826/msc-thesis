import projectRepo from "./repository.js";
import logService from "../logs/service.js";
import documentService from "../documents/service.js";
import modelService from "../models/service.js";

export default {
  create(name) {
    try {
      const createdProject = projectRepo.create({ name });
      logService.create(createdProject.id);
      logService.logEvent(createdProject.id, "project_created", {
        id: createdProject.id,
        name,
      });
      return createdProject;
    } catch (err) {
      throw err;
    }
  },
  getAll() {
    return projectRepo.findAll();
  },
  getOverview() {
    const overview = {
      projects: { count: projectRepo.count() },
      documents: {
        count: documentService.count(),
        averageWordsCount: documentService.getAverageWordsCount(),
        averageVersionsCount: documentService.getAverageVersionsCount(),
      },
      models: {
        count: modelService.count(),
        averageSelectedWordsCount: modelService.getAverageSelectedWordsCount(),
        averageVersionsCount: modelService.getAverageVersionsCount(),
      },
    };
    return overview;
  },
  get(projectId) {
    const project = projectRepo.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    return project;
  },
  getComponentsById(projectId, includeDeleted = false) {
    const project = projectRepo.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    const includeDeletedRecords = includeDeleted === true;
    const documentsMeta = documentService.getByProjectId(
      projectId,
      includeDeletedRecords,
    );
    const modelsMeta = modelService.getByProjectId(
      projectId,
      includeDeletedRecords,
    );
    return { documentsMeta, modelsMeta };
  },

  getComponentsStatsById(projectId, includeDeleted = true) {
    const project = projectRepo.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    const includeDeletedRecords = includeDeleted !== false;
    const documents = documentService.getByProjectId(
      projectId,
      includeDeletedRecords,
    );
    const models = modelService.getByProjectId(projectId, includeDeletedRecords);
    return { documents, models };
  },

  allocateLatestModelNumberById(projectId) {
    const latestModelNumber = projectRepo.allocateLatestModelNumberById(
      projectId,
    );
    if (!latestModelNumber) {
      throw new Error("Project not found");
    }
    return Number(latestModelNumber);
  },
  update(projectId, updates) {
    const project = projectRepo.updateById(projectId, updates);
    if (!project) {
      throw new Error("Project not found or no valid fields to update");
    }
    return project;
  },
  delete(projectId) {
    const project = projectRepo.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.deletedAt) {
      return { message: "Project deleted" };
    }

    const activeDocuments = documentService.getByProjectId(projectId, false);
    for (const document of activeDocuments) {
      documentService.deleteDocument(document.id);
    }

    const remainingModels = modelService.getByProjectId(projectId, false);
    for (const model of remainingModels) {
      modelService.deleteModel(model.id);
    }

    projectRepo.softDelete(projectId);

    logService.logEvent(projectId, "project_deleted", {
      id: projectId,
      name: project.name,
    });

    return { message: "Project deleted" };
  },
};
