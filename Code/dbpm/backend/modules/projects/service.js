import crypto from "crypto";
import projectRepo from "./repository.js";
import logService from "../logs/service.js";
import documentService from "../documents/service.js";
import modelService from "../models/service.js";

export default {
  create(name) {
    const id = crypto.randomUUID();

    try {
      const createdProject = projectRepo.create({ id, name });
      logService.create(id);
      logService.logEvent(id, "project_created", { id, name });
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
  getComponentsById(projectId) {
    const project = projectRepo.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    const documentsMeta = documentService.getByProjectId(projectId);
    const modelsMeta = modelService.getByProjectId(projectId);
    return { documentsMeta, modelsMeta };
  },

  getComponentsStatsById(projectId) {
    const project = projectRepo.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    const documents = documentService.getByProjectId(projectId, true);
    const models = modelService.getByProjectId(projectId, true);
    return { documents, models };
  },

  getModelGenerationIndexById(projectId) {
    return Number(projectRepo.findModelGenerationIndexById(projectId)) || 0;
  },
  update(projectId, updates) {
    const project = projectRepo.update(projectId, updates);
    if (!project) {
      throw new Error("Project not found or no valid fields to update");
    }
    return project;
  },
};
