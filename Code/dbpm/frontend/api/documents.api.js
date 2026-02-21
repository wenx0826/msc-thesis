import { baseURL, handleResponse, handleTextResponse } from "./base.js";

export default {
  path: "documents",
  async create(params) {
    const response = await fetch(`${baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return handleResponse(response);
  },
  async getByProjectId(projectId) {
    const response = await fetch(
      `${baseURL}/projects/${projectId}/${this.path}`,
    );
    if (!response.ok) throw new Error("Failed to fetch documents");
    return handleResponse(response);
  },
  async getAllByProjectId(projectId) {
    const response = await fetch(
      `${baseURL}/projects/${projectId}/documents/all`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return handleResponse(response);
  },
  async getById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}`);
    if (!response.ok) throw new Error("Failed to fetch document");
    const data = await response.json();
    return data.content;
  },
  async getContentById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}/content`);
    if (!response.ok) throw new Error("Failed to fetch document");
    const data = await response.json();
    return handleTextResponse(response, "Failed to fetch document content");
  },
  async getDocumentTracesById(id) {
    const response = await fetch(`${baseURL}/documents/${id}/traces`);
    if (!response.ok) throw new Error("Failed to fetch document traces");
    return await response.json();
  },
  async getActiveModelsById(id) {
    const response = await fetch(`${baseURL}/documents/${id}/models`);
    if (!response.ok) throw new Error("Failed to fetch document models");
    return await response.json();
  },
  async getAllModelsByDocumentId(id) {
    const response = await fetch(`${baseURL}/documents/${id}/models/all`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  },

  async deleteById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response, "Failed to delete document");
  },

  // Sub-API for accessing all records (including soft-deleted)
  all: {
    async getAll() {
      const response = await fetch(`${baseURL}/documents/all`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },

    async getByProjectId(projectId) {
      const response = await fetch(
        `${baseURL}/projects/${projectId}/documents/all`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  },
};
