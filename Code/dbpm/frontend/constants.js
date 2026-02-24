export const Constants = {
  MODE: "dev",
  EMPTY_MODEL: `<description xmlns="http://cpee.org/ns/description/1.0"/>`,
  MODEL_GENERATION_TARGET: {
    NEW_MODEL: "new_model",
    EDITING_MODEL: "editing_model",
  },
  MODEL_UPDATE_TYPE: {
    REGENERATION_BY_SELECTIONS: "regeneration_by_selections",
    REGENERATION_BY_PROMPT: "regeneration_by_prompt",
    MANUAL_UPDATE_SELECTIONS: "manual_update_selections",
    MANUAL_UPDATE_GRAPH_PROPERTIES_ONLY: "manual_update_graph_properties_only",
    MANUAL_UPDATE_GRAPH_CHANGED: "manual_update_graph_changed",
  },
};

// For backward compatibility with non-module scripts
if (typeof window !== "undefined") {
  window.Constants = Constants;
}
