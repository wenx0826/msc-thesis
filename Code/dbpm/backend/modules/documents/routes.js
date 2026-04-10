import documentService from "./service.js";
import {
  createDocumentSchema,
  createVersionSchema,
  getDocumentContentSchema,
  restoreDocumentSchema,
  updateMetaSchema,
} from "./schema.js";

export default async function (fastify, options) {
  // POST /documents - Create a new document
  fastify.post("/", { schema: createDocumentSchema }, (request, reply) => {
    try {
      const result = documentService.create(request.body);
      reply.send(result);
    } catch (err) {
      console.error("Failed to create document:", err);
      reply
        .code(500)
        .send({ error: "Failed to create document", details: err.message });
    }
  });

  // POST /documents/versions - Create a new version of a document
  fastify.post(
    "/versions",
    { schema: createVersionSchema },
    (request, reply) => {
      try {
        const result = documentService.createVersion(request.body);
        reply.send(result);
      } catch (err) {
        console.error("Failed to create document version:", err);
        reply.code(500).send({
          error: "Failed to create document version",
          details: err.message,
        });
      }
    },
  );

  // GET /documents/versions/:versionId/content - Get document content by version ID
  fastify.get(
    "/versions/:versionId/content",
    { schema: getDocumentContentSchema },
    (request, reply) => {
      const { versionId } = request.params;
      console.log("Fetching document content for version ID:", versionId);
      try {
        const result = documentService.getContent(versionId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to read document content:", err);
        reply.code(500).send({ error: "Failed to read document content" });
      }
    },
  );

  // PUT /documents/:documentId/meta - Update document version metadata (e.g., name)
  fastify.put(
    "/:documentId/meta",
    {
      schema: updateMetaSchema,
    },
    (request, reply) => {
      try {
        const { documentId } = request.params;
        const result = documentService.updateMeta(documentId, request.body);
        reply.send(result);
      } catch (err) {
        console.error("Failed to update document version metadata:", err);
        reply
          .code(500)
          .send({ error: "Failed to update document version metadata" });
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
    (request, reply) => {
      const docId = request.params.id;
      try {
        const result = documentService.deleteDocument(docId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to delete document:", err);
        reply.code(500).send({ error: "Failed to delete document" });
      }
    },
  );

  // PUT /documents/:id/restore - Restore a soft-deleted document
  fastify.put(
    "/:id/restore",
    { schema: restoreDocumentSchema },
    (request, reply) => {
      const { id } = request.params;
      try {
        const result = documentService.restoreDocument(id);
        reply.send(result);
      } catch (err) {
        console.error("Failed to restore document:", err);
        reply.code(500).send({ error: "Failed to restore document" });
      }
    },
  );
}
