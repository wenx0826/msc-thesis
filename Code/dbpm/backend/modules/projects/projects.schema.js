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
        generatedModelCount: { type: "number" },
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

export const getDocumentCountSchema = {
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

export const getModelCountSchema = {
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
