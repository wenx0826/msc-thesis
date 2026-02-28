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
    const response = await fetch(`${baseURL}/${this.path}/${updatedTrace.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedTrace),
    });
    return handleResponse(response, "Failed to update trace");
  },
};
