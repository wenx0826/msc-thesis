import projectRepo from "./repository.js";
import logService from "../logs/service.js";
import documentService from "../documents/service.js";
import modelService from "../models/service.js";

export default {
  create(name) {
    const createdProject = projectRepo.create({ name });
    logService.create(createdProject.id);
    logService.logEvent(createdProject.id, "project_created", {
      id: createdProject.id,
      name,
    });
    return createdProject;
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
    return projectRepo.findById(projectId);
  },
  getComponentsById(projectId, includeDeleted = false) {
    const includeDeletedRecords = includeDeleted === true;
    const documentsMeta = documentService.getByProjectId(
      projectId,
      includeDeletedRecords,
    );
    const modelsMeta = modelService.getByProjectId(
      projectId,
      includeDeletedRecords,
    );
    const subprocessLinks = modelService.getLatestSubprocessLinksByProjectId(
      projectId,
      includeDeletedRecords,
    );
    return { documentsMeta, modelsMeta, subprocessLinks };
  },

  getComponentsStatsById(projectId, includeDeleted = true) {
    const includeDeletedRecords = includeDeleted !== false;
    const documents = documentService.getByProjectId(
      projectId,
      includeDeletedRecords,
    );
    const rawModels = modelService.getByProjectId(
      projectId,
      includeDeletedRecords,
    );
    const modelUpdateEventsSummary =
      modelService.getUpdateEventsSummaryByProjectId(
        projectId,
        includeDeletedRecords,
        rawModels,
      );
    const models = modelService.attachUpdatesStatsToModels(
      rawModels,
      modelUpdateEventsSummary,
    );
    return { documents, models, modelUpdateEventsSummary };
  },

  allocateLatestModelNumberById(projectId) {
    return Number(projectRepo.allocateLatestModelNumberById(projectId));
  },
  update(projectId, updates) {
    return projectRepo.updateById(projectId, updates);
  },
  delete(projectId) {
    const project = projectRepo.findById(projectId);
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
