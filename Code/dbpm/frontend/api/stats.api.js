import { baseURL, handleResponse } from "./base.js";

export const statsAPI = {
  path: "stats",

  async getStats(projectId = null) {
    const url = projectId
      ? `${baseURL}/${this.path}?projectId=${projectId}`
      : `${baseURL}/${this.path}`;
    const response = await fetch(url);
    return handleResponse(response, "Failed to fetch stats");
  },
};
