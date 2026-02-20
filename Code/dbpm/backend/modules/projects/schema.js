export const createProjectSchema = {
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

export const getProjectsSchema = {
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          documentsCount: { type: "number" },
          modelsCount: { type: "number" },
          createdAt: { type: "string" },
        },
      },
    },
  },
};

export const getProjectSchema = {
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
      },
    },
  },
};

export const getDocumentsSchema = {
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
          documentVersionId: { type: "string" },
          documentId: { type: "string" },
          projectId: { type: "string" },
          name: { type: "string" },
        },
      },
    },
  },
};

export const getModelsSchema = {
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
          modelVersionId: { type: "string" },
          modelId: { type: "string" },
          documentId: { type: "string" },
          name: { type: "string" },
        },
      },
    },
  },
};

export const updateProjectSchema = {
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
    properties: {
      name: { type: "string" },
      generatedModelCount: { type: "number" },
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
