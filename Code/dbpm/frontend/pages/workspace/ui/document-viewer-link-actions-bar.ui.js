import { createUI } from "../../../shared/utils/ui.js";
import { Constants } from "../../../constants.js";
import {
  documentViewerStore,
  workspaceStore,
} from "../store/index.js";
import { modelService } from "../services/index.js";

const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;
const MODEL_GENERATION_TARGET = Constants.MODEL_GENERATION_TARGET;
const MODEL_GENERATION_TARGET_VALUES = new Set(
  Object.values(MODEL_GENERATION_TARGET),
);
const $addSelectionsButton = $("#addSelectionsButton");
const $generateModelButton = $("#generateModelButton");
const $regenerateModelButton = $("#regenerateModelButton");
const $generationButtons = $generateModelButton.add($regenerateModelButton);

function resolveGenerationTargetFromButton(element) {
  const target = element?.dataset?.target;
  if (MODEL_GENERATION_TARGET_VALUES.has(target)) {
    return target;
  }
  console.warn(
    "Unknown model generation target on button, falling back to NEW_MODEL:",
    target,
  );
  return MODEL_GENERATION_TARGET.NEW_MODEL;
}

function applyActionButtonsState() {
  const isDraftMode =
    workspaceStore.isEditingModelDraft() && modelService.hasPendingNewModelDraft();
  if (isDraftMode) {
    $generationButtons.prop("disabled", true);
    $addSelectionsButton.prop("disabled", true);
    return;
  }

  const hasEditingModel = workspaceStore.hasEditingModel();
  const hasSelectionChanged = !!documentViewerStore.getHasSelectionChanged();

  if (hasEditingModel) {
    $generateModelButton.prop("disabled", true);
    // Keep regeneration condition simple: enable when editingModel.id exists.
    $regenerateModelButton.prop("disabled", !workspaceStore.getEditingModelId());
    // Apply stays enabled only for pending text changes or temporary selections.
    $addSelectionsButton.prop("disabled", !hasSelectionChanged);
    return;
  }

  const isEnabled = hasSelectionChanged;
  $generateModelButton.prop("disabled", !isEnabled);
  $regenerateModelButton.prop("disabled", true);
  $addSelectionsButton.prop("disabled", true);
}

createUI({
  setup: () => {
    applyActionButtonsState();
  },
  bindListeners: () => {
    $addSelectionsButton.on("click", () => {
      modelService.updateEditingVersion(
        MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
      );
    });

    $generationButtons.on("click", async (event) => {
      const target = resolveGenerationTargetFromButton(event.currentTarget);
      $(event.currentTarget).prop("disabled", true);
      try {
        await modelService.generateModelBySelections(target);
      } finally {
        applyActionButtonsState();
      }
    });
  },
  subscribeStores: () => {
    documentViewerStore.subscribe((_, { key }) => {
      switch (key) {
        case "hasSelectionChanged":
          applyActionButtonsState();
          break;
        default:
          break;
      }
    });

    workspaceStore.subscribe((_, { key }) => {
      switch (key) {
        case "editingModel": {
          applyActionButtonsState();
          break;
        }
        default:
          break;
      }
    });
  },
});
