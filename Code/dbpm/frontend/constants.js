export const Constants = {
  MODE: "dev",
  EMPTY_MODEL: `<description xmlns="http://cpee.org/ns/description/1.0"/>`,
  MODEL_AI_UPDATE_TYPE: {
    REGENERATION_BY_SELECTIONS: "regeneration_by_selections",
    REGENERATION_BY_PROMPT: "regeneration_by_prompt",
  },
  MODEL_VERSION_EVENT_TYPE: {
    MANUAL_NEW_MODEL: "manual_new_model",
    MANUAL_SELECTIONS_UPDATE: "manual_selections_update",
    MANUAL_PROPERTIES_UPDATE: "manual_properties_update",
    MANUAL_FLOW_UPDATE: "manual_flow_update",
    MANUAL_NEW_VERSION_LATEST: "manual_new_version_latest",
    MANUAL_NEW_VERSION_REVERT: "manual_new_version_revert",
    AUTO_SELECTIONS_REANCHOR: "auto_selections_reanchor",
  },
};

// For backward compatibility with non-module scripts
if (typeof window !== "undefined") {
  window.Constants = Constants;
}
