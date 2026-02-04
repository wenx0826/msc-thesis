const express = require("express");
const router = express.Router();
const modelRepo = require("../repositories/modelRepository");
const { logEvent } = require("../utils/logger");

// POST /logs - Log an event
router.post("/", (req, res) => {
  const { projectId, event, data } = req.body;
  if (!projectId || !event) {
    return res.status(400).json({ error: "Missing projectId or event" });
  }

  logEvent(projectId, event, data);

  switch (event) {
    case "model_regenerated_by_prompt":
      try {
        modelRepo.incrementRegeneratedByPrompt(data.modelId);
      } catch (err) {
        console.error("Failed to update regeneratedByPromptTimes:", err);
      }
      break;
    case "model_regenerated_by_selections":
      try {
        modelRepo.incrementRegeneratedBySelections(data.modelId);
      } catch (err) {
        console.error("Failed to update regeneratedBySelectionsTimes:", err);
      }
      break;
    default:
      break;
  }

  res.json({ message: "Log entry added" });
});

module.exports = router;
