import { baseURL, handleResponse } from "./base.js";

export const documentsAPI = {
  path: "documents",

  async getByProjectId(projectId) {
    const response = await fetch(
      `${baseURL}/projects/${projectId}/${this.path}`,
    );
    if (!response.ok) throw new Error("Failed to fetch documents");
    return await response.json();
  },

  async getAllByProjectId(projectId) {
    const response = await fetch(
      `${baseURL}/projects/${projectId}/documents/all`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  },

  async getDocumentContentById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}/content`);
    if (!response.ok) throw new Error("Failed to fetch document");
    const data = await response.json();
    return data.content;
  },

  async getDocumentTracesById(id) {
    const response = await fetch(`${baseURL}/documents/${id}/traces`);
    if (!response.ok) throw new Error("Failed to fetch document traces");
    return await response.json();
  },

  async getDocumentModelsById(id) {
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

  async createDocument(doc) {
    const response = await fetch(`${baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
    return handleResponse(response, "Failed to create document");
  },

  async deleteDocumentById(id) {
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
