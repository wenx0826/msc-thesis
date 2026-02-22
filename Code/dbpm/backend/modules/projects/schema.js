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

export const getProjectsOverviewSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        projects: {
          type: "object",
          properties: {
            count: { type: "number" },
          },
        },
        documents: {
          type: "object",
          properties: {
            count: { type: "number" },
            averageWordsCount: { type: "number" },
            averageVersionsCount: { type: "number" },
          },
        },
        models: {
          type: "object",
          properties: {
            count: { type: "number" },
            averageSelectedWordsCount: { type: "number" },
            averageVersionsCount: { type: "number" },
          },
        },
      },
    },
  },
};

export const getProjectSchema = {
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
        id: { type: "string" },
        name: { type: "string" },
        createdAt: { type: "string" },
      },
    },
  },
};

export const getProjectOverviewWithDeletedSchema = {
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
        documents: {
          type: "object",
          properties: {
            count: { type: "number" },
            averageWordsCount: { type: "number" },
          },
        },
        models: {
          type: "object",
          properties: {
            count: { type: "number" },
            averageSelectedWordsCount: { type: "number" },
          },
        },
      },
    },
  },
};

export const getProjectComponentsSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string" },
    },
  },
  querystring: {
    type: "object",
    properties: {
      includeDeleted: { type: "boolean" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        documents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              createdAt: { type: "string" },
              deletedAt: { type: ["string", "null"] },
              versions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    documentId: { type: "string" },
                    name: { type: "string" },
                    createdAt: { type: "string" },
                  },
                },
              },
            },
          },
        },
        models: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              latestVersionId: { type: "string" },
              name: { type: "string" },
              createdAt: { type: "string" },
              deletedAt: { type: ["string", "null"] },
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
              documentId: { type: "string" },
              documentVersionIds: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

export const getProjectComponentsStatsSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string" },
    },
  },
  querystring: {
    type: "object",
    properties: {
      includeDeleted: { type: "boolean" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        documents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              latestVersionId: { type: "string" },
              name: { type: "string" },
              createdAt: { type: "string" },
              deletedAt: { type: ["string", "null"] },
              versions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    wordsCount: { type: "number" },
                    createdAt: { type: "string" },
                  },
                },
              },
            },
          },
        },
        models: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              latestVersionId: { type: "string" },
              name: { type: "string" },
              createdAt: { type: "string" },
              deletedAt: { type: ["string", "null"] },
              versions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    createdAt: { type: "string" },
                    averageSelectedWordsCount: { type: "number" },
                  },
                },
              },
              documentId: { type: "string" },
              documentVersionIds: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

export const updateProjectSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string" },
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
