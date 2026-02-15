import { baseURL, handleResponse } from "./base.js";

export const projectsAPI = {
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

  async get(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}`);
    return handleResponse(response, "Failed to fetch project");
  },

  async update(id, updatedFields) {
    console.log("Updating project:", id, updatedFields);
    const response = await fetch(`${baseURL}/${this.path}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedFields),
    });
    return handleResponse(response, "Failed to update project");
  },

  async delete(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response, "Failed to delete project");
  },
};
