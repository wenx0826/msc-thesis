import { baseURL, handleResponse } from "./base.js";

export const projectsAPI = {
  path: "projects",

  async createProject(project) {
    const response = await fetch(`${baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    return handleResponse(response, "Failed to create project");
  },

  async getProjectList() {
    const response = await fetch(`${baseURL}/${this.path}`);
    if (!response.ok) throw new Error("Failed to fetch projects");
    return await response.json();
  },

  async getProjectById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}`);
    return handleResponse(response, "Failed to fetch project");
  },

  async updateProjectById(id, updatedFields) {
    console.log("Updating project:", id, updatedFields);
    const response = await fetch(`${baseURL}/${this.path}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedFields),
    });
    return handleResponse(response, "Failed to update project");
  },

  async deleteProjectById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response, "Failed to delete project");
  },

  async getModelCount(projectId) {
    const response = await fetch(
      `${baseURL}/projects/${projectId}/models/count`,
    );
    if (!response.ok) throw new Error("Failed to fetch model count");
    const data = await response.json();
    return data.count;
  },

  async getTotalModelCount(projectId) {
    const response = await fetch(
      `${baseURL}/projects/${projectId}/models/count/total`,
    );
    if (!response.ok) throw new Error("Failed to fetch total model count");
    const data = await response.json();
    return data.count;
  },

  async getDocumentCount(projectId) {
    const response = await fetch(
      `${baseURL}/projects/${projectId}/documents/count`,
    );
    if (!response.ok) throw new Error("Failed to fetch document count");
    return await response.text();
  },

  // Sub-API for accessing all records (including soft-deleted)
  all: {
    async getModelsByProjectId(projectId) {
      const response = await fetch(
        `${baseURL}/projects/${projectId}/models/all`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  },
};
