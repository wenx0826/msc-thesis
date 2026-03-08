import { baseURL, handleResponse } from "./base.js";

export default {
  path: "traces",

  async getLatestTracesByDocumentVersionId(versionId, options = {}) {
    const { includeDeletedModels = false } = options;
    const encodedVersionId = encodeURIComponent(versionId);
    const params = new URLSearchParams();
    if (includeDeletedModels) {
      params.set("includeDeletedModels", "true");
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(
      `${baseURL}/${this.path}/document-versions/${encodedVersionId}${suffix}`,
    );
    return handleResponse(
      response,
      "Failed to fetch latest traces by document version",
    );
  },

  async getLatestTraceByModelVersionId(modelVersionId) {
    const response = await fetch(
      `${baseURL}/${this.path}/model-versions/${modelVersionId}/latest`,
    );
    return handleResponse(
      response,
      "Failed to fetch latest trace by model version",
    );
  },

  async getTracesByDocumentId(docId) {
    const response = await fetch(`${baseURL}/documents/${docId}/${this.path}`);
    if (!response.ok) throw new Error("Failed to fetch traces");
    return await response.json();
  },

  async createTrace(trace) {
    const response = await fetch(`${baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trace),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create trace");
    }
    return await response.json();
  },

  async updateTrace(updatedTrace) {
    const { id, ...updates } = updatedTrace || {};
    if (!id) {
      throw new Error("Missing trace id for update");
    }
    console.log("[DBPM] updateTrace request", {
      traceId: id,
      selectionCount: Array.isArray(updates?.selections)
        ? updates.selections.length
        : null,
    });
    const response = await fetch(`${baseURL}/${this.path}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return handleResponse(response, "Failed to update trace");
  },
};
