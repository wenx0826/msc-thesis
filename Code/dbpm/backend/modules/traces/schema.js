const textPositionSchema = {
  type: "object",
  required: ["start", "end"],
  additionalProperties: false,
  properties: {
    start: { type: "number" },
    end: { type: "number" },
  },
};

const textQuoteSchema = {
  type: "object",
  required: ["exact"],
  additionalProperties: false,
  properties: {
    exact: { type: "string" },
    prefix: { type: "string" },
    suffix: { type: "string" },
  },
};

const selectionStyleSchema = {
  type: "object",
  required: ["backgroundColor"],
  additionalProperties: false,
  properties: {
    backgroundColor: { type: "string" },
  },
};

const selectionSchema = {
  type: "object",
  required: ["id", "textPosition", "textQuote", "style"],
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    textPosition: textPositionSchema,
    textQuote: textQuoteSchema,
    style: selectionStyleSchema,
  },
};

const selectionsSchema = {
  type: "array",
  items: selectionSchema,
};

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
      selections: selectionsSchema,
    },
  },
};

export const getLatestTracesByDocumentVersionSchema = {
  params: {
    type: "object",
    required: ["versionId"],
    properties: {
      versionId: { type: "string" },
    },
  },
  querystring: {
    type: "object",
    properties: {
      includeDeletedModels: { type: "boolean" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          documentVersionId: { type: "string" },
          documentId: { type: "string" },
          modelVersionId: { type: "string" },
          modelId: { type: "string" },
          modelName: { type: ["string", "null"] },
          selections: selectionsSchema,
          createdAt: { type: "string" },
        },
      },
    },
  },
};

export const getLatestTraceByModelVersionSchema = {
  params: {
    type: "object",
    required: ["modelVersionId"],
    properties: {
      modelVersionId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        documentVersionId: { type: "string" },
        documentId: { type: "string" },
        modelVersionId: { type: "string" },
        modelId: { type: "string" },
        modelName: { type: ["string", "null"] },
        selections: selectionsSchema,
        createdAt: { type: "string" },
      },
    },
  },
};
