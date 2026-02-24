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
    minProperties: 1,
    additionalProperties: false,
    properties: {
      documentVersionId: { type: "string" },
      modelVersionId: { type: "string" },
      selections: { type: "array" },
    },
  },
};
