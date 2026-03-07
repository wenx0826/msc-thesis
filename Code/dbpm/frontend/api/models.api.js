import { baseURL, handleResponse, handleTextResponse } from "./base.js";
import { Constants } from "../constants.js";

const CREATE_MODEL_SIMULATED_NETWORK_DELAY_MS = 5 * 1000;
const GENERATE_MODEL_SIMULATED_NETWORK_DELAY_MS = 5 * 1000;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default {
  LLMDisabled: true,
  path: "models",

  async generateSampleModel() {
    const templatesFolder = "/modules/workflow/templates/";

    async function fetchTemplatesList() {
      try {
        const r = await fetch(`${templatesFolder}templates.json`);
        if (r.ok) {
          const arr = await r.json();
          return arr.map((f) => `${f.name}.xml`);
        }
      } catch (e) {
        console.error("Error fetching .templates.json:", e);
      }
    }

    try {
      // const list = await fetchTemplatesList();
      const list = [];
      if (!list || !list.length) {
        throw new Error("No templates found in templates.json");
      }
      const chosen = list[Math.floor(Math.random() * list.length)];
      const resp = await fetch(`${templatesFolder}${chosen}`);
      if (!resp.ok) {
        throw new Error(
          `Failed to fetch template ${chosen}, status ${resp.status}`,
        );
      }
      const testset = await resp.text();
      let data = new DOMParser().parseFromString(testset, "application/xml");
      data = $("description", data)[0].children[0];
      return new XMLSerializer().serializeToString(data);
    } catch (err) {
      console.error("generateSampleModel error:", err);
      const resp = await fetch("/Subprocess.xml");
      console.log("==========Fetched Subprocess.xml with status========", resp);
      // console.log(
      //   "==========Fetched Subprocess.xml with text========",
      //   await resp.text(),
      // );
      // if (!resp.ok) throw err;
      return '<description xmlns="http://cpee.org/ns/description/1.0"/>';
    }
  },

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
    if (GENERATE_MODEL_SIMULATED_NETWORK_DELAY_MS > 0) {
      await delay(GENERATE_MODEL_SIMULATED_NETWORK_DELAY_MS);
    }

    let generatedModel = null;
    try {
      if (this.LLMDisabled) {
        generatedModel = await this.generateSampleModel();
      } else {
        generatedModel = await this.generateModelLLM(params);
      }
    } catch (err) {
      console.log("Error generating model:", err);
      const rejectMessage =
        err?.message ??
        err?.responseText ??
        (typeof err === "string" ? err : JSON.stringify(err));
      console.log("Reject message:", rejectMessage);
    }
    return generatedModel;
  },

  async createModelAndTrace(params) {
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
    return handleResponse(response, "Failed to update model and trace");
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

  // Sub-API for accessing all records (including soft-deleted)
};
