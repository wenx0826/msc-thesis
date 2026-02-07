import crypto from "crypto";
import projectService from "./projects.service.js";
import {
  createProjectSchema,
  getProjectsSchema,
  getProjectSchema,
  getDocumentsSchema,
  getModelsSchema,
  getDocumentCountSchema,
  getModelCountSchema,
  updateProjectSchema,
} from "./projects.schema.js";

async function projectsRoutes(fastify, options) {
  // POST /projects - Create a new project
  fastify.post("/", { schema: createProjectSchema }, async (request, reply) => {
    const { name } = request.body;

    try {
      const result = await projectService.createProject(name);
      reply.send(result);
    } catch (err) {
      console.error("Failed to create project:", err);
      reply.code(500).send({ error: "Failed to create project" });
    }
  });

  // GET /projects - Get all projects
  fastify.get("/", { schema: getProjectsSchema }, async (request, reply) => {
    console.log("Fetching project list...");
    try {
      const projects = await projectService.getProjects();
      reply.send(projects);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      reply.code(500).send({ error: "Failed to fetch projects" });
    }
  });

  // GET /projects/:id - Get project by ID
  fastify.get("/:id", { schema: getProjectSchema }, async (request, reply) => {
    const projectId = request.params.id;
    try {
      const project = await projectService.getProject(projectId);
      reply.send(project);
    } catch (err) {
      console.error("Failed to fetch project:", err);
      if (err.message === "Project not found") {
        reply.code(404).send({ error: "Project not found" });
      } else {
        reply.code(500).send({ error: "Failed to fetch project" });
      }
    }
  });

  // GET /projects/:projectId/documents - Get documents for a project
  fastify.get(
    "/:projectId/documents",
    { schema: getDocumentsSchema },
    async (request, reply) => {
      const projectId = request.params.projectId;
      console.log("Fetching documents for project:", projectId);
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

  // GET /projects/:projectId/models/all - Get all models for project including soft-deleted ones
  fastify.get(
    "/:projectId/models/all",
    { schema: getModelsSchema },
    async (request, reply) => {
      const { projectId } = request.params;
      console.log(
        "Fetching all models for project (including soft-deleted):",
        projectId,
      );
      try {
        const models = await projectService.getAllModels(projectId);
        reply.send(models);
      } catch (err) {
        console.error("Failed to fetch all models for project:", err);
        reply.code(500).send({ error: "Failed to fetch all models" });
      }
    },
  );

  // GET /projects/:projectId/documents/count - Get document count
  fastify.get(
    "/:projectId/documents/count",
    { schema: getDocumentCountSchema },
    async (request, reply) => {
      const { projectId } = request.params;
      console.log("Fetching document count for project:", projectId);
      try {
        const result = await projectService.getDocumentCount(projectId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to count documents:", err);
        reply.send("error");
      }
    },
  );

  // GET /projects/:projectId/models/count - Get model count (non-deleted only)
  fastify.get(
    "/:projectId/models/count",
    { schema: getModelCountSchema },
    async (request, reply) => {
      const { projectId } = request.params;
      console.log("Fetching model count for project:", projectId);
      try {
        const result = await projectService.getModelCount(projectId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to count models:", err);
        reply.code(500).send({ error: "Failed to count models" });
      }
    },
  );

  // GET /projects/:projectId/models/count/total - Get total model count (including deleted)
  fastify.get(
    "/:projectId/models/count/total",
    { schema: getModelCountSchema },
    async (request, reply) => {
      const { projectId } = request.params;
      console.log("Fetching total model count for project:", projectId);
      try {
        const result = await projectService.getTotalModelCount(projectId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to count total models:", err);
        reply.code(500).send({ error: "Failed to count total models" });
      }
    },
  );

  // PUT /projects/:id - Update project
  fastify.put(
    "/:id",
    { schema: updateProjectSchema },
    async (request, reply) => {
      const projectId = request.params.id;
      const updates = request.body;

      try {
        const project = await projectService.updateProject(projectId, updates);
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

export default projectsRoutes;
