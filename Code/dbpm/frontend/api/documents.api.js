import { baseURL, handleResponse, handleTextResponse } from "./base.js";

export default {
  path: "documents",
  // Document
  async create(params) {
    const response = await fetch(`${baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return handleResponse(response);
  },
  async updateMeta(documentId, params) {
    const response = await fetch(`${baseURL}/${this.path}/${documentId}/meta`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  },
  async delete(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response, "Failed to delete document");
  },
  // Document Version
  async createVersion(params) {
    const response = await fetch(`${baseURL}/${this.path}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return handleResponse(response);
  },
  async getContentByVersionId(versionId) {
    const res = await fetch(
      `${baseURL}/${this.path}/versions/${versionId}/content`,
    );
    return handleTextResponse(res, "Failed to fetch document content");
  },
  async getTracesByVersionId(
    versionId,
    { includeDeletedModels = false } = {},
  ) {
    const params = new URLSearchParams();
    if (includeDeletedModels) {
      params.set("includeDeletedModels", "true");
    }
    const query = params.toString();
    const response = await fetch(
      `${baseURL}/documents/versions/${versionId}/traces${query ? `?${query}` : ""}`,
    );
    if (!response.ok) throw new Error("Failed to fetch document traces");
    return await response.json();
  },
};
