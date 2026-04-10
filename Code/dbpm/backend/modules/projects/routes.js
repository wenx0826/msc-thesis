import projectService from "./service.js";
import {
  createProjectSchema,
  getProjectsSchema,
  getProjectsOverviewSchema,
  getProjectSchema,
  getProjectComponentsSchema,
  getProjectComponentsStatsSchema,
  updateProjectSchema,
  deleteProjectSchema,
} from "./schema.js";

export default async function (fastify, options) {
  // POST /projects - Create a new project
  fastify.post("/", { schema: createProjectSchema }, (request, reply) => {
    const { name } = request.body;

    try {
      const result = projectService.create(name);
      reply.send(result);
    } catch (err) {
      console.error("Failed to create project:", err);
      reply.code(500).send({ error: "Failed to create project" });
    }
  });

  // GET /projects - Get all projects
  fastify.get("/", { schema: getProjectsSchema }, (request, reply) => {
    try {
      const projects = projectService.getAll();
      reply.send(projects);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      reply.code(500).send({ error: "Failed to fetch projects" });
    }
  });

  // GET /projects/overview - Get overview statistics
  fastify.get(
    "/overview",
    { schema: getProjectsOverviewSchema },
    (request, reply) => {
      try {
        const result = projectService.getOverview();
        reply.send(result);
      } catch (err) {
        console.error("Failed to fetch overview:", err);
        reply.code(500).send({ error: "Failed to fetch overview" });
      }
    },
  );

  // GET /projects/:projectId - Get project by ID
  fastify.get("/:projectId", { schema: getProjectSchema }, (request, reply) => {
    const projectId = request.params.projectId;
    try {
      const project = projectService.get(projectId);
      reply.send(project);
    } catch (err) {
      console.error("Failed to fetch project:", err);
      reply.code(500).send({ error: "Failed to fetch project" });
    }
  });

  // GET /projects/:projectId/components - Get project components including documents and models
  fastify.get(
    "/:projectId/components",
    { schema: getProjectComponentsSchema },
    (request, reply) => {
      const projectId = request.params.projectId;
      const { includeDeleted } = request.query;
      try {
        const result = projectService.getComponentsById(
          projectId,
          includeDeleted,
        );
        reply.send(result);
      } catch (err) {
        console.error("Failed to fetch project components:", err);
        reply.code(500).send({ error: "Failed to fetch project components" });
      }
    },
  );

  // GET /projects/:projectId/components/stats - Get project components statistics including documents and models
  fastify.get(
    "/:projectId/components/stats",
    { schema: getProjectComponentsStatsSchema },
    (request, reply) => {
      const projectId = request.params.projectId;
      const { includeDeleted } = request.query;
      try {
        const result = projectService.getComponentsStatsById(
          projectId,
          includeDeleted,
        );
        reply.send(result);
      } catch (err) {
        console.error("Failed to fetch project components statistics:", err);
        reply
          .code(500)
          .send({ error: "Failed to fetch project components statistics" });
      }
    },
  );

  // PUT /projects/:projectId - Update project
  fastify.put(
    "/:projectId",
    { schema: updateProjectSchema },
    (request, reply) => {
      const projectId = request.params.projectId;
      const updates = request.body;

      try {
        const project = projectService.update(projectId, updates);
        reply.send(project);
      } catch (err) {
        console.error("Failed to update project:", err);
        reply.code(500).send({ error: "Failed to update project" });
      }
    },
  );

  // DELETE /projects/:projectId - Soft delete project and cascade soft-delete components
  fastify.delete(
    "/:projectId",
    { schema: deleteProjectSchema },
    (request, reply) => {
      const projectId = request.params.projectId;
      try {
        const result = projectService.delete(projectId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to delete project:", err);
        reply.code(500).send({ error: "Failed to delete project" });
      }
    },
  );
}
