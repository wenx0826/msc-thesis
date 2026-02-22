import { baseURL, handleResponse } from "./base.js";

export default {
  path: "projects",
  async create(project) {
    const res = await fetch(`${baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    return handleResponse(res, "Failed to create project");
  },
  async list() {
    const res = await fetch(`${baseURL}/${this.path}`);
    return handleResponse(res, "Failed to fetch projects");
  },
  async overview() {
    const res = await fetch(`${baseURL}/${this.path}/overview`);
    return handleResponse(res, "Failed to fetch projects overview");
  },
  async get(projectId) {
    const res = await fetch(`${baseURL}/${this.path}/${projectId}`);
    return handleResponse(res, "Failed to fetch project");
  },
  async getComponents(projectId) {
    const res = await fetch(`${baseURL}/${this.path}/${projectId}/components`);
    return handleResponse(res);
  },
  async getComponentsStats(projectId) {
    const res = await fetch(
      `${baseURL}/${this.path}/${projectId}/components/stats`,
    );
    return handleResponse(res);
  },
  async update(projectId, updatedFields) {
    console.log("Updating project:", projectId, updatedFields);
    const res = await fetch(`${baseURL}/${this.path}/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedFields),
    });
    return handleResponse(res, "Failed to update project");
  },
};
