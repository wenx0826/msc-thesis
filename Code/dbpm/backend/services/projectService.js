import crypto from "crypto";
import projectRepo from "../repositories/projectRepository.js";
import documentRepo from "../repositories/documentRepository.js";
import { logEvent, createEmptyLogFile } from "../utils/logger.js";

class ProjectService {
  async createProject(name) {
    const projectId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    try {
      // Create project record
      projectRepo.create({ projectId, name, createdAt });

      // Create log file
      createEmptyLogFile(projectId);

      // Log the event
      logEvent(projectId, "project_created", { id: projectId, name });

      return { id: projectId };
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

  async getAllDocuments(projectId) {
    // Documents don't have soft delete yet, so this is the same as getDocuments
    return documentRepo.findByProjectId(projectId);
  }

  async getAllModels(projectId) {
    return projectRepo.getAllModelsByProjectId(projectId);
  }

  async getDocumentCount(projectId) {
    const result = projectRepo.getDocumentCount(projectId);
    return result.count.toString();
  }

  async getModelCount(projectId) {
    const result = projectRepo.getModelCount(projectId);
    return { count: result.count };
  }

  async getTotalModelCount(projectId) {
    const result = projectRepo.getTotalModelCount(projectId);
    return { count: result.count };
  }

  async updateProject(projectId, updates) {
    const project = projectRepo.update(projectId, updates);
    if (!project) {
      throw new Error("Project not found or no valid fields to update");
    }
    return project;
  }
}

export default new ProjectService();
