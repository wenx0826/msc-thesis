const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { get } = require("http");
const app = express();
const PORT = 3000;

const projectsFile = path.join(__dirname, "..", "data", "projects.json");
const tracesFile = path.join(__dirname, "..", "data", "traces.json");
const documentsMetaFile = path.join(
  __dirname,
  "..",
  "data",
  "documents_meta.json",
);
const documentsPath = path.join(__dirname, "..", "data", "documents");
const modelsMetaFile = path.join(__dirname, "..", "data", "models_meta.json");
const modelsPath = path.join(__dirname, "..", "data", "models");

const getISODate = () => new Date().toISOString();
const createNewRecord = () => ({
  id: crypto.randomUUID(),
  createdAt: getISODate(),
});
app.use(express.json()); // Middleware to parse JSON bodies

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, "..", "frontend")));

// #region Project Endpoints
app.post("/projects", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Missing name" });
  }

  const project = {
    ...createNewRecord(),
    name,
    modelNumber: 0,
  };
  fs.readFile(projectsFile, "utf8", (err, data) => {
    let projects = [];
    if (!err) {
      try {
        projects = data.trim() ? JSON.parse(data) : [];
      } catch (e) {
        return res.status(500).json({ error: "Failed to parse projects file" });
      }
    }

    projects.push(project);
    fs.writeFile(projectsFile, JSON.stringify(projects, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to write projects file" });
      }
      res.json({
        message: "Project created",
        id: project.id,
      });
    });
  });
});
app.get("/projects", (req, res) => {
  console.log("Fetching project list...");
  fs.readFile(projectsFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.json([]); // File doesn't exist, return empty array
      }
      return res.status(500).json({ error: "Failed to read projects file" });
    }
    try {
      let projects = data.trim() ? JSON.parse(data) : [];
      projects = projects.map(({ documents, ...rest }) => rest);
      res.json(projects);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse projects file" });
    }
  });
});
app.get("/projects/:id", (req, res) => {
  const projectId = req.params.id;
  fs.readFile(projectsFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.status(500).json({ error: "Failed to read projects file" });
    }
    try {
      const projects = data.trim() ? JSON.parse(data) : [];
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse projects file" });
    }
  });
});
app.get("/projects/:projectId/documents", (req, res) => {
  const { projectId } = req.params;
  console.log("Fetching documents for project:", projectId);
  fs.readFile(documentsMetaFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.json([]);
      }
      return res.status(500).json({ error: "Failed to read documents file" });
    }
    try {
      const documents = data.trim() ? JSON.parse(data) : [];
      const filtered = documents.filter((doc) => doc.projectId === projectId);
      res.json(filtered);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse documents file" });
    }
  });
});
app.put("/projects/:id", (req, res) => {
  const projectId = req.params.id;
  const updates = req.body;

  fs.readFile(projectsFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.status(500).json({ error: "Failed to read projects file" });
    }
    try {
      let projects = data.trim() ? JSON.parse(data) : [];
      const projectIndex = projects.findIndex((p) => p.id === projectId);
      if (projectIndex === -1) {
        return res.status(404).json({ error: "Project not found" });
      }
      const project = projects[projectIndex];
      projects[projectIndex] = { ...project, ...updates };
      fs.writeFile(projectsFile, JSON.stringify(projects, null, 2), (err) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Failed to write projects file" });
        }
        res.json(projects[projectIndex]);
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to parse projects file" });
    }
  });
});
// #endregion

// #region Document Endpoints
app.post("/documents", (req, res) => {
  const { name, content, projectId } = req.body;
  if (!name || !content || !projectId) {
    return res
      .status(400)
      .json({ error: "Missing name, content, or projectId" });
  }
  const id = crypto.randomUUID();
  const uploadedAt = new Date().toISOString();
  const documentMeta = { id, name, uploadedAt, projectId };
  // Read current documents
  fs.readFile(documentsMetaFile, "utf8", (err, data) => {
    let documents = [];
    if (!err) {
      try {
        documents = data.trim() ? JSON.parse(data) : [];
      } catch (e) {
        return res
          .status(500)
          .json({ error: "Failed to parse documents file" });
      }
    }
    documents.push(documentMeta);
    // Write metadata
    fs.writeFile(
      documentsMetaFile,
      JSON.stringify(documents, null, 2),
      (err) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Failed to write documents file" });
        }
        // Write content
        const contentFile = path.join(documentsPath, `${id}.html`);
        fs.writeFile(contentFile, content, (err) => {
          if (err) {
            // Rollback metadata? For simplicity, not for now
            return res
              .status(500)
              .json({ error: "Failed to write document content" });
          }
          res.json(documentMeta);
        });
      },
    );
  });
});
app.get("/documents", (req, res) => {
  console.log("Fetching documents list...");
  fs.readFile(documentsMetaFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.json([]);
      }
      return res.status(500).json({ error: "Failed to read documents file" });
    }
    try {
      const documents = data.trim() ? JSON.parse(data) : [];
      res.json(documents);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse documents file" });
    }
  });
});

app.get("/documents/:id/content", (req, res) => {
  const docId = req.params.id;
  console.log("Fetching document content for ID:", docId);
  const contentFile = path.join(documentsPath, `${docId}.html`);
  fs.readFile(contentFile, "utf8", (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "Document not found" });
      }
      return res.status(500).json({ error: "Failed to read document content" });
    }
    res.json({ content });
  });
});

