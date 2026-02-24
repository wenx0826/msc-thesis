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
        id: { type: "string" },
        latestVersionId: { type: "string" },
        versions: {
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
    },
  },
};

export const createVersionSchema = {
  body: {
    type: "object",
    required: ["documentId", "name", "content"],
    properties: {
      documentId: { type: "string" },
      name: { type: "string" },
      content: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        documentId: { type: "string" },
        name: { type: "string" },
        createdAt: { type: "string" },
      },
    },
  },
};

export const getDocumentContentSchema = {
  params: {
    type: "object",
    required: ["versionId"],
    properties: {
      versionId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        200: { type: "string" },
      },
    },
  },
};

export const getTracesSchema = {
  params: {
    type: "object",
    required: ["versionId"],
    properties: {
      versionId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          // documentId: { type: "string" },
          modelVersionId: { type: "string" },
          modelId: { type: "string" },
          selections: { type: "array" },
        },
      },
    },
  },
};

export const updateVersionMetaSchema = {
  params: {
    type: "object",
    required: ["versionId"],
    properties: {
      versionId: { type: "string" },
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
        documentId: { type: "string" },
        name: { type: "string" },
        createdAt: { type: "string" },
      },
    },
  },
};
