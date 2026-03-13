const documentMetaProperties = {
  id: { type: "string" },
  name: { type: "string" },
  latestVersionId: { type: "string" },
  versions: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        versionNumber: { type: "number" },
        restoredFrom: { type: ["string", "null"] },
        name: { type: "string" },
        filename: { type: "string" },
        createdAt: { type: "string" },
      },
    },
  },
};

export const createDocumentSchema = {
  body: {
    type: "object",
    required: ["projectId", "filename", "content"],
    properties: {
      projectId: { type: "string" },
      filename: { type: "string" },
      content: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        ...documentMetaProperties,
      },
    },
  },
};

export const updateMetaSchema = {
  params: {
    type: "object",
    required: ["documentId"],
    properties: {
      documentId: { type: "string" },
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
        ...documentMetaProperties,
      },
    },
  },
};

export const createVersionSchema = {
  body: {
    type: "object",
    required: ["documentId", "filename", "content"],
    properties: {
      documentId: { type: "string" },
      name: { type: "string" },
      filename: { type: "string" },
      content: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        documentId: { type: "string" },
        versionNumber: { type: "number" },
        restoredFrom: { type: ["string", "null"] },
        name: { type: "string" },
        filename: { type: "string" },
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

export const restoreDocumentSchema = {
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
        ...documentMetaProperties,
        deletedAt: { type: ["string", "null"] },
      },
    },
  },
};
