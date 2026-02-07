export const createModelSchema = {
  body: {
    type: "object",
    required: ["modelData", "trace"],
    properties: {
      modelData: {
        type: "string",
      },
      trace: {
        type: "object",
        properties: {
          documentId: { type: "string" },
          selections: {
            type: "array",
          },
        },
        required: ["documentId", "selections"],
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
            meta: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
            data: { type: "string" },
          },
        },
        trace: { type: "object" },
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
        timestamp: { type: "string" },
        documentId: { type: "string" },
        words: { type: "number" },
        data: { type: "object" },
      },
    },
  },
};

export const getModelDataSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  response: {
    200: { type: "object" },
  },
};

export const getAllModelsSchema = {
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
    properties: {
      modelData: { type: "string" },
      trace: {
        type: "object",
        properties: {
          prompt: { type: "string" },
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
