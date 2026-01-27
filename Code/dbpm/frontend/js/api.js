window.API = {
  baseURL: "http://localhost:3000",
};
API.project = {
  path: "projects",
  async createProject(project) {
    const response = await fetch(`${API.baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to create project");
    }
    return await response.json();
  },
  async getProjectList() {
    const response = await fetch(`${API.baseURL}/${this.path}`);
    if (!response.ok) throw new Error("Failed to fetch projects");
    return await response.json();
  },
  async getProjectById(id) {
    // TODO: implement GET /project/:id if needed
    const response = await fetch(`${API.baseURL}/${this.path}/${id}`);
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to fetch project");
    }
    return await response.json();
  },
  async updateProjectById(id, updatedFields) {
    console.log("!!!!!!!!!Updating project!!!!!!!!!!!!:", id, updatedFields);
    const response = await fetch(`${API.baseURL}/${this.path}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedFields),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to update project");
    }
    return await response.json();
  },
  async deleteProjectById(id) {
    const response = await fetch(`${API.baseURL}/${this.path}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to delete project");
    }
    return await response.json();
  },

  async getModelCount(projectId) {
    const response = await fetch(
      `${API.baseURL}/projects/${projectId}/models/count`,
    );
    if (!response.ok) throw new Error("Failed to fetch models");
    return await response.json();
  },
  async getDocumentCount(projectId) {
    const response = await fetch(
      `${API.baseURL}/projects/${projectId}/documents/count`,
    );
    if (!response.ok) throw new Error("Failed to fetch document count");
    const text = await response.text();
    // const count = parseInt(text, 10);
    // if (isNaN(count)) {
    //   throw new Error("Invalid document count received");
    // }
    return text;
  },
};
API.document = {
  path: "documents", // relative URLs since frontend is served from same server
  async getDocumentsByProjectId(projectId) {
    const response = await fetch(
      `${API.baseURL}/projects/${projectId}/${this.path}`,
    );
    if (!response.ok) throw new Error("Failed to fetch documents");
    return await response.json();
  },

  async getDocumentContentById(id) {
    const response = await fetch(`${API.baseURL}/${this.path}/${id}/content`);
    if (!response.ok) throw new Error("Failed to fetch document");
    const data = await response.json();
    return data.content;
  },
  async getDocumentTracesById(id) {
    const response = await fetch(`${API.baseURL}/documents/${id}/traces`);
    if (!response.ok) throw new Error("Failed to fetch document traces");
    return await response.json();
  },
  async getDocumentModelsById(id) {
    const response = await fetch(`${API.baseURL}/documents/${id}/models`);
    if (!response.ok) throw new Error("Failed to fetch document models");
    return await response.json();
  },
  async createDocument(doc) {
    const response = await fetch(`${API.baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to create document");
    }
    return await response.json();
  },
  async deleteDocumentById(id) {
    const response = await fetch(`${API.baseURL}/${this.path}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to delete document");
    }
    return await response.json();
  },
};

API.trace = {
  path: "traces", // relative URLs since frontend is served from same server
  async getTracesByDocumentId(docId) {
    return await fetch(`${API.baseURL}/documents/${docId}/${this.path}`).then(
      (res) => {
        if (!res.ok) throw new Error("Failed to fetch traces");
        return res.json();
      },
    );
  },
  async createTrace(trace) {
    return await fetch(`${API.baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trace),
    }).then((res) => {
      if (!res.ok) {
        return res.json().then((error) => {
          throw new Error(error.error || "Failed to create trace");
        });
      }
      return res.json();
    });
  },
  async deleteTraceById(id) {
    const response = await fetch(`${API.baseURL}/${this.path}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to delete trace");
    }
    return await response.json();
  },
};

API.model = {
  LLMDisabled: true,
  path: "models", // relative URLs since frontend is served from same server
  async getModelById(id) {
    return await getModelById(API.db, id);
  },
  async generateSampleModel() {
    // choose a random XML from the "templates" folder and return its text
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
      // const list = [];
      if (!list || !list.length) {
        throw new Error("No templates found in templates.json");
      }
      const chosen = list[Math.floor(Math.random() * list.length)];
      const resp = await fetch(`${templatesFolder}${chosen}`);
      // console.log("Fetched template:", chosen);
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
      // final fallback
      const resp = await fetch("./why.xml");
      // const resp = await fetch('sample_model.xml');
      if (!resp.ok) throw err;
      return await resp.text();
    }
  },

  async generateModelLLM({ rpstXml, userInput, llm }) {
    const fd = new FormData();
    fd.append(
      "rpst_xml",
      new Blob([rpstXml], {
        type: "text/xml",
      }),
    );
    fd.append("user_input", new Blob([userInput], { type: "text/plain" }));
    fd.append("llm", new Blob([llm], { type: "text/plain" }));

    const response = new Promise((resolve, reject) => {
      $.ajax({
        url: "https://autobpmn.ai/llm/",
        data: fd,
        cache: false,
        contentType: false,
        processData: false,
        method: "POST",
        success: function (data) {
          // console.log("LLM generation request sent successfully", data);
          resolve(data.output_cpee);
        },
        error: function (xhr, status, data) {
          // console.log("Error in LLM generation request:", xhr, status, data);
          reject(new Error(xhr.responseJSON?.error || "Request failed"));
        },
      });
    });
    return response;
  },

  async generateModel(params) {
    let generatedModel = null;
    try {
      if (this.LLMDisabled) {
        generatedModel = await this.generateSampleModel();
      } else {
        let res = await this.generateModelLLM(params);
        // if (res) {
        //   res = res.replace('<?xml version="1.0"?>\n', "");
        //   generatedModel = "<description>" + res + "</description>";
        // }
      }
    } catch (err) {
      console.log("001 Error generating model:", err);
      const rejectMessage =
        err?.message ??
        err?.responseText ??
        (typeof err === "string" ? err : JSON.stringify(err));
      console.log("002 Reject message:", rejectMessage);

      // $generateButton.prop('disabled', false);
    }
    // console.log("003 Next step -  Generated Model :", generatedModel);
    activeModel = {
      data: generatedModel,
    };
    return generatedModel;
    // Store.setActiveModel(activeModel);
    // $generateButton.prop("disabled", false);
    // $("#generatedModelActionBar").css("visibility", "visible");
  },
  async createModelAndTrace({ model, trace }) {
    const response = await fetch(`${API.baseURL}/${this.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, model, trace }),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to create model");
    }
    return await response.json();
  },
  async getModelById(id) {
    const response = await fetch(`${API.baseURL}/${this.path}/${id}`);
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to fetch model");
    }
    return await response.json();
  },
  async getModelDataById(id) {
    const response = await fetch(`${API.baseURL}/${this.path}/${id}/data`);
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to fetch model");
    }
    return await response.json();
  },
  async updateModelDataById(id, modelData) {
    const response = await fetch(`${API.baseURL}/${this.path}/${id}/data`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, modelData }),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to update model data");
    }
    return await response.json();
  },
  async updateModel({ modelId, modelData, trace }) {
    const response = await fetch(`${API.baseURL}/${this.path}/${modelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, modelData, trace }),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to update model and trace");
    }
    return await response.json();
  },
  async deleteModelById(id) {},
};
