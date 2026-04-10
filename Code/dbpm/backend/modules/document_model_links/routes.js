import documentModelLinkService from "./service.js";
import {
  createSelectionSchema,
  deleteSelectionSchema,
  getLatestLinksByDocumentVersionSchema,
  getLatestLinkByModelVersionSchema,
  updateSelectionSchema,
  updateLinkSchema,
} from "./schema.js";

export default async function (fastify, options) {
  fastify.get(
    "/document-versions/:versionId",
    { schema: getLatestLinksByDocumentVersionSchema },
    (request, reply) => {
      const { versionId } = request.params;
      const { includeDeletedModels = false } = request.query || {};
      try {
        const result = documentModelLinkService.getLatestByDocumentVersionId(
          versionId,
          includeDeletedModels,
        );
        reply.send(result);
      } catch (err) {
        console.error("Failed to fetch latest links by document version:", err);
        reply
          .code(500)
          .send({ error: "Failed to fetch latest links by document version" });
      }
    },
  );

  fastify.get(
    "/model-versions/:modelVersionId/latest",
    { schema: getLatestLinkByModelVersionSchema },
    (request, reply) => {
      const { modelVersionId } = request.params;
      try {
        const result =
          documentModelLinkService.getLatestByModelVersionId(modelVersionId);
        reply.send(result);
      } catch (err) {
        console.error("Failed to fetch latest link by model version:", err);
        reply
          .code(500)
          .send({ error: "Failed to fetch latest link by model version" });
      }
    },
  );

  fastify.put("/:id", { schema: updateLinkSchema }, (request, reply) => {
    const linkId = request.params.id;
    const updatedLink = request.body;

    try {
      const result = documentModelLinkService.update(linkId, updatedLink);
      reply.send(result);
    } catch (err) {
      console.error("Failed to update link:", err);
      reply.code(500).send({ error: "Failed to update link" });
    }
  });

  fastify.post(
    "/:linkId/selections",
    { schema: createSelectionSchema },
    (request, reply) => {
      const { linkId } = request.params;
      try {
        const result = documentModelLinkService.createSelection(
          linkId,
          request.body,
        );
        reply.send(result);
      } catch (err) {
        console.error("Failed to create selection:", err);
        reply.code(500).send({ error: "Failed to create selection" });
      }
    },
  );

  fastify.put(
    "/:linkId/selections/:selectionId",
    { schema: updateSelectionSchema },
    (request, reply) => {
      const { linkId, selectionId } = request.params;
      try {
        const result = documentModelLinkService.updateSelection(
          linkId,
          selectionId,
          request.body,
        );
        reply.send(result);
      } catch (err) {
        console.error("Failed to update selection:", err);
        reply.code(500).send({ error: "Failed to update selection" });
      }
    },
  );

  fastify.delete(
    "/:linkId/selections/:selectionId",
    { schema: deleteSelectionSchema },
    (request, reply) => {
      const { linkId, selectionId } = request.params;
      try {
        const result = documentModelLinkService.deleteSelection(
          linkId,
          selectionId,
        );
        reply.send(result);
      } catch (err) {
        console.error("Failed to delete selection:", err);
        reply.code(500).send({ error: "Failed to delete selection" });
      }
    },
  );
}
