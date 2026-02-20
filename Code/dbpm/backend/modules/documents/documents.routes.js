import documentService from "./document.service.js";
import {
  createDocumentSchema,
  getDocumentsSchema,
  getDocumentContentSchema,
  getTracesSchema,
  getModelsSchema,
} from "./documents.schema.js";

async function documentsRoutes(fastify, options) {
  // POST /documents - Create a new document
  fastify.post(
    "/",
    { schema: createDocumentSchema },
    async (request, reply) => {
      const { projectId, name, content } = request.body;

      try {
        const result = await documentService.createDocument(
          projectId,
          name,
          content,
        );
        result.documentVersionId = result.versionId;
        reply.send(result);
      } catch (err) {
        console.error("Failed to create document:", err);
        reply
          .code(500)
          .send({ error: "Failed to create document", details: err.message });
      }
    },
  );

  // GET /documents - Get all documents
  fastify.get("/", { schema: getDocumentsSchema }, async (request, reply) => {
    console.log("Fetching documents list...");
    try {
      const documents = await documentService.getDocuments();
      reply.send(documents);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      reply.code(500).send({ error: "Failed to fetch documents" });
    }
  });

  // GET /documents/all - Get all documents including soft-deleted ones (for stats)
  fastify.get(
    "/all",
    { schema: getDocumentsSchema },
    async (request, reply) => {
      console.log("Fetching all documents including soft-deleted...");
      try {
        const documents = await documentService.getAllDocuments();
        reply.send(documents);
      } catch (err) {
        console.error("Failed to fetch all documents:", err);
        reply.code(500).send({ error: "Failed to fetch all documents" });
      }
    },
  );

  // GET /documents/:id/content - Get document content
  fastify.get(
    "/:id/content",
    { schema: getDocumentContentSchema },
    async (request, reply) => {
      const docId = request.params.id;
      console.log("Fetching document content for ID:", docId);
      try {
        const result = await documentService.getDocumentContent(docId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to read document content:", err);
        if (err.message === "Document not found") {
          reply.code(404).send({ error: "Document not found" });
        } else {
          reply.code(500).send({ error: "Failed to read document content" });
        }
      }
    },
  );

  // GET /documents/:id/traces - Get traces for a document
  fastify.get(
    "/:id/traces",
    { schema: getTracesSchema },
    async (request, reply) => {
      const { id } = request.params;
      console.log("Fetching traces for document ID:", id);
      try {
        const traces = await documentService.getTraces(id);
        reply.send(traces);
      } catch (err) {
        console.error("Failed to fetch traces:", err);
        reply.code(500).send({ error: "Failed to fetch traces" });
      }
    },
  );

  // GET /documents/:id/models - Get models for a document
  fastify.get(
    "/:id/models",
    { schema: getModelsSchema },
    async (request, reply) => {
      const docId = request.params.id;
      try {
        const models = await documentService.getModels(docId);
        reply.send(models);
      } catch (err) {
        console.error("Failed to fetch models for document:", err);
        reply.code(500).send({ error: "Failed to fetch models" });
      }
    },
  );

  // GET /documents/:id/models/all - Get all models for a document including soft-deleted ones
  fastify.get(
    "/:id/models/all",
    { schema: getModelsSchema },
    async (request, reply) => {
      const docId = request.params.id;
      try {
        const models = await documentService.getAllModels(docId);
        reply.send(models);
      } catch (err) {
        console.error("Failed to fetch all models for document:", err);
        reply.code(500).send({ error: "Failed to fetch all models" });
      }
    },
  );

  // DELETE /documents/:id - Delete a document
  fastify.delete(
    "/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const docId = request.params.id;
      try {
        const result = await documentService.deleteDocument(docId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to delete document:", err);
        if (err.message === "Document not found") {
          reply.code(404).send({ error: "Document not found" });
        } else {
          reply.code(500).send({ error: "Failed to delete document" });
        }
      }
    },
  );
}

export default documentsRoutes;
