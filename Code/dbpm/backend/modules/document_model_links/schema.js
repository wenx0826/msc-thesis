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
  additionalProperties: false,
  properties: {
    backgroundColor: { type: "string" },
  },
};
const selectionReviewStatusSchema = {
  type: "string",
  enum: ["none", "pending", "notified"],
};

const selectionSchema = {
  type: "object",
  required: ["textPosition", "textQuote"],
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    textPosition: textPositionSchema,
    textQuote: textQuoteSchema,
    style: selectionStyleSchema,
    reviewStatus: selectionReviewStatusSchema,
  },
};

const selectionsSchema = {
  type: "array",
  items: selectionSchema,
};

const selectionCreateBodySchema = {
  type: "object",
  required: ["textPosition", "textQuote"],
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    textPosition: textPositionSchema,
    textQuote: textQuoteSchema,
    style: selectionStyleSchema,
    reviewStatus: selectionReviewStatusSchema,
  },
};

const selectionUpdateBodySchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    textPosition: {
      type: "object",
      additionalProperties: false,
      properties: {
        start: { type: "number" },
        end: { type: "number" },
      },
    },
    textQuote: {
      type: "object",
      additionalProperties: false,
      properties: {
        exact: { type: "string" },
        prefix: { type: "string" },
        suffix: { type: "string" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        backgroundColor: { type: "string" },
      },
    },
    reviewStatus: selectionReviewStatusSchema,
  },
};

const selectionParamsSchema = {
  type: "object",
  required: ["linkId", "selectionId"],
  properties: {
    linkId: { type: "string" },
    selectionId: { type: "string" },
  },
};

export const updateLinkSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["selections"],
    properties: {
      selections: selectionsSchema,
    },
  },
};

export const createSelectionSchema = {
  params: {
    type: "object",
    required: ["linkId"],
    properties: {
      linkId: { type: "string" },
    },
  },
  body: selectionCreateBodySchema,
};

export const updateSelectionSchema = {
  params: selectionParamsSchema,
  body: selectionUpdateBodySchema,
};

export const deleteSelectionSchema = {
  params: selectionParamsSchema,
};

export const getLatestLinksByDocumentVersionSchema = {
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

export const getLatestLinkByModelVersionSchema = {
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
