import { baseURL, handleResponse } from "./base.js";

export default {
  path: "projects",
  async create(project) {
    const response = await fetch(`${baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    return handleResponse(response, "Failed to create project");
  },
  async list() {
    const response = await fetch(`${baseURL}/${this.path}`);
    if (!response.ok) throw new Error("Failed to fetch projects");
    return await response.json();
  },
  async get(projectId) {
    const response = await fetch(`${baseURL}/${this.path}/${projectId}`);
    return handleResponse(response, "Failed to fetch project");
  },
  async getDetails(projectId, includeDeleted = false) {
    const response = await fetch(
      `${baseURL}/${this.path}/${projectId}/details?includeDeleted=${includeDeleted}`,
    );
    return handleResponse(response);
  },
  async update(projectId, updatedFields) {
    console.log("Updating project:", projectId, updatedFields);
    const response = await fetch(`${baseURL}/${this.path}/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedFields),
    });
    return handleResponse(response, "Failed to update project");
  },
};
