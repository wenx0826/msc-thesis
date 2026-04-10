import { baseURL, handleResponse, handleTextResponse } from "./base.js";
import { Constants } from "../constants.js";

const CREATE_MODEL_SIMULATED_NETWORK_DELAY_MS = 1 * 1000;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const EMPTY_MODEL_XML =
  '<description xmlns="http://cpee.org/ns/description/1.0"/>';
const DBPM_NS = "https://example.com/dbpm";

function stripXmlDeclaration(xml) {
  return (xml || "").replace(/^<\?xml[^?]*\?>\s*/i, "");
}

function wrapGeneratedXml(innerXml) {
  return `<description xmlns:dbpm="${DBPM_NS}">${stripXmlDeclaration(innerXml)}</description>`;
}

export default {
  LLMDisabled: true,
  path: "models",

  async generateModelLLM({ rpstXml, userInput, llm }) {
    const fd = new FormData();
    fd.append("rpst_xml", new Blob([rpstXml], { type: "text/xml" }));
    fd.append("user_input", new Blob([userInput], { type: "text/plain" }));
    fd.append("llm", new Blob([llm], { type: "text/plain" }));

    return new Promise((resolve, reject) => {
      $.ajax({
        url: "https://autobpmn.ai/llm/",
        data: fd,
        cache: false,
        contentType: false,
        processData: false,
        method: "POST",
        success: function (data) {
          resolve(data.output_cpee);
        },
        error: function (xhr, status, data) {
          reject(new Error(xhr.responseJSON?.error || "Request failed"));
        },
      });
    });
  },

  async generateModel(params) {
    if (this.LLMDisabled) {
      return wrapGeneratedXml(EMPTY_MODEL_XML);
    }
    try {
      return wrapGeneratedXml(await this.generateModelLLM(params));
    } catch (err) {
      console.warn("Error generating model:", err?.message ?? err);
      return wrapGeneratedXml(EMPTY_MODEL_XML);
    }
  },

  async createModelAndLink(params) {
    if (CREATE_MODEL_SIMULATED_NETWORK_DELAY_MS > 0) {
      await delay(CREATE_MODEL_SIMULATED_NETWORK_DELAY_MS);
    }

    const response = await fetch(`${baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return handleResponse(response, "Failed to create model");
  },
  async createVersion(params) {
    const response = await fetch(`${baseURL}/${this.path}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return handleResponse(response, "Failed to create model version");
  },
  async getModelById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}`);
    return handleResponse(response, "Failed to fetch model");
  },
  async updateMeta(modelId, params) {
    const response = await fetch(`${baseURL}/${this.path}/${modelId}/meta`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  },
  async getDataByVersionId(versionId) {
    const response = await fetch(
      `${baseURL}/${this.path}/versions/${versionId}/data`,
    );
    return handleTextResponse(response, "Failed to fetch model");
  },

  async updateVersion(versionId, params) {
    const response = await fetch(
      `${baseURL}/${this.path}/versions/${versionId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      },
    );
    return handleResponse(response, "Failed to update model and link");
  },

  async updateSubprocessLink(versionId, taskId, subprocessModelId) {
    const encodedTaskId = encodeURIComponent(taskId);
    const response = await fetch(
      `${baseURL}/${this.path}/versions/${versionId}/subprocesses/${encodedTaskId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subprocessModelId }),
      },
    );
    return handleResponse(response, "Failed to update subprocess link");
  },

  async deleteModelById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response, "Failed to delete model");
  },
  async restoreModelById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}/restore`, {
      method: "PUT",
    });
    return handleResponse(response, "Failed to restore model");
  },

  async recordGenerationAttempt(data) {
    try {
      const response = await fetch(
        `${baseURL}/${this.path}/generation-attempts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      return handleResponse(response, "Failed to record generation attempt");
    } catch (err) {
      console.warn("recordGenerationAttempt failed:", err);
      return null;
    }
  },

  // Sub-API for accessing all records (including soft-deleted)
};
