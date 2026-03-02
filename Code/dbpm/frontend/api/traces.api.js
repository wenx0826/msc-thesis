import { baseURL, handleResponse } from "./base.js";

export default {
  path: "traces",

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
