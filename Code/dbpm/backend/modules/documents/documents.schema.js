export const createDocumentSchema = {
  body: {
    type: "object",
    required: ["name", "content", "projectId"],
    properties: {
      projectId: { type: "string" },
      name: { type: "string" },
      content: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        documentId: { type: "string" },
        documentVersionId: { type: "string" },
        name: { type: "string" },
        createdAt: { type: "string" },
      },
    },
  },
};

export const getDocumentsSchema = {
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          versionId: { type: "string" },
          name: { type: "string" },
          createdAt: { type: "string" },
          words: { type: "number" },
        },
      },
    },
  },
};

export const getDocumentContentSchema = {
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
        content: { type: "string" },
      },
    },
  },
};

export const getTracesSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          documentId: { type: "string" },
          modelId: { type: "string" },
          selections: { type: "array" },
        },
      },
    },
  },
};

export const getModelsSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
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
          createdAt: { type: "string" },
          documentId: { type: "string" },
          words: { type: "number" },
        },
      },
    },
  },
};
