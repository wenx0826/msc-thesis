import crypto from "crypto";
import projectRepo from "./repository.js";
import { logEvent, createEmptyLogFile } from "../../utils/logger.js";
import documentService from "../documents/service.js";
import modelService from "../models/service.js";

export default {
  create(name) {
    const id = crypto.randomUUID();

    try {
      const createdProject = projectRepo.create({ id, name });
      createEmptyLogFile(id);
      logEvent(id, "project_created", { id, name });
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
      },
      models: {
        count: modelService.count(),
        averageSelectedWordsCount: modelService.getAverageSelectedWordsCount(),
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
    const documents = documentService.getByProjectId(projectId);
    const models = modelService.getByProjectId(projectId);
    return { documents, models };
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
    return projectRepo.findModelGenerationIndexById(projectId);
  },
  update(projectId, updates) {
    const project = projectRepo.update(projectId, updates);
    if (!project) {
      throw new Error("Project not found or no valid fields to update");
    }
    return project;
  },
};
