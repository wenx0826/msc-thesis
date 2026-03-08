export const updateTraceSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  body: {
    type: "object",
    minProperties: 1,
    additionalProperties: false,
    properties: {
      documentVersionId: { type: "string" },
      modelVersionId: { type: "string" },
      selections: { type: "array" },
    },
  },
};

export const getLatestTracesByDocumentVersionSchema = {
  params: {
    type: "object",
    required: ["versionId"],
    properties: {
      versionId: { type: "string" },
    },
  },
  querystring: {
    type: "object",
    properties: {
      includeDeletedModels: { type: "boolean" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          documentVersionId: { type: "string" },
          documentId: { type: "string" },
          modelVersionId: { type: "string" },
          modelId: { type: "string" },
          modelName: { type: ["string", "null"] },
          selections: { type: "array" },
          createdAt: { type: "string" },
        },
      },
    },
  },
};

export const getLatestTraceByModelVersionSchema = {
  params: {
    type: "object",
    required: ["modelVersionId"],
    properties: {
      modelVersionId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        documentVersionId: { type: "string" },
        documentId: { type: "string" },
        modelVersionId: { type: "string" },
        modelId: { type: "string" },
        modelName: { type: ["string", "null"] },
        selections: { type: "array" },
        createdAt: { type: "string" },
      },
    },
  },
};
