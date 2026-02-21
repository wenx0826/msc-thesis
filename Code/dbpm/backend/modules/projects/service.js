import crypto from "crypto";
import projectRepo from "./repository.js";
import documentRepo from "../documents/repositories/document.js";
import { logEvent, createEmptyLogFile } from "../../utils/logger.js";
import documentService from "../documents/service.js";
import modelService from "../models/service.js";
export default {
  async create(name) {
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
  async getAll() {
    return projectRepo.findAll();
  },
  async get(projectId) {
    const project = projectRepo.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    return project;
  },
  async getDetails(projectId, includeDeleted = false) {
    const project = projectRepo.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    const documents = await documentService.getByProjectId(
      projectId,
      includeDeleted,
    );
    const models = await modelService.getByProjectId(projectId, includeDeleted);
    return { ...project, documents, models };
  },
  async getDocuments(projectId) {
    return documentService.getByProjectId(projectId);
  },
  async getModels(projectId) {
    return modelService.getByProjectId(projectId);
  },
  async getAllDocuments(projectId) {
    // Documents don't have soft delete yet, so this is the same as getDocuments
    // return documentRepo.findByProjectId(projectId);
  },
  async getAllModels(projectId) {
    return projectRepo.getAllModelsByProjectId(projectId);
  },
  async getModelGenerationIndexById(projectId) {
    return projectRepo.findModelGenerationIndexById(projectId);
  },
  async update(projectId, updates) {
    const project = projectRepo.update(projectId, updates);
    if (!project) {
      throw new Error("Project not found or no valid fields to update");
    }
    return project;
  },
};
