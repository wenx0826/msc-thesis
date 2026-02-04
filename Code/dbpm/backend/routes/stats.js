const express = require("express");
const router = express.Router();
const projectRepo = require("../repositories/projectRepository");
const modelRepo = require("../repositories/modelRepository");
const documentRepo = require("../repositories/documentRepository");

// GET /stats - Get statistics
router.get("/", (req, res) => {
  const { projectId } = req.query;

  try {
    if (projectId) {
      // Get comprehensive stats for a specific project (including soft-deleted)
      const project = projectRepo.findById(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // For stats, we want to see all data including soft-deleted models
      const documents = documentRepo.findByProjectId(projectId);
      const models = projectRepo.getAllModelsByProjectId(projectId); // Include soft-deleted models
      const updates = modelRepo.getStatUpdates(projectId);

      res.json({
        project,
        documents,
        models,
        updates,
      });
    } else {
      // Get stats for all projects
      const projects = projectRepo.findAll();

      const stats = projects.map((project) => {
        const projectStats = projectRepo.getStats(project.id);
        return {
          ...project,
          ...projectStats,
        };
      });

      res.json(stats);
    }
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
