const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const modelRepo = require("../repositories/modelRepository");
const traceRepo = require("../repositories/traceRepository");
const { logEvent, getISODate } = require("../utils/logger");
const {
  readModelData,
  writeModelData,
  countWords,
} = require("../utils/fileHelper");

// POST /models - Create a new model
router.post("/", (req, res) => {
  const { projectId, model, trace } = req.body;
  const { data: modelData, meta } = model;
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  trace.modelId = id;
  trace.id = crypto.randomUUID();
  trace.timestamp = timestamp;

  const words = trace.selections.reduce(
    (acc, sel) => acc + countWords(sel.text),
    0,
  );

  try {
    writeModelData(id, modelData);
    modelRepo.create(id, meta.name, timestamp, trace.documentId, words);
    traceRepo.create(
      trace.id,
      trace.documentId,
      trace.modelId,
      trace.prompt,
      trace.selections,
      trace.timestamp,
    );
    modelRepo.addStatUpdate(id, getISODate(), "generation", words);

    res.json({ modelMeta: { id, name: meta.name, timestamp }, trace });
    logEvent(projectId, "model_generated", {
      id: id,
      name: meta.name,
      data: modelData,
    });
  } catch (err) {
    console.error("Failed to create model:", err);
    res.status(500).json({ error: "Failed to create model" });
  }
});

// GET /models/:id - Get model by ID
router.get("/:id", (req, res) => {
  const modelId = req.params.id;
  console.log("Fetching model for ID:", modelId);
  try {
    const model = modelRepo.findById(modelId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    const data = readModelData(modelId);
    model.data = data;

    res.json(model);
  } catch (err) {
    console.error("Failed to fetch model:", err);
    res.status(500).json({ error: "Failed to fetch model" });
  }
});

// GET /models/:id/data - Get model data
router.get("/:id/data", (req, res) => {
  const modelId = req.params.id;
  console.log("Fetching model content for ID:", modelId);
  try {
    const data = readModelData(modelId);
    res.json(data);
  } catch (err) {
    console.error("Failed to read model data:", err);
    res.status(500).json({ error: "Failed to read model data" });
  }
});

// GET /models/all - Get all models including soft-deleted ones (for stats)
router.get("/all", (req, res) => {
  console.log("Fetching all models including soft-deleted...");
  try {
    const models = modelRepo.findAll();
    res.json(models);
  } catch (err) {
    console.error("Failed to fetch all models:", err);
    res.status(500).json({ error: "Failed to fetch all models" });
  }
});

// PUT /models/:id - Update model
router.put("/:id", (req, res) => {
  const modelId = req.params.id;
  const { projectId, modelData, trace, type } = req.body;
  console.log("Updating model for ID:", modelId);

  try {
    writeModelData(modelId, modelData);
    modelRepo.updateStatus(modelId, "updated");

    let words = null;
    if (trace) {
      words = trace.selections.reduce(
        (acc, sel) => acc + countWords(sel.text),
        0,
      );
      traceRepo.updateByModelId(modelId, trace.prompt, trace.selections);
    }

    modelRepo.addStatUpdate(modelId, getISODate(), type, words);

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

// PUT /models/:id/data - Update model data only
router.put("/:id/data", (req, res) => {
  const modelId = req.params.id;
  const { projectId, modelData } = req.body;
  console.log("Updating model content for ID:", modelId);

  try {
    writeModelData(modelId, modelData);
    modelRepo.updateStatus(modelId, "updated_manual");
    modelRepo.addStatUpdate(modelId, getISODate(), "manual_update", null);

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

// DELETE /models/:id - Soft delete a model
router.delete("/:id", (req, res) => {
  const modelId = req.params.id;
  try {
    const model = modelRepo.findById(modelId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    modelRepo.softDelete(modelId);
    res.json({ message: "Model deleted" });
  } catch (err) {
    console.error("Failed to delete model:", err);
    res.status(500).json({ error: "Failed to delete model" });
  }
});

module.exports = router;
