import { baseURL, handleResponse } from "./base.js";

export default {
  path: "logs",

  async createLogEntry(entry) {
    const response = await fetch(`${baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...entry }),
    });
    return handleResponse(response, "Failed to create log entry");
  },
};
