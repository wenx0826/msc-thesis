const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { log } = require("console");
const { version } = require("os");
const yaml = require("js-yaml");

const app = express();
const PORT = 3000;

const statsFile = path.join(__dirname, "..", "data", "stats.json");
const logsPath = path.join(__dirname, "..", "data", "logs");
const projectsFile = path.join(__dirname, "..", "data", "projects.json");

const tracesFile = path.join(__dirname, "..", "data", "traces.json");
const documentMetaFile = path.join(
  __dirname,
  "..",
  "data",
  "document-meta.json",
);
const documentsPath = path.join(__dirname, "..", "data", "documents");
const modelMetaByIdFile = path.join(
  __dirname,
  "..",
  "data",
  "model-meta.by-id.json",
);
const modelsPath = path.join(__dirname, "..", "data", "models");

const getISODate = () => new Date().toISOString();

const logEvent = (projectId, event, data = {}) => {
  const logEntry = {
    timestamp: getISODate(),
    event,
    // projectId,
    data,
  };

  const yamlEntry =
    "---\n" +
    yaml.dump(logEntry, {
      indent: 2,
      lineWidth: -1, // No line wrapping
      noRefs: true, // Avoid circular references
    });

  fs.appendFile(path.join(logsPath, `${projectId}.yaml`), yamlEntry, (err) => {
    if (err) console.error("Log write failed:", err);
  });
};
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

// Serve static files from data directory
app.use("/data", express.static(path.join(__dirname, "..", "data")));

