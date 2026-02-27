import { createUI } from "../../../shared/utils/ui.js";
import { Constants } from "../../../constants.js";
import { documentViewerStore, workspaceStore } from "../store/index.js";
import { modelService } from "../services/index.js";

const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;
const MODEL_GENERATION_TARGET = Constants.MODEL_GENERATION_TARGET;
const MODEL_GENERATION_TARGET_VALUES = new Set(
  Object.values(MODEL_GENERATION_TARGET),
);

const $addSelectionsButton = $("#addSelectionsButton");
const $generateModelButton = $("#generateModelButton");

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

function applyEditingModelState(editingModel = {}) {
  const hasEditingModel = !!editingModel.id;
  if (hasEditingModel) {
    $addSelectionsButton.show();
    $generateModelButton.attr(
      "data-target",
      MODEL_GENERATION_TARGET.EDITING_MODEL,
    );
    $generateModelButton.text("Regenerate model");
    return;
  }

  $addSelectionsButton.hide();
  $generateModelButton.attr("data-target", MODEL_GENERATION_TARGET.NEW_MODEL);
  $generateModelButton.text("Generate new model");
}

function applySelectionChangedState(hasSelectionChanged) {
  const isEnabled = !!hasSelectionChanged;
  $generateModelButton.prop("disabled", !isEnabled);
  $addSelectionsButton.prop("disabled", !isEnabled);
}

createUI({
  setup: () => {
    applyEditingModelState(workspaceStore.getEditingModel());
    applySelectionChangedState(documentViewerStore.getHasSelectionChanged());
  },
  bindListeners: () => {
    $addSelectionsButton.on("click", () => {
      modelService.updateActiveModel(
        MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
      );
    });

    $generateModelButton.on("click", (event) => {
      const target = resolveGenerationTargetFromButton(event.currentTarget);
      modelService.generateModelBySelections(target);
    });
  },
  subscribeStores: () => {
    documentViewerStore.subscribe((state, { key, newValue }) => {
      switch (key) {
        case "hasSelectionChanged":
          applySelectionChangedState(newValue);
          break;
        default:
          break;
      }
    });

    workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "editingModel": {
          const oldHasEditingModel = !!oldValue?.id;
          const newHasEditingModel = !!newValue?.id;
          if (oldHasEditingModel === newHasEditingModel) {
            break;
          }
          applyEditingModelState(newValue);
          break;
        }
        default:
          break;
      }
    });
  },
});
