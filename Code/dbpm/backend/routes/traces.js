const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const traceRepo = require("../repositories/traceRepository");

// POST /traces - Create a new trace
router.post("/", (req, res) => {
  const trace = req.body;
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    const created = traceRepo.create(
      id,
      trace.documentId,
      trace.modelId,
      trace.prompt,
      trace.selections,
      timestamp,
    );
    res.json({ ...created, id, timestamp });
  } catch (err) {
    console.error("Failed to create trace:", err);
    res.status(500).json({ error: "Failed to create trace" });
  }
});

// PUT /traces/:id - Update a trace
router.put("/:id", (req, res) => {
  const traceId = req.params.id;
  const updatedTrace = req.body;

  try {
    const success = traceRepo.update(
      traceId,
      updatedTrace.documentId,
      updatedTrace.modelId,
      updatedTrace.prompt,
      updatedTrace.selections,
    );

    if (!success) {
      return res.status(404).json({ error: "Trace not found" });
    }

    res.json(updatedTrace);
  } catch (err) {
    console.error("Failed to update trace:", err);
    res.status(500).json({ error: "Failed to update trace" });
  }
});

module.exports = router;