app.get("/documents/:id/traces", (req, res) => {
  const { id } = req.params;
  console.log("Fetching traces for document ID:", id);
  fs.readFile(tracesFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.json([]);
      }
      return res.status(500).json({ error: "Failed to read traces file" });
    }
    try {
      const traces = data.trim() ? JSON.parse(data) : [];
      const filtered = traces.filter((trace) => trace.documentId === id);
      res.json(filtered);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse traces file" });
    }
  });
});
app.get("/documents/:id/models", (req, res) => {
  const docId = req.params.id;
  const models = [];
  fs.readFile(tracesFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.json([]);
      }
      return res.status(500).json({ error: "Failed to read traces file" });
    }
    try {
      const traces = data.trim() ? JSON.parse(data) : [];
      const docTraces = traces.filter((trace) => trace.documentId === docId);
      for (const trace of docTraces) {
        const modelsMeta = fs.readFileSync(modelsMetaFile, "utf8");
        const modelsList = modelsMeta.trim() ? JSON.parse(modelsMeta) : [];
        const model = modelsList.find((m) => m.id === trace.modelId);
        if (model) {
          models.push(model);
        }
      }
      res.json(models);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse traces file" });
    }
  });
});

app.delete("/documents/:id", (req, res) => {
  const docId = req.params.id;
  fs.readFile(documentsMetaFile, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read documents file" });
    }
    try {
      let documents = data.trim() ? JSON.parse(data) : [];
      const index = documents.findIndex((d) => d.id === docId);
      if (index === -1) {
        return res.status(404).json({ error: "Document not found" });
      }
      documents.splice(index, 1);
      fs.writeFile(
        documentsMetaFile,
        JSON.stringify(documents, null, 2),
        (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: "Failed to update documents file" });
          }
          // Delete content file
          const contentFile = path.join(documentsPath, `${docId}.txt`);
          fs.unlink(contentFile, (err) => {
            // Ignore error if file doesn't exist
            res.json({ message: "Document deleted" });
          });
        },
      );
    } catch (e) {
      res.status(500).json({ error: "Failed to parse documents file" });
    }
  });
  // Delete content file
  const contentFile = path.join(documentsPath, `${docId}.html`);
  fs.unlink(contentFile, (err) => {
    // Ignore error if file doesn't exist
    res.json({ message: "Document deleted" });
  });
});
// #endregion

// #region Model Endpoints

app.post("/models", (req, res) => {
  const model = req.body;
  const { data: modelData, ...modelMeta } = model;
  const id = crypto.randomUUID();
  // const timestamp = new Date().toISOString();
  modelMeta.id = id;
  modelMeta.createdAt = getISODate();

  fs.readFile(modelsMetaFile, "utf8", (err, data) => {
    let modelsMeta = [];
    if (!err) {
      try {
        modelsMeta = data.trim() ? JSON.parse(data) : [];
      } catch (e) {
        return res.status(500).json({ error: "Failed to parse models file" });
      }
    }
    modelsMeta.push(modelMeta);
    // Write metadata
    fs.writeFile(modelsMetaFile, JSON.stringify(modelsMeta, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to write models file" });
      }
      // Write content
      const modelDataFile = path.join(modelsPath, `${id}.xml`);
      fs.writeFile(modelDataFile, modelData, (err) => {
        if (err) {
          // Rollback metadata? For simplicity, not for now
          return res
            .status(500)
            .json({ error: "Failed to write model content" });
        }
        res.json(modelMeta);
      });
    });
  });
});
app.get("/models/:id", (req, res) => {
  const modelId = req.params.id;
  console.log("Fetching model content for ID:", modelId);
  fs.readFile(modelsMetaFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "Model not found" });
      }
      return res.status(500).json({ error: "Failed to read models file" });
    }
    try {
      const models = data.trim() ? JSON.parse(data) : [];
      const model = models.find((m) => m.id === modelId);
      if (!model) {
        return res.status(404).json({ error: "Model not found" });
      }
      const modelFile = path.join(modelsPath, `${modelId}.xml`);
      fs.readFile(modelFile, "utf8", (err, data) => {
        if (err) {
          if (err.code === "ENOENT") {
            return res.status(404).json({ error: "Model not found" });
          }
          return res
            .status(500)
            .json({ error: "Failed to read model content" });
        }
        model.data = data;
        res.json(model);
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to parse models file" });
    }
  });
});

app.get("/models/:id/data", (req, res) => {
  const modelId = req.params.id;
  console.log("Fetching model content for ID:", modelId);
  const modelFile = path.join(modelsPath, `${modelId}.xml`);
  fs.readFile(modelFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "Model not found" });
      }
      return res.status(500).json({ error: "Failed to read model content" });
    }
    res.json(data);
  });
});
app.put(
  "/models/:id/data",
  express.raw({ type: "application/xml" }),
  (req, res) => {
    const modelId = req.params.id;
    const modelData = req.body.toString(); // Convert Buffer to string
    console.log("Updating model content for ID:", modelId);

    const modelFile = path.join(modelsPath, `${modelId}.xml`);
    fs.writeFile(modelFile, modelData, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Failed to update model content" });
      }
      res.json({ message: "Model content updated" });
    });
  },
);
// #endregion

//#region Trace Endpoints
app.post("/traces", (req, res) => {
  const trace = req.body;

  const id = crypto.randomUUID();
  trace.id = id;
  fs.readFile(tracesFile, "utf8", (err, data) => {
    let traces = [];
    if (!err) {
      try {
        traces = data.trim() ? JSON.parse(data) : [];
      } catch (e) {
        return res.status(500).json({ error: "Failed to parse traces file" });
      }
    }
    traces.push(trace);
    fs.writeFile(tracesFile, JSON.stringify(traces, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to write traces file" });
      }
      res.json(trace);
    });
  });
});
//#endregion
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
