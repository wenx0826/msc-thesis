export const updateTraceSchema = {
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
      documentId: { type: "string" },
      modelId: { type: "string" },
      selections: { type: "array" },
    },
  },
};