// #region Project Endpoints
app.post("/projects", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Missing name" });
  }
  const projectId = crypto.randomUUID();

  const project = {
    id: projectId,
    createdAt: new Date().toISOString(),
    name,
    generatedModelNumber: 0,
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
        id: projectId,
      });

      fs.readFile(statsFile, "utf8", (err, data) => {
        let stats = {};
        if (!err) {
          try {
            stats = data.trim() ? JSON.parse(data) : {};
          } catch (e) {
            console.error("Failed to parse stats file");
          }
        }
        stats[projectId] = {
          documents: [],
          models: [],
        };
        fs.writeFile(statsFile, JSON.stringify(stats, null, 2), (err) => {
          if (err) {
            console.error("Failed to write stats file");
          }
        });
      });
      // Create empty log file for the project
      fs.writeFile(path.join(logsPath, `${projectId}.yaml`), "", (err) => {
        if (err) {
          console.error("Failed to create log file for project:", projectId);
        }
      });
      logEvent(projectId, "project_created", { id: projectId, name });
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
  fs.readFile(documentMetaFile, "utf8", (err, data) => {
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
app.get("/projects/:projectId/documents/count", (req, res) => {
  const { projectId } = req.params;
  console.log("Fetching documents for project:", projectId);
  fs.readFile(documentMetaFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.send("error");
      }
      return res.status(500).json({ error: "Failed to read documents file" });
    }
    try {
      const documents = data.trim() ? JSON.parse(data) : [];
      const filtered = documents.filter((doc) => doc.projectId === projectId);
      res.send(filtered.length);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse documents file" });
    }
  });
});
app.get("/projects/:projectId/models/count", (req, res) => {
  const { projectId } = req.params;
  console.log("Fetching documents for project:", projectId);
  fs.readFile(documentMetaFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.send("error");
      }
      return res.status(500).json({ error: "Failed to read documents file" });
    }
    try {
      const documents = data.trim() ? JSON.parse(data) : [];
      const filtered = documents.filter((doc) => doc.projectId === projectId);
      fs.readFile(tracesFile, "utf8", (err, modelData) => {
        if (err) {
          if (err.code === "ENOENT") {
            return res.send("error");
          }
          return res.status(500).json({ error: "Failed to read models file" });
        }
        try {
          const traces = modelData.trim() ? JSON.parse(modelData) : [];
          let modelIds = new Set();
          for (const doc of filtered) {
            const docTraces = traces.filter(
              (trace) => trace.documentId === doc.id,
            );
            for (const trace of docTraces) {
              modelIds.add(trace.modelId);
            }
          }
          res.send(modelIds.size.toString());
        } catch (e) {
          res.status(500).json({ error: "Failed to parse models file" });
        }
      });
      // res.send(filtered.length);
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
  fs.readFile(documentMetaFile, "utf8", (err, data) => {
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
      documentMetaFile,
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

        /// Log event
        const documentStats = {
          id,
          name,
          chars: content.length,
          words: content.split(/\s+/).filter(Boolean).length,
        };
        logEvent(projectId, "document_uploaded", documentStats);

        fs.readFile(statsFile, "utf8", (err, data) => {
          let stats = {};
          if (!err) {
            try {
              stats = data.trim() ? JSON.parse(data) : {};
            } catch (e) {
              console.error("Failed to parse stats file");
            }
          }
          if (!stats[projectId]) {
            stats[projectId] = { documents: [], models: [] };
          }
          stats[projectId].documents.push(documentStats);
          fs.writeFile(statsFile, JSON.stringify(stats, null, 2), (err) => {
            if (err) {
              console.error("Failed to write stats file");
            }
          });
        });
      },
    );
  });
});
app.get("/documents", (req, res) => {
  console.log("Fetching documents list...");
  fs.readFile(documentMetaFile, "utf8", (err, data) => {
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
        let modelMetaById = fs.readFileSync(modelMetaByIdFile, "utf8");
        modelMetaById = modelMetaById.trim() ? JSON.parse(modelMetaById) : {};
        const model = modelMetaById[trace.modelId];
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
  fs.readFile(documentMetaFile, "utf8", (err, data) => {
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
        documentMetaFile,
        JSON.stringify(documents, null, 2),
        (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: "Failed to update documents file" });
          }
          // Delete content file
          const contentFile = path.join(documentsPath, `${docId}.html`);
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
});
// #endregion

// #region Model Endpoints

app.post("/models", (req, res) => {
  const { projectId, model, trace } = req.body;
  const { data: modelData, meta } = model;
  const id = crypto.randomUUID();
  // const timestamp = new Date().toISOString();
  const modelMeta = { id, ...meta };
  trace.modelId = id;
  trace.id = crypto.randomUUID();
  const words = trace.selections.reduce(
    (acc, sel) => acc + sel.text.split(/\s+/).filter(Boolean).length,
    0,
  );
  const chars = trace.selections.reduce((acc, sel) => acc + sel.text.length, 0);
  fs.readFile(modelMetaByIdFile, "utf8", (err, data) => {
    let modelMetaById = {};
    if (!err) {
      try {
        modelMetaById = data.trim() ? JSON.parse(data) : {};
      } catch (e) {
        return res.status(500).json({ error: "Failed to parse models file" });
      }
    }
    modelMetaById[id] = modelMeta;
    // Write metadata
    fs.writeFile(
      modelMetaByIdFile,
      JSON.stringify(modelMetaById, null, 2),
      (err) => {
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

          res.json({ modelMeta, trace });
        });
      },
    );
  });
  fs.readFile(tracesFile, "utf8", (err, data) => {
    let traces = [];
    if (!err) {
      try {
        traces = data.trim() ? JSON.parse(data) : [];
      } catch (e) {
        console.error("Failed to parse traces file");
      }
    }
    traces.push(trace);
    fs.writeFile(tracesFile, JSON.stringify(traces, null, 2), (err) => {
      if (err) {
        console.error("Failed to write traces file");
      }
    });
  });
  fs.readFile(statsFile, "utf8", (err, data) => {
    let stats = {};
    if (!err) {
      try {
        stats = data.trim() ? JSON.parse(data) : {};
      } catch (e) {
        console.error("Failed to parse stats file");
      }
    }
    if (!stats[projectId]) {
      stats[projectId] = { documents: [], models: [] };
    }
    stats[projectId].models.push({
      id: id,
      documentId: trace.documentId,
      name: modelMeta.name,
      status: "generated",
      words,
      chars,
      updates: [
        {
          timestamp: getISODate(),
          type: "generation",
          words,
          chars,
        },
      ],
    });
    fs.writeFile(statsFile, JSON.stringify(stats, null, 2), (err) => {
      if (err) {
        console.error("Failed to write stats file");
      }
    });
  });

  logEvent(projectId, "model_generated", {
    id: id,
    name: modelMeta.name,
    data: modelData,
  });
});
app.get("/models/:id", (req, res) => {
  const modelId = req.params.id;
  console.log("Fetching model for ID:", modelId);
  let model;
  fs.readFile(modelMetaByIdFile, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ error: "Model not found" });
      }
      return res.status(500).json({ error: "Failed to read models file" });
    }
    try {
      const modelMetaById = data.trim() ? JSON.parse(data) : {};
      const modelMeta = modelMetaById[modelId];
      if (!modelMeta) {
        return res.status(404).json({ error: "Model not found" });
      }
      model = modelMeta;
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
app.put("/models/:id", (req, res) => {
  const modelId = req.params.id;
  const { projectId, modelData, trace } = req.body;
  console.log("Updating model content for ID:", modelId);

  const modelFile = path.join(modelsPath, `${modelId}.xml`);
  fs.writeFile(modelFile, modelData, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to update model content" });
    }

    res.json({ message: "Model content updated" });
  });

  fs.readFile(statsFile, "utf8", (err, data) => {
    let stats = {};
    if (!err) {
      try {
        stats = data.trim() ? JSON.parse(data) : {};
      } catch (e) {
        console.error("Failed to parse stats file");
      }
    }

    const projectStats = stats[projectId];
    const modelStats = projectStats.models.find((m) => m.id === modelId);
    if (modelStats) {
      modelStats.status = trace
        ? "regenerated_by_new_selections"
        : "updated_by_prompt";
      const update = {
        timestamp: getISODate(),
        type: trace ? "regeneration_by_new_selections" : "update_by_prompt",
      };
      if (trace) {
        const words = trace.selections.reduce(
          (acc, sel) => acc + sel.text.split(/\s+/).filter(Boolean).length,
          0,
        );
        const chars = trace.selections.reduce(
          (acc, sel) => acc + sel.text.length,
          0,
        );
        update.words = words;
        update.chars = chars;
      }
      modelStats.updates.push(update);
    }

    fs.writeFile(statsFile, JSON.stringify(stats, null, 2), (err) => {
      if (err) {
        console.error("Failed to write stats file");
      }
    });
  });

  logEvent(
    projectId,
    trace ? "model_regeneratied_by_new_selections" : "model_updated_by_prompt",
    {
      id: modelId,
      data: modelData,
    },
  );
  if (trace) {
    fs.readFile(tracesFile, "utf8", (err, data) => {
      let traces = [];
      if (!err) {
        try {
          traces = data.trim() ? JSON.parse(data) : [];
        } catch (e) {
          console.error("Failed to parse traces file");
        }
      }
      const traceIndex = traces.findIndex((t) => t.modelId === modelId);
      if (traceIndex !== -1) {
        traces[traceIndex] = trace;
        fs.writeFile(tracesFile, JSON.stringify(traces, null, 2), (err) => {
          if (err) {
            console.error("Failed to write traces file");
          }
        });
      }
    });
  }
});
app.put("/models/:id/data", (req, res) => {
  const modelId = req.params.id;
  const { projectId, modelData } = req.body;
  console.log("Updating model content for ID:", modelId);

  const modelFile = path.join(modelsPath, `${modelId}.xml`);
  fs.writeFile(modelFile, modelData, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to update model content" });
    }
    res.json({ message: "Model content updated" });
  });

  fs.readFile(statsFile, "utf8", (err, data) => {
    let stats = {};
    if (!err) {
      try {
        stats = data.trim() ? JSON.parse(data) : {};
      } catch (e) {
        console.error("Failed to parse stats file");
      }
    }
    const projectStats = stats[projectId];
    const modelStats = projectStats.models.find((m) => m.id === modelId);
    if (modelStats) {
      modelStats.status = "updated_manual";
      modelStats.updates.push({
        timestamp: getISODate(),
        type: "manual_update",
      });
    }

    fs.writeFile(statsFile, JSON.stringify(stats, null, 2), (err) => {
      if (err) {
        console.error("Failed to write stats file");
      }
    });
  });

  logEvent(projectId, "model_updated_manual", {
    id: modelId,
    data: modelData,
  });
});
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
