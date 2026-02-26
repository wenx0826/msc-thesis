export const createModelSchema = {
  body: {
    type: "object",
    properties: {
      projectId: { type: "string" },
      modelData: {
        type: "string",
      },
      trace: {
        type: "object",
        properties: {
          documentVersionId: { type: "string" },
          selections: {
            type: "array",
          },
        },
        required: ["documentVersionId", "selections"],
      },
    },
    required: ["projectId", "modelData", "trace"],
  },
  response: {
    200: {
      type: "object",
      properties: {
        modelMeta: {
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
                  createdAt: { type: "string" },
                },
              },
            },
            // meta: {
            //   type: "object",
            //   properties: {
            //     id: { type: "string" },
            //     name: { type: "string" },
            //   },
            // },
            // data: { type: "string" },
          },
        },
        trace: {
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
  },
};

export const updateMetaSchema = {
  params: {
    type: "object",
    properties: {
      modelId: { type: "string" },
    },
    required: ["modelId"],
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
        name: { type: "string" },
        createdAt: { type: "string" },
      },
    },
  },
};

export const getModelSchema = {
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
        data: { type: "string" },
      },
    },
  },
};

export const getVersionDataSchema = {
  params: {
    type: "object",
    required: ["versionId"],
    properties: {
      versionId: { type: "string" },
    },
  },
  response: {
    200: { type: "string" },
  },
};

export const updateModelSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  body: {
    type: "object",
    required: ["modelData"],
    properties: {
      modelData: { type: "string" },
      trace: {
        type: ["object", "null"],
        properties: {
          selections: { type: "array" },
        },
      },
      type: { type: "string" },
    },
  },
};

export const updateVersionSchema = {
  params: {
    type: "object",
    properties: {
      versionId: { type: "string" },
    },
    required: ["versionId"],
  },
  body: {
    type: "object",
    properties: {
      type: { type: "string" },
      modelMeta: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
      modelData: { type: "string" },
      trace: {
        type: ["object", "null"],
        properties: {
          selections: { type: "array" },
        },
      },
    },
    required: ["type", "modelData"],
  },
  response: {
    200: {},
  },
};
