const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const yaml = require("js-yaml");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

const logsPath = path.join(__dirname, "..", "data", "logs");
const documentsPath = path.join(__dirname, "..", "data", "documents");
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

// #region Logs Endpoints
app.post("/logs", (req, res) => {
  const { projectId, event, data } = req.body;
  if (!projectId || !event) {
    return res.status(400).json({ error: "Missing projectId or event" });
  }
  logEvent(projectId, event, data);
  switch (event) {
    case "model_regenerated_by_prompt":
      try {
        const stmt = db.prepare(
          "UPDATE models SET regeneratedByPromptTimes = regeneratedByPromptTimes + 1 WHERE id = ?",
        );
        stmt.run(data.modelId);
      } catch (err) {
        console.error("Failed to update regeneratedByPromptTimes:", err);
      }
      break;
    case "model_regenerated_by_selections":
      try {
        const stmt = db.prepare(
          "UPDATE models SET regeneratedBySelectionsTimes = regeneratedBySelectionsTimes + 1 WHERE id = ?",
        );
        stmt.run(data.modelId);
      } catch (err) {
        console.error("Failed to update regeneratedBySelectionsTimes:", err);
      }
      break;
    default:
      break;
  }

  res.json({ message: "Log entry added" });
});
// #endregion

// #region Project Endpoints
app.post("/projects", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Missing name" });
  }
  const projectId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    const stmt = db.prepare(
      "INSERT INTO projects (id, name, createdAt, generatedModelNumber) VALUES (?, ?, ?, ?)",
    );
    stmt.run(projectId, name, createdAt, 0);

    res.json({ id: projectId });

    // Create empty log file for the project
    fs.writeFile(path.join(logsPath, `${projectId}.yaml`), "", (err) => {
      if (err) {
        console.error("Failed to create log file for project:", projectId);
      }
    });
    logEvent(projectId, "project_created", { id: projectId, name });
  } catch (err) {
    console.error("Failed to create project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});
app.get("/projects", (req, res) => {
  console.log("Fetching project list...");
  try {
    const stmt = db.prepare("SELECT * FROM projects");
    const projects = stmt.all();
    res.json(projects);
  } catch (err) {
    console.error("Failed to fetch projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});
app.get("/projects/:id", (req, res) => {
  const projectId = req.params.id;
  try {
    const stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
    const project = stmt.get(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (err) {
    console.error("Failed to fetch project:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

app.get("/projects/:projectId/documents", (req, res) => {
  const { projectId } = req.params;
  console.log("Fetching documents for project:", projectId);
  try {
    const stmt = db.prepare(
      "SELECT id, name, uploadedAt, projectId FROM documents WHERE projectId = ?",
    );
    const documents = stmt.all(projectId);
    res.json(documents);
  } catch (err) {
    console.error("Failed to fetch documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});
app.get("/projects/:projectId/documents/count", (req, res) => {
  const { projectId } = req.params;
  console.log("Fetching document count for project:", projectId);
  try {
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM documents WHERE projectId = ?",
    );
    const result = stmt.get(projectId);
    res.send(result.count.toString());
  } catch (err) {
    console.error("Failed to count documents:", err);
    res.send("error");
  }
});
app.get("/projects/:projectId/models/count", (req, res) => {
  const { projectId } = req.params;
  console.log("Fetching model count for project:", projectId);
  try {
    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count 
      FROM models m
      JOIN documents d ON m.documentId = d.id
      WHERE d.projectId = ?
    `);
    const result = stmt.get(projectId);
    res.send(result.count.toString());
  } catch (err) {
    console.error("Failed to count models:", err);
    res.send("error");
  }
});
app.put("/projects/:id", (req, res) => {
  const projectId = req.params.id;
  const updates = req.body;

  try {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.generatedModelNumber !== undefined) {
      fields.push("generatedModelNumber = ?");
      values.push(updates.generatedModelNumber);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(projectId);
    const stmt = db.prepare(
      `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`,
    );
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const getStmt = db.prepare("SELECT * FROM projects WHERE id = ?");
    const project = getStmt.get(projectId);
    res.json(project);
  } catch (err) {
    console.error("Failed to update project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
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

  try {
    // Write content file first
    const contentFile = path.join(documentsPath, `${id}.html`);
    fs.writeFileSync(contentFile, content);

    // Count words (ensure it's a valid number)
    const words = content.split(/\s+/).filter(Boolean).length || 0;

    // Insert into database with words
    const stmt = db.prepare(
      "INSERT INTO documents (id, name, uploadedAt, projectId, words) VALUES (?, ?, ?, ?, ?)",
    );
    stmt.run(id, name, uploadedAt, projectId, words);

    res.json({ id, name, uploadedAt, projectId });

    // Log event
    logEvent(projectId, "document_uploaded", { id, name, words });
  } catch (err) {
    console.error("Failed to create document:", err);
    console.error("Error details:", err.message);
    console.error("Stack trace:", err.stack);
    // Try to cleanup file if DB insert failed
    const contentFile = path.join(documentsPath, `${id}.html`);
    fs.unlink(contentFile, () => {});
    res
      .status(500)
      .json({ error: "Failed to create document", details: err.message });
  }
});
app.get("/documents", (req, res) => {
  console.log("Fetching documents list...");
  try {
    const stmt = db.prepare(
      "SELECT id, name, uploadedAt, projectId FROM documents",
    );
    const documents = stmt.all();
    res.json(documents);
  } catch (err) {
    console.error("Failed to fetch documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

app.get("/documents/:id/content", (req, res) => {
  const docId = req.params.id;
  console.log("Fetching document content for ID:", docId);
  try {
    // Verify document exists
    const stmt = db.prepare("SELECT id FROM documents WHERE id = ?");
    const doc = stmt.get(docId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    const contentFile = path.join(documentsPath, `${docId}.html`);
    const content = fs.readFileSync(contentFile, "utf8");
    res.json({ content });
  } catch (err) {
    console.error("Failed to read document content:", err);
    res.status(500).json({ error: "Failed to read document content" });
  }
});

app.get("/documents/:id/traces", (req, res) => {
  const { id } = req.params;
  console.log("Fetching traces for document ID:", id);
  try {
    const stmt = db.prepare("SELECT * FROM traces WHERE documentId = ?");
    const traces = stmt.all(id);
    // Parse selections JSON
    const parsedTraces = traces.map((trace) => ({
      ...trace,
      selections: JSON.parse(trace.selections),
    }));
    res.json(parsedTraces);
  } catch (err) {
    console.error("Failed to fetch traces:", err);
    res.status(500).json({ error: "Failed to fetch traces" });
  }
});
app.get("/documents/:id/models", (req, res) => {
  const docId = req.params.id;
  try {
    const stmt = db.prepare(`
      SELECT DISTINCT m.* FROM models m
      INNER JOIN traces t ON t.modelId = m.id
      WHERE t.documentId = ? AND m.deleted_at IS NULL
    `);
    const models = stmt.all(docId);
    res.json(models);
  } catch (err) {
    console.error("Failed to fetch models for document:", err);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

app.delete("/documents/:id", (req, res) => {
  const docId = req.params.id;
  try {
    // Verify document exists before deleting
    const getStmt = db.prepare("SELECT id FROM documents WHERE id = ?");
    const doc = getStmt.get(docId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Delete from database (will cascade to traces and stats)
    const deleteStmt = db.prepare("DELETE FROM documents WHERE id = ?");
    deleteStmt.run(docId);

    // Delete content file
    const contentFile = path.join(documentsPath, `${docId}.html`);
    fs.unlink(contentFile, () => {}); // Ignore errors

    res.json({ message: "Document deleted" });
  } catch (err) {
    console.error("Failed to delete document:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});
// #endregion

// #region Model Endpoints
app.post("/models", (req, res) => {
  const { projectId, model, trace } = req.body;
  const { data: modelData, meta } = model;
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  trace.modelId = id;
  trace.id = crypto.randomUUID();
  trace.timestamp = timestamp;
  const words = trace.selections.reduce(
    (acc, sel) => acc + sel.text.split(/\s+/).filter(Boolean).length,
    0,
  );

  try {
    // Write model data file
    const modelDataFile = path.join(modelsPath, `${id}.xml`);
    fs.writeFileSync(modelDataFile, modelData);

    // Insert model into database with stats
    const modelStmt = db.prepare(
      "INSERT INTO models (id, name, timestamp, documentId, status, regeneratedByPromptTimes, regeneratedBySelectionsTimes, words) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    modelStmt.run(
      id,
      meta.name,
      timestamp,
      trace.documentId,
      "generated",
      0,
      0,
      words,
    );

    const traceStmt = db.prepare(
      "INSERT INTO traces (id, documentId, modelId, prompt, selections, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
    );
    traceStmt.run(
      trace.id,
      trace.documentId,
      trace.modelId,
      trace.prompt || null,
      JSON.stringify(trace.selections),
      trace.timestamp,
    );

    // Insert initial update
    const updateStmt = db.prepare(
      "INSERT INTO model_stat_updates (modelId, timestamp, type, words) VALUES (?, ?, ?, ?)",
    );
    updateStmt.run(id, getISODate(), "generation", words);

    res.json({ modelMeta: { id, name: meta.name, timestamp }, trace });

    logEvent(projectId, "model_generated", {
      id: id,
      name: meta.name,
      data: modelData,
    });
  } catch (err) {
    console.error("Failed to create model:", err);
    // Cleanup file if DB insert failed
    const modelDataFile = path.join(modelsPath, `${id}.xml`);
    fs.unlink(modelDataFile, () => {});
    res.status(500).json({ error: "Failed to create model" });
  }
});
app.get("/models/:id", (req, res) => {
  const modelId = req.params.id;
  console.log("Fetching model for ID:", modelId);
  try {
    const stmt = db.prepare(
      "SELECT * FROM models WHERE id = ? AND deleted_at IS NULL",
    );
    const model = stmt.get(modelId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    // Read model data from file
    const modelFile = path.join(modelsPath, `${modelId}.xml`);
    const data = fs.readFileSync(modelFile, "utf8");
    model.data = data;

    res.json(model);
  } catch (err) {
    console.error("Failed to fetch model:", err);
    res.status(500).json({ error: "Failed to fetch model" });
  }
});

app.get("/models/:id/data", (req, res) => {
  const modelId = req.params.id;
  console.log("Fetching model content for ID:", modelId);
  try {
    const modelFile = path.join(modelsPath, `${modelId}.xml`);
    const data = fs.readFileSync(modelFile, "utf8");
    res.json(data);
  } catch (err) {
    console.error("Failed to read model data:", err);
    res.status(500).json({ error: "Failed to read model data" });
  }
});
app.put("/models/:id", (req, res) => {
  const modelId = req.params.id;
  const { projectId, modelData, trace, type } = req.body;
  console.log("Updating model for ID:", modelId);

  try {
    // Write model data file
    const modelFile = path.join(modelsPath, `${modelId}.xml`);
    fs.writeFileSync(modelFile, modelData);

    // Update model status
    const updateModelStmt = db.prepare(
      "UPDATE models SET status = ? WHERE id = ?",
    );
    updateModelStmt.run("updated", modelId);

    // Calculate words and add update record
    let words = null;
    if (trace) {
      words = trace.selections.reduce(
        (acc, sel) => acc + sel.text.split(/\s+/).filter(Boolean).length,
        0,
      );
    }

    const updateStmt = db.prepare(
      "INSERT INTO model_stat_updates (modelId, timestamp, type, words) VALUES (?, ?, ?, ?)",
    );
    updateStmt.run(modelId, getISODate(), type, words);

    // Update trace if provided
    if (trace) {
      const traceStmt = db.prepare(
        "UPDATE traces SET prompt = ?, selections = ? WHERE modelId = ?",
      );
      traceStmt.run(
        trace.prompt || null,
        JSON.stringify(trace.selections),
        modelId,
      );
    }

    res.json({ message: "Model content updated" });

    logEvent(projectId, `model_updated_${type}`, {
      id: modelId,
      data: modelData,
    });
  } catch (err) {
    console.error("Failed to update model:", err);
    res.status(500).json({ error: "Failed to update model" });
  }
});
app.put("/models/:id/data", (req, res) => {
  const modelId = req.params.id;
  const { projectId, modelData } = req.body;
  console.log("Updating model content for ID:", modelId);

  try {
    // Write model data file
    const modelFile = path.join(modelsPath, `${modelId}.xml`);
    fs.writeFileSync(modelFile, modelData);

    // Update model status
    const updateModelStmt = db.prepare(
      "UPDATE models SET status = ? WHERE id = ?",
    );
    updateModelStmt.run("updated_manual", modelId);

    // Add update record
    const updateStmt = db.prepare(
      "INSERT INTO model_stat_updates (modelId, timestamp, type, words) VALUES (?, ?, ?, ?)",
    );
    updateStmt.run(modelId, getISODate(), "manual_update", null);

    res.json({ message: "Model content updated" });

    logEvent(projectId, "model_updated_manual", {
      id: modelId,
      data: modelData,
    });
  } catch (err) {
    console.error("Failed to update model data:", err);
    res.status(500).json({ error: "Failed to update model data" });
  }
});
app.delete("/models/:id", (req, res) => {
  const modelId = req.params.id;
  try {
    // Verify model exists before deleting
    const getStmt = db.prepare(
      "SELECT id FROM models WHERE id = ? AND deleted_at IS NULL",
    );
    const model = getStmt.get(modelId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    // Soft delete: update deleted_at timestamp
    const deleteStmt = db.prepare(
      "UPDATE models SET deleted_at = ? WHERE id = ?",
    );
    deleteStmt.run(getISODate(), modelId);

    res.json({ message: "Model deleted" });
  } catch (err) {
    console.error("Failed to delete model:", err);
    res.status(500).json({ error: "Failed to delete model" });
  }
});
// #endregion

//#region Trace Endpoints
app.post("/traces", (req, res) => {
  const trace = req.body;
  const id = crypto.randomUUID();
  trace.id = id;
  trace.timestamp = new Date().toISOString();

  try {
    const stmt = db.prepare(
      "INSERT INTO traces (id, documentId, modelId, prompt, selections, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
    );
    stmt.run(
      trace.id,
      trace.documentId,
      trace.modelId,
      trace.prompt || null,
      JSON.stringify(trace.selections),
      trace.timestamp,
    );
    res.json(trace);
  } catch (err) {
    console.error("Failed to create trace:", err);
    res.status(500).json({ error: "Failed to create trace" });
  }
});
app.put("/traces/:id", (req, res) => {
  const traceId = req.params.id;
  const updatedTrace = req.body;

  try {
    const stmt = db.prepare(
      "UPDATE traces SET documentId = ?, modelId = ?, prompt = ?, selections = ? WHERE id = ?",
    );
    const result = stmt.run(
      updatedTrace.documentId,
      updatedTrace.modelId,
      updatedTrace.prompt || null,
      JSON.stringify(updatedTrace.selections),
      traceId,
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Trace not found" });
    }

    res.json(updatedTrace);
  } catch (err) {
    console.error("Failed to update trace:", err);
    res.status(500).json({ error: "Failed to update trace" });
  }
});
//#endregion

//#region Stats Endpoints
app.get("/stats", (req, res) => {
  const { projectId } = req.query;

  try {
    if (projectId) {
      // Get stats for a specific project
      const projectStmt = db.prepare("SELECT * FROM projects WHERE id = ?");
      const project = projectStmt.get(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get documents for this project
      const docsStmt = db.prepare(`
        SELECT id, name, uploadedAt, words 
        FROM documents 
        WHERE projectId = ?
        ORDER BY uploadedAt DESC
      `);
      const documents = docsStmt.all(projectId);

      // Get models with their stats
      const modelsStmt = db.prepare(`
        SELECT m.id, m.name, m.timestamp, m.status, 
               m.regeneratedByPromptTimes, m.regeneratedBySelectionsTimes, 
               m.words, d.name as documentName
        FROM models m
        JOIN documents d ON m.documentId = d.id
        WHERE d.projectId = ? AND m.deleted_at IS NULL
        ORDER BY m.timestamp DESC
      `);
      const models = modelsStmt.all(projectId);

      // Get model stat updates
      const updatesStmt = db.prepare(`
        SELECT msu.id, msu.modelId, msu.timestamp, msu.type, msu.words,
               m.name as modelName
        FROM model_stat_updates msu
        JOIN models m ON msu.modelId = m.id
        JOIN documents d ON m.documentId = d.id
        WHERE d.projectId = ?
        ORDER BY msu.timestamp DESC
      `);
      const updates = updatesStmt.all(projectId);

      res.json({
        project,
        documents,
        models,
        updates,
      });
    } else {
      // Get stats for all projects
      const projectsStmt = db.prepare(
        "SELECT * FROM projects ORDER BY createdAt DESC",
      );
      const projects = projectsStmt.all();

      const stats = projects.map((project) => {
        const docsStmt = db.prepare(
          "SELECT COUNT(*) as count, SUM(words) as totalWords FROM documents WHERE projectId = ?",
        );
        const docStats = docsStmt.get(project.id);

        const modelsStmt = db.prepare(`
          SELECT COUNT(*) as count, SUM(m.words) as totalWords
          FROM models m
          JOIN documents d ON m.documentId = d.id
          WHERE d.projectId = ? AND m.deleted_at IS NULL
        `);
        const modelStats = modelsStmt.get(project.id);

        return {
          ...project,
          documentCount: docStats.count || 0,
          documentTotalWords: docStats.totalWords || 0,
          modelCount: modelStats.count || 0,
          modelTotalWords: modelStats.totalWords || 0,
        };
      });

      res.json(stats);
    }
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});
//#endregion

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log("Database initialized successfully");
});

server.on("error", (err) => {
  console.error("Failed to start server:", err.message);
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  } else if (err.code === "EACCES") {
    console.error(`Permission denied for port ${PORT}.`);
  }
});
