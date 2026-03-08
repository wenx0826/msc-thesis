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
        documentsMeta: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              latestVersionId: { type: "string" },
              createdAt: { type: "string" },
              deletedAt: { type: ["string", "null"] },
              versions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    documentId: { type: "string" },
                    versionNumber: { type: "number" },
                    name: { type: "string" },
                    filename: { type: "string" },
                    createdAt: { type: "string" },
                  },
                },
              },
            },
          },
        },
        modelsMeta: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              latestVersionId: { type: "string" },
              createdAt: { type: "string" },
              deletedAt: { type: ["string", "null"] },
              versions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    modelId: { type: "string" },
                    versionNumber: { type: "number" },
                    name: { type: "string" },
                    createdAt: { type: "string" },
                  },
                },
              },
              documentId: { type: "string" },
            },
          },
        },
        subprocessLinks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              modelVersionId: { type: "string" },
              modelId: { type: "string" },
              taskId: { type: "string" },
              subprocessModelId: { type: "string" },
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
                    versionNumber: { type: "number" },
                    name: { type: "string" },
                    filename: { type: "string" },
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
              name: { type: "string" },
              latestVersionId: { type: "string" },
              createdAt: { type: "string" },
              deletedAt: { type: ["string", "null"] },
              versions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    versionNumber: { type: "number" },
                    name: { type: "string" },
                    selectedWordsCount: { type: "number" },
                    createdAt: { type: "string" },
                    updatesStats: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          count: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
              documentId: { type: "string" },
              updatesStats: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    count: { type: "number" },
                  },
                },
              },
            },
          },
        },
        modelUpdateEventsSummary: {
          type: "object",
          properties: {
            totalCount: { type: "number" },
            byType: {
              type: "object",
              additionalProperties: { type: "number" },
            },
            byVersionLevel: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  versionNumber: { type: "number" },
                  totalCount: { type: "number" },
                  byType: {
                    type: "object",
                    additionalProperties: { type: "number" },
                  },
                },
              },
            },
            byModel: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  modelId: { type: "string" },
                  modelName: { type: "string" },
                  deletedAt: { type: ["string", "null"] },
                  totalCount: { type: "number" },
                  byType: {
                    type: "object",
                    additionalProperties: { type: "number" },
                  },
                  byVersionLevel: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        versionNumber: { type: "number" },
                        totalCount: { type: "number" },
                        byType: {
                          type: "object",
                          additionalProperties: { type: "number" },
                        },
                      },
                    },
                  },
                },
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

export const deleteProjectSchema = {
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
        message: { type: "string" },
      },
    },
  },
};
