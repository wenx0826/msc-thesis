const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const projectRepo = require("../repositories/projectRepository");
const documentRepo = require("../repositories/documentRepository");
const { logEvent, createEmptyLogFile } = require("../utils/logger");

// POST /projects - Create a new project
router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Missing name" });
  }

  const projectId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    projectRepo.create(projectId, name, createdAt);
    res.json({ id: projectId });

    createEmptyLogFile(projectId);
    logEvent(projectId, "project_created", { id: projectId, name });
  } catch (err) {
    console.error("Failed to create project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// GET /projects - Get all projects
router.get("/", (req, res) => {
  console.log("Fetching project list...");
  try {
    const projects = projectRepo.findAll();
    res.json(projects);
  } catch (err) {
    console.error("Failed to fetch projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET /projects/:id - Get project by ID
router.get("/:id", (req, res) => {
  const projectId = req.params.id;
  try {
    const project = projectRepo.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (err) {
    console.error("Failed to fetch project:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// GET /projects/:projectId/documents - Get documents for a project
router.get("/:projectId/documents", (req, res) => {
  const { projectId } = req.params;
  console.log("Fetching documents for project:", projectId);
  try {
    const documents = documentRepo.findByProjectId(projectId);
    res.json(documents);
  } catch (err) {
    console.error("Failed to fetch documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// GET /projects/:projectId/documents/all - Get all documents for project including soft-deleted ones
router.get("/:projectId/documents/all", (req, res) => {
  const { projectId } = req.params;
  console.log(
    "Fetching all documents for project (including soft-deleted):",
    projectId,
  );
  try {
    const documents = documentRepo.findByProjectId(projectId); // Documents don't have soft delete yet
    res.json(documents);
  } catch (err) {
    console.error("Failed to fetch all documents:", err);
    res.status(500).json({ error: "Failed to fetch all documents" });
  }
});

// GET /projects/:projectId/models/all - Get all models for project including soft-deleted ones
router.get("/:projectId/models/all", (req, res) => {
  const { projectId } = req.params;
  console.log(
    "Fetching all models for project (including soft-deleted):",
    projectId,
  );
  try {
    const models = projectRepo.getAllModelsByProjectId(projectId);
    res.json(models);
  } catch (err) {
    console.error("Failed to fetch all models for project:", err);
    res.status(500).json({ error: "Failed to fetch all models" });
  }
});

// GET /projects/:projectId/documents/count - Get document count
router.get("/:projectId/documents/count", (req, res) => {
  const { projectId } = req.params;
  console.log("Fetching document count for project:", projectId);
  try {
    const result = projectRepo.getDocumentCount(projectId);
    res.send(result.count.toString());
  } catch (err) {
    console.error("Failed to count documents:", err);
    res.send("error");
  }
});

// GET /projects/:projectId/models/count - Get model count (non-deleted only)
router.get("/:projectId/models/count", (req, res) => {
  const { projectId } = req.params;
  console.log("Fetching model count for project:", projectId);
  try {
    const result = projectRepo.getModelCount(projectId);
    res.json({ count: result.count });
  } catch (err) {
    console.error("Failed to count models:", err);
    res.status(500).json({ error: "Failed to count models" });
  }
});

// GET /projects/:projectId/models/count/total - Get total model count (including deleted)
router.get("/:projectId/models/count/total", (req, res) => {
  const { projectId } = req.params;
  console.log("Fetching total model count for project:", projectId);
  try {
    const result = projectRepo.getTotalModelCount(projectId);
    res.json({ count: result.count });
  } catch (err) {
    console.error("Failed to count total models:", err);
    res.status(500).json({ error: "Failed to count total models" });
  }
});

// PUT /projects/:id - Update project
router.put("/:id", (req, res) => {
  const projectId = req.params.id;
  const updates = req.body;

  try {
    const project = projectRepo.update(projectId, updates);
    if (!project) {
      return res
        .status(404)
        .json({ error: "Project not found or no valid fields to update" });
    }
    res.json(project);
  } catch (err) {
    console.error("Failed to update project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

module.exports = router;
