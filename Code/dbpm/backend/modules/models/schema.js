export const createModelSchema = {
  body: {
    type: "object",
    required: ["projectId", "modelData", "trace"],
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
  },
  response: {
    200: {
      type: "object",
      properties: {
        model: {
          type: "object",
          properties: {
            id: { type: "string" },
            latestVersionId: { type: "string" },
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

export const getModelDataSchema = {
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
        type: "object",
        properties: {
          selections: { type: "array" },
        },
      },
      type: { type: "string" },
    },
  },
};

export const updateModelDataSchema = {
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
    },
  },
};
