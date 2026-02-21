import projectService from "./service.js";
import {
  createProjectSchema,
  getProjectsSchema,
  getProjectSchema,
  getProjectDetailsSchema,
  getDocumentsSchema,
  getModelsSchema,
  updateProjectSchema,
} from "./schema.js";

export default async function (fastify, options) {
  // POST /projects - Create a new project
  fastify.post("/", { schema: createProjectSchema }, async (request, reply) => {
    const { name } = request.body;

    try {
      const result = await projectService.create(name);
      reply.send(result);
    } catch (err) {
      console.error("Failed to create project:", err);
      reply.code(500).send({ error: "Failed to create project" });
    }
  });

  // GET /projects - Get all projects
  fastify.get("/", { schema: getProjectsSchema }, async (request, reply) => {
    try {
      const projects = await projectService.getAll();
      reply.send(projects);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      reply.code(500).send({ error: "Failed to fetch projects" });
    }
  });

  // GET /projects/:projectId - Get project by ID
  fastify.get(
    "/:projectId",
    { schema: getProjectSchema },
    async (request, reply) => {
      const projectId = request.params.projectId;
      try {
        const project = await projectService.get(projectId);
        reply.send(project);
      } catch (err) {
        console.error("Failed to fetch project:", err);
        if (err.message === "Project not found") {
          reply.code(404).send({ error: "Project not found" });
        } else {
          reply.code(500).send({ error: "Failed to fetch project" });
        }
      }
    },
  );
  // GET /projects/:projectId/details - Get project details including documents and models
  fastify.get(
    "/:projectId/details",
    { schema: getProjectDetailsSchema },
    async (request, reply) => {
      const projectId = request.params.projectId;
      const { includeDeleted } = request.query;
      try {
        const result = await projectService.getDetails(
          projectId,
          includeDeleted,
        );
        reply.send(result);
      } catch (err) {
        console.error("Failed to fetch project details:", err);
        reply.code(500).send({ error: "Failed to fetch project details" });
      }
    },
  );

  // GET /projects/:projectId/documents - Get documents for a project
  fastify.get(
    "/:projectId/documents",
    { schema: getDocumentsSchema },
    async (request, reply) => {
      const projectId = request.params.projectId;
      try {
        const documents = await projectService.getDocuments(projectId);
        reply.send(documents);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
        reply.code(500).send({ error: "Failed to fetch documents" });
      }
    },
  );

  // GET /projects/:projectId/documents/all - Get all documents for project including soft-deleted ones
  fastify.get(
    "/:projectId/documents/all",
    { schema: getDocumentsSchema },
    async (request, reply) => {
      const { projectId } = request.params;
      console.log(
        "Fetching all documents for project (including soft-deleted):",
        projectId,
      );
      try {
        const documents = await projectService.getAllDocuments(projectId);
        reply.send(documents);
      } catch (err) {
        console.error("Failed to fetch all documents:", err);
        reply.code(500).send({ error: "Failed to fetch all documents" });
      }
    },
  );

  // GET /projects/:projectId/models - Get models for a project
  fastify.get(
    "/:projectId/models",
    { schema: getModelsSchema },
    async (request, reply) => {
      const projectId = request.params.projectId;
      try {
        const models = await projectService.getModels(projectId);
        reply.send(models);
      } catch (err) {
        console.error("Failed to fetch models:", err);
        reply.code(500).send({ error: "Failed to fetch models" });
      }
    },
  );

  // GET /projects/:projectId/models/all - Get all models for project including soft-deleted ones
  fastify.get(
    "/:projectId/models/all",
    { schema: getModelsSchema },
    async (request, reply) => {
      const { projectId } = request.params;
      try {
        const models = await projectService.getAllModels(projectId);
        reply.send(models);
      } catch (err) {
        console.error("Failed to fetch all models for project:", err);
        reply.code(500).send({ error: "Failed to fetch all models" });
      }
    },
  );

  // PUT /projects/:projectId - Update project
  fastify.put(
    "/:projectId",
    { schema: updateProjectSchema },
    async (request, reply) => {
      const projectId = request.params.projectId;
      const updates = request.body;

      try {
        const project = await projectService.update(projectId, updates);
        reply.send(project);
      } catch (err) {
        console.error("Failed to update project:", err);
        if (err.message === "Project not found or no valid fields to update") {
          reply
            .code(404)
            .send({ error: "Project not found or no valid fields to update" });
        } else {
          reply.code(500).send({ error: "Failed to update project" });
        }
      }
    },
  );
}
