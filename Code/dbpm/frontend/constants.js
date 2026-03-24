export const Constants = {
  MODE: "dev",
  EMPTY_MODEL: `<description xmlns="http://cpee.org/ns/description/1.0"/>`,
  MODEL_VERSION_CHANGE_TYPE: {
    MANUAL_SELECTIONS_UPDATE: "manual_selections_update",
    MANUAL_PROPERTIES_UPDATE: "manual_properties_update",
    MANUAL_STRUCTURE_UPDATE: "manual_structure_update",
    MANUAL_NEW_VERSION_LATEST: "manual_new_version_latest",
    MANUAL_NEW_VERSION_RESTORE: "manual_new_version_restore",
    AUTO_SELECTIONS_REANCHOR: "auto_selections_reanchor",
    AI_REGENERATION: "regeneration",
    AI_REFINEMENT: "refinement",
  },
};

// For backward compatibility with non-module scripts
if (typeof window !== "undefined") {
  window.Constants = Constants;
}
