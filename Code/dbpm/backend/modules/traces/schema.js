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
    required: ["documentVersionId", "modelVersionId", "selections"],
    properties: {
      documentVersionId: { type: "string" },
      modelVersionId: { type: "string" },
      selections: { type: "array" },
    },
  },
};
