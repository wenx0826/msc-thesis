const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const documentRepo = require("../repositories/documentRepository");
const { logEvent } = require("../utils/logger");
const {
  readDocumentContent,
  writeDocumentContent,
  deleteDocumentFile,
  countWords,
} = require("../utils/fileHelper");

// POST /documents - Create a new document
router.post("/", (req, res) => {
  const { name, content, projectId } = req.body;
  if (!name || !content || !projectId) {
    return res
      .status(400)
      .json({ error: "Missing name, content, or projectId" });
  }

  const id = crypto.randomUUID();
  const uploadedAt = new Date().toISOString();

  try {
    writeDocumentContent(id, content);
    const words = countWords(content);
    documentRepo.create(id, name, uploadedAt, projectId, words);

    res.json({ id, name, uploadedAt, projectId });
    logEvent(projectId, "document_uploaded", { id, name, words });
  } catch (err) {
    console.error("Failed to create document:", err);
    deleteDocumentFile(id); // Cleanup
    res
      .status(500)
      .json({ error: "Failed to create document", details: err.message });
  }
});

// GET /documents - Get all documents
router.get("/", (req, res) => {
  console.log("Fetching documents list...");
  try {
    const documents = documentRepo.findAll();
    res.json(documents);
  } catch (err) {
    console.error("Failed to fetch documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// GET /documents/all - Get all documents including soft-deleted ones (for stats)
router.get("/all", (req, res) => {
  console.log("Fetching all documents including soft-deleted...");
  try {
    const documents = documentRepo.findAll(); // Documents don't have soft delete yet, so this is the same
    res.json(documents);
  } catch (err) {
    console.error("Failed to fetch all documents:", err);
    res.status(500).json({ error: "Failed to fetch all documents" });
  }
});

// GET /documents/:id/content - Get document content
router.get("/:id/content", (req, res) => {
  const docId = req.params.id;
  console.log("Fetching document content for ID:", docId);
  try {
    const doc = documentRepo.findById(docId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    const content = readDocumentContent(docId);
    res.json({ content });
  } catch (err) {
    console.error("Failed to read document content:", err);
    res.status(500).json({ error: "Failed to read document content" });
  }
});

// GET /documents/:id/traces - Get traces for a document
router.get("/:id/traces", (req, res) => {
  const { id } = req.params;
  console.log("Fetching traces for document ID:", id);
  try {
    const traces = documentRepo.getTraces(id);
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

// GET /documents/:id/models - Get models for a document
router.get("/:id/models", (req, res) => {
  const docId = req.params.id;
  try {
    const models = documentRepo.getModels(docId);
    res.json(models);
  } catch (err) {
    console.error("Failed to fetch models for document:", err);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// GET /documents/:id/models/all - Get all models for a document including soft-deleted ones
router.get("/:id/models/all", (req, res) => {
  const docId = req.params.id;
  try {
    const models = documentRepo.getAllModels(docId);
    res.json(models);
  } catch (err) {
    console.error("Failed to fetch all models for document:", err);
    res.status(500).json({ error: "Failed to fetch all models" });
  }
});

// DELETE /documents/:id - Delete a document
router.delete("/:id", (req, res) => {
  const docId = req.params.id;
  try {
    const doc = documentRepo.findById(docId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    documentRepo.delete(docId);
    deleteDocumentFile(docId);

    res.json({ message: "Document deleted" });
  } catch (err) {
    console.error("Failed to delete document:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

module.exports = router;
