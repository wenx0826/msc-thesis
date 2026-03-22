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

const versionUpdateTypeSchema = {
  type: "string",
  enum: [
    "manual_update_selections",
    "manual_update_graph_properties_only",
    "manual_update_graph_changed",
    "regeneration_by_selections",
    "regeneration_by_prompt",
  ],
};

const versionCreateLinkSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentVersionId: { type: "string" },
    selections: selectionsSchema,
  },
  required: ["documentVersionId", "selections"],
};

export const createModelSchema = {
  body: {
    type: "object",
    properties: {
      projectId: { type: "string" },
      modelData: {
        type: "string",
      },
      link: {
        type: "object",
        properties: {
          documentVersionId: { type: "string" },
          selections: selectionsSchema,
        },
        required: ["documentVersionId", "selections"],
      },
    },
    required: ["projectId", "modelData", "link"],
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
                  modelId: { type: "string" },
                  versionNumber: { type: "number" },
                  restoredFrom: { type: ["string", "null"] },
                  name: { type: "string" },
                  selectedWordsCount: { type: "number" },
                  createdAt: { type: "string" },
                },
              },
            },
            documentId: { type: "string" },
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
        link: {
          type: "object",
          properties: {
            id: { type: "string" },
            documentVersionId: { type: "string" },
            documentId: { type: "string" },
            modelId: { type: "string" },
            modelVersionId: { type: "string" },
            selections: selectionsSchema,
          },
        },
      },
    },
  },
};

export const createVersionSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["modelId", "sourceVersionId"],
    properties: {
      mode: { type: "string", enum: ["copy", "payload"] },
      modelId: { type: "string" },
      sourceVersionId: { type: "string" },
      reason: { type: "string", enum: ["new_version", "revert"] },
      type: versionUpdateTypeSchema,
      modelData: { type: "string" },
      link: versionCreateLinkSchema,
    },
    allOf: [
      {
        if: {
          anyOf: [
            {
              required: ["mode"],
              properties: {
                mode: { const: "payload" },
              },
            },
            { required: ["modelData"] },
            { required: ["link"] },
          ],
        },
        then: {
          required: ["modelData", "link"],
          properties: {
            reason: { type: "string", enum: ["new_version"] },
          },
        },
      },
      {
        if: {
          required: ["mode"],
          properties: {
            mode: { const: "copy" },
          },
        },
        then: {
          properties: {
            reason: { type: "string", enum: ["new_version", "revert"] },
          },
        },
      },
    ],
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
                  modelId: { type: "string" },
                  versionNumber: { type: "number" },
                  restoredFrom: { type: ["string", "null"] },
                  name: { type: "string" },
                  selectedWordsCount: { type: "number" },
                  createdAt: { type: "string" },
                },
              },
            },
            documentId: { type: "string" },
          },
        },
        versionMeta: {
          type: "object",
          properties: {
            id: { type: "string" },
            modelId: { type: "string" },
            versionNumber: { type: "number" },
            restoredFrom: { type: ["string", "null"] },
            name: { type: "string" },
            selectedWordsCount: { type: "number" },
            createdAt: { type: "string" },
          },
        },
        link: {
          type: ["object", "null"],
          properties: {
            id: { type: "string" },
            documentId: { type: "string" },
            documentVersionId: { type: "string" },
            modelId: { type: "string" },
            modelVersionId: { type: "string" },
            selections: selectionsSchema,
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
      link: {
        type: ["object", "null"],
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          documentVersionId: { type: "string" },
          selections: selectionsSchema,
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
      link: {
        type: ["object", "null"],
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          documentVersionId: { type: "string" },
          selections: selectionsSchema,
        },
      },
    },
    required: ["type", "modelData"],
  },
  response: {
    200: {},
  },
};

export const updateSubprocessLinkSchema = {
  params: {
    type: "object",
    properties: {
      versionId: { type: "string" },
      taskId: { type: "string" },
    },
    required: ["versionId", "taskId"],
  },
  body: {
    type: "object",
    properties: {
      subprocessModelId: { type: ["string", "null"] },
    },
    required: ["subprocessModelId"],
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

export const restoreModelSchema = {
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
        latestVersionId: { type: "string" },
        createdAt: { type: "string" },
        deletedAt: { type: ["string", "null"] },
      },
    },
  },
};

export const createGenerationAttemptSchema = {
  body: {
    type: "object",
    required: ["projectId", "generationType", "generationInputMode", "result"],
    additionalProperties: false,
    properties: {
      projectId: { type: "string" },
      baseModelVersionId: { type: ["string", "null"] },
      resultModelVersionId: { type: ["string", "null"] },
      generationType: {
        type: "string",
        enum: ["new", "regeneration", "refinement"],
      },
      generationInputMode: {
        type: "string",
        enum: ["selection_only", "selection_with_prompt", "prompt"],
      },
      result: {
        type: "string",
        enum: [
          "accepted_new_model",
          "accepted_replace",
          "accepted_new_version",
          "declined",
        ],
      },
      prompt: { type: ["string", "null"] },
      selectedWordsCount: { type: ["integer", "null"] },
      selectedTextSimilarity: { type: ["number", "null"] },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        projectId: { type: "string" },
        generationType: { type: "string" },
        generationInputMode: { type: "string" },
        result: { type: "string" },
        createdAt: { type: "string" },
      },
    },
  },
};
