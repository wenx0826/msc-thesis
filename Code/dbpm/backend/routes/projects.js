import crypto from "crypto";
import projectRepo from "../repositories/projectRepository.js";
import documentRepo from "../repositories/documentRepository.js";
import { logEvent, createEmptyLogFile } from "../utils/logger.js";

const createProjectSchema = {
  body: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
    },
  },
};

const getProjectsSchema = {
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          createdAt: { type: "string" },
        },
      },
    },
  },
};

const getProjectSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        createdAt: { type: "string" },
        generatedModelCount: { type: "number" },
      },
    },
  },
};

const getDocumentsSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          uploadedAt: { type: "string" },
          projectId: { type: "string" },
          words: { type: "number" },
        },
      },
    },
  },
};

const getModelsSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          timestamp: { type: "string" },
          documentId: { type: "string" },
          words: { type: "number" },
        },
      },
    },
  },
};

const getDocumentCountSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string" },
    },
  },
  response: {
    200: { type: "string" },
  },
};

const getModelCountSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        count: { type: "number" },
      },
    },
  },
};

const updateProjectSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  body: {
    type: "object",
    properties: {
      name: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        createdAt: { type: "string" },
      },
    },
  },
};

async function projectsRoutes(fastify, options) {
  // POST /projects - Create a new project
  fastify.post("/", { schema: createProjectSchema }, async (request, reply) => {
    const { name } = request.body;
    const projectId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    try {
      projectRepo.create({ projectId, name, createdAt });
      reply.send({ id: projectId });

      createEmptyLogFile(projectId);
      logEvent(projectId, "project_created", { id: projectId, name });
    } catch (err) {
      console.error("Failed to create project:", err);
      reply.code(500).send({ error: "Failed to create project" });
    }
  });

  // GET /projects - Get all projects
  fastify.get("/", { schema: getProjectsSchema }, async (request, reply) => {
    console.log("Fetching project list...");
    try {
      const projects = projectRepo.findAll();
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
      const project = projectRepo.findById(projectId);
      if (!project) {
        return reply.code(404).send({ error: "Project not found" });
      }
      reply.send(project);
    } catch (err) {
      console.error("Failed to fetch project:", err);
      reply.code(500).send({ error: "Failed to fetch project" });
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
        const documents = documentRepo.findByProjectId(projectId);
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
        const documents = documentRepo.findByProjectId(projectId); // Documents don't have soft delete yet, so this is the same
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
        const models = projectRepo.getAllModelsByProjectId(projectId);
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
        const result = projectRepo.getDocumentCount(projectId);
        reply.send(result.count.toString());
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
        const result = projectRepo.getModelCount(projectId);
        reply.send({ count: result.count });
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
        const result = projectRepo.getTotalModelCount(projectId);
        reply.send({ count: result.count });
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
        const project = projectRepo.update(projectId, updates);
        if (!project) {
          return reply
            .code(404)
            .send({ error: "Project not found or no valid fields to update" });
        }
        reply.send(project);
      } catch (err) {
        console.error("Failed to update project:", err);
        reply.code(500).send({ error: "Failed to update project" });
      }
    },
  );
}

export default projectsRoutes;
