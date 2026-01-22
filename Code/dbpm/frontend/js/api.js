window.API = {
  db: null,
  async init() {
    await this.connectDB();
  },
  async connectDB() {
    return new Promise((resolve, reject) => {
      const dbReq = indexedDB.open("MyDB", 1);
      dbReq.onupgradeneeded = function (event) {
        const db = event.target.result;
        // db.deleteObjectStore("models");
        // db.deleteObjectStore("documents");
        // db.deleteObjectStore("traces");
        if (!db.objectStoreNames.contains("documents")) {
          db.createObjectStore("documents", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains("models")) {
          db.createObjectStore("models", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains("traces")) {
          const traceStore = db.createObjectStore("traces", {
            keyPath: "id",
            autoIncrement: true,
          });
          traceStore.createIndex("document_id", "document_id", {
            unique: false,
          });
          traceStore.createIndex("model_id", "model_id", { unique: false });
        }
      };

      dbReq.onsuccess = (event) => {
        API.db = event.target.result;
        resolve();
      };
      dbReq.onerror = (event) => {
        console.error("Database error:", event.target.errorCode);
        reject();
      };
    });
  },
};
API.project = {
  baseURL: "http://localhost:3000", // relative URLs since frontend is served from same server
  async getProjectList() {
    const response = await fetch(`${this.baseURL}/projects`);
    if (!response.ok) throw new Error("Failed to fetch projects");
    return await response.json();
  },
  async createProject(name) {
    const response = await fetch(`${this.baseURL}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to create project");
    }
    return await response.json();
  },

  async getProjectById(id) {
    // TODO: implement GET /project/:id if needed
    const response = await fetch(`${this.baseURL}/projects/${id}`);
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to fetch project");
    }
    return await response.json();
  },
};
API.Document = {
  async getDocumentList() {
    return await getDocumentList(API.db);
  },
  async getDocumentContentById(id) {
    return await getDocumentContentById(API.db, id);
  },
  async createDocument(doc) {
    return await createDocument(API.db, doc);
  },
  async deleteDocumentById(id) {
    return await deleteDocumentById(API.db, id);
  },
};

API.Trace = {
  async getTracesByDocumentId(docId) {
    return await getTracesByDocumentId(API.db, docId);
  },
  async createTrace(trace) {
    return await createTrace(API.db, trace);
  },
  async deleteTraceById(id) {
    return await deleteTraceById(API.db, id);
  },
};

API.Model = {
  LLMDisabled: false,
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
      return await resp.text();
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
        if (res) {
          res = res.replace('<?xml version="1.0"?>\n', "");
          generatedModel = "<description>" + res + "</description>";
        }
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
  async getModelById(id) {
    return await getModelById(API.db, id);
  },
  async createModel(model) {
    return await createModel(API.db, model);
  },
  async updateModelById(id, updatedFields) {
    return await updateModelById(API.db, id, updatedFields);
  },
  async deleteModelById(id) {
    return await deleteModelById(API.db, id);
  },
};
