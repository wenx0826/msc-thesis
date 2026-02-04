import { baseURL, handleResponse } from "./base.js";

export const modelsAPI = {
  LLMDisabled: true,
  path: "models",

  async generateSampleModel() {
    const templatesFolder = "templates/";

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
      const list = await fetchTemplatesList();
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
      const resp = await fetch("./sample_model_with_subprocess.xml");
      if (!resp.ok) throw err;
      return await resp.text();
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

  async createModelAndTrace({ model, trace }) {
    const response = await fetch(`${baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, model, trace }),
    });
    return handleResponse(response, "Failed to create model");
  },

  async getModelById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}`);
    return handleResponse(response, "Failed to fetch model");
  },

  async getModelDataById(id) {
    const response = await fetch(`${baseURL}/${this.path}/${id}/data`);
    return handleResponse(response, "Failed to fetch model");
  },

  async updateModelDataById(id, modelData) {
    const response = await fetch(`${baseURL}/${this.path}/${id}/data`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, modelData }),
    });
    return handleResponse(response, "Failed to update model data");
  },

  async updateModel(modelId, params) {
    const response = await fetch(`${baseURL}/${this.path}/${modelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...params }),
    });
    return handleResponse(response, "Failed to update model and trace");
  },

  async deleteModelById(id) {
    // TODO: implement
  },

  // Sub-API for accessing all records (including soft-deleted)
  all: {
    async getAll() {
      const response = await fetch(`${baseURL}/models/all`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  },
};
