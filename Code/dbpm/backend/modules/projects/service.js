import crypto from "crypto";
import projectRepo from "./repository.js";
import documentRepo from "../documents/repositories/document.js";
import { logEvent, createEmptyLogFile } from "../../utils/logger.js";
import documentService from "../documents/service.js";
class ProjectService {
  async createProject(name) {
    const id = crypto.randomUUID();

    try {
      const createdProject = projectRepo.create({ id, name });
      createEmptyLogFile(id);
      logEvent(id, "project_created", { id, name });
      return createdProject;
    } catch (err) {
      throw err;
    }
  }

  async getProjects() {
    return projectRepo.findAll();
  }

  async getProject(projectId) {
    const project = projectRepo.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    return project;
  }

  async getDocuments(projectId) {
    return documentRepo.findByProjectId(projectId);
  }

  async getModels(projectId) {
    return projectRepo.getModelsByProjectId(projectId);
  }

  async getAllDocuments(projectId) {
    // Documents don't have soft delete yet, so this is the same as getDocuments
    return documentRepo.findByProjectId(projectId);
  }

  async getAllModels(projectId) {
    return projectRepo.getAllModelsByProjectId(projectId);
  }

  async getModelGenerationCounter(projectId) {
    return projectRepo.getModelGenerationCounter(projectId);
  }
  async update(projectId, updates) {
    const project = projectRepo.update(projectId, updates);
    if (!project) {
      throw new Error("Project not found or no valid fields to update");
    }
    return project;
  }
}

export default new ProjectService();
