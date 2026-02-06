import projectRepo from "../repositories/projectRepository.js";
import modelRepo from "../repositories/modelRepository.js";
import documentRepo from "../repositories/documentRepository.js";

const getStatsSchema = {
  querystring: {
    type: "object",
    properties: {
      projectId: { type: "string" },
    },
  },
  response: {
    200: {
      oneOf: [
        {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              createdAt: { type: "string" },
              documentCount: { type: "number" },
              modelCount: { type: "number" },
              totalModelCount: { type: "number" },
            },
          },
        },
        {
          type: "object",
          properties: {
            project: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                createdAt: { type: "string" },
              },
            },
            documents: { type: "array" },
            models: { type: "array" },
            updates: { type: "array" },
          },
        },
      ],
    },
  },
};

async function statsRoutes(fastify, options) {
  // GET /stats - Get statistics
  fastify.get("/", { schema: getStatsSchema }, async (request, reply) => {
    const { projectId } = request.query;

    try {
      if (projectId) {
        // Get comprehensive stats for a specific project (including soft-deleted)
        const project = projectRepo.findById(projectId);

        if (!project) {
          return reply.code(404).send({ error: "Project not found" });
        }

        // For stats, we want to see all data including soft-deleted models
        const documents = documentRepo.findByProjectId(projectId);
        const models = projectRepo.getAllModelsByProjectId(projectId); // Include soft-deleted models
        const updates = modelRepo.getStatUpdates(projectId);

        reply.send({
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

        reply.send(stats);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      reply.code(500).send({ error: "Failed to fetch stats" });
    }
  });
}

export default statsRoutes;
