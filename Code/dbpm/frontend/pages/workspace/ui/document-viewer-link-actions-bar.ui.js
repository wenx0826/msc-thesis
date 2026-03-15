import { createUI } from "../../../shared/utils/ui.js";
import { createMenu } from "../../../shared/utils/dom.js";
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
const $modelGenerationPrimaryButton = $("#modelGenerationPrimaryButton");
const $modelGenerationPrimaryLabel = $("#modelGenerationPrimaryLabel");
const $modelGenerationMenuButton = $("#modelGenerationMenuButton");
const $modelGenerationPromptDialog = $("#modelGenerationPromptDialog");
const $modelGenerationPromptForm = $("#modelGenerationPromptForm");
const $modelGenerationPromptTitle = $("#modelGenerationPromptTitle");
const $modelGenerationPromptHint = $("#modelGenerationPromptHint");
const $modelGenerationPromptInput = $("#modelGenerationPromptInput");
const $modelGenerationPromptError = $("#modelGenerationPromptError");
const $cancelModelGenerationPromptButton = $(
  "#cancelModelGenerationPromptButton",
);
const $submitModelGenerationPromptButton = $(
  "#submitModelGenerationPromptButton",
);
let isSubmittingPromptGeneration = false;

function getGenerationActionState() {
  const hasEditingModel = workspaceStore.hasEditingModel();
  const hasSelectionChanged = !!documentViewerStore.getHasSelectionChanged();
  const canGenerateNewModel = hasSelectionChanged;
  const canRegenerateModel = !!workspaceStore.getEditingModelId();
  const primaryTarget = hasEditingModel
    ? MODEL_GENERATION_TARGET.EDITING_MODEL
    : MODEL_GENERATION_TARGET.NEW_MODEL;

  return {
    hasEditingModel,
    hasSelectionChanged,
    canGenerateNewModel,
    canRegenerateModel,
    primaryTarget,
    isPrimaryEnabled:
      primaryTarget === MODEL_GENERATION_TARGET.EDITING_MODEL
        ? canRegenerateModel
        : canGenerateNewModel,
    hasAnyGenerationAction: canGenerateNewModel || canRegenerateModel,
  };
}

function setPrimaryGenerationAction(target) {
  const normalizedTarget =
    target === MODEL_GENERATION_TARGET.EDITING_MODEL
      ? MODEL_GENERATION_TARGET.EDITING_MODEL
      : MODEL_GENERATION_TARGET.NEW_MODEL;
  const label =
    normalizedTarget === MODEL_GENERATION_TARGET.EDITING_MODEL
      ? "Regenerate model"
      : "Generate new model";

  $modelGenerationPrimaryButton.attr("data-target", normalizedTarget);
  $modelGenerationPrimaryButton.attr("title", label);
  $modelGenerationPrimaryLabel.text(label);
}

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

function getPromptDialogText() {
  return String($modelGenerationPromptInput.val() || "").trim();
}

function getPromptDialogTarget() {
  return resolveGenerationTargetFromButton({
    dataset: {
      target: $modelGenerationPromptDialog.attr("data-target"),
    },
  });
}

function isGenerationTargetAvailable(target) {
  const isDraftMode =
    workspaceStore.isEditingModelDraft() &&
    modelService.hasPendingNewModelDraft();
  if (isDraftMode) {
    return false;
  }
  const { canGenerateNewModel, canRegenerateModel } = getGenerationActionState();
  return target === MODEL_GENERATION_TARGET.EDITING_MODEL
    ? canRegenerateModel
    : canGenerateNewModel;
}

function syncPromptDialogActionState() {
  const hasPrompt = !!getPromptDialogText();
  const isTargetAvailable = isGenerationTargetAvailable(getPromptDialogTarget());
  $submitModelGenerationPromptButton.prop(
    "disabled",
    !hasPrompt || isSubmittingPromptGeneration || !isTargetAvailable,
  );
  $cancelModelGenerationPromptButton.prop(
    "disabled",
    isSubmittingPromptGeneration,
  );
  $modelGenerationPromptInput.prop("disabled", isSubmittingPromptGeneration);
}

function resolvePromptDialogCopy(target) {
  if (target === MODEL_GENERATION_TARGET.EDITING_MODEL) {
    return {
      title: "Regenerate Model with Additional Prompt",
      hint: "Add extra instructions to guide regeneration from the selected text.",
      submitLabel: "Regenerate",
    };
  }
  return {
    title: "Generate New Model with Additional Prompt",
    hint: "Add extra instructions to guide generation from the selected text.",
    submitLabel: "Generate",
  };
}

function openPromptDialog(target = MODEL_GENERATION_TARGET.NEW_MODEL) {
  if (!$modelGenerationPromptDialog.length) {
    return;
  }
  const normalizedTarget = resolveGenerationTargetFromButton({
    dataset: { target },
  });
  const copy = resolvePromptDialogCopy(normalizedTarget);

  $modelGenerationPromptDialog.attr("data-target", normalizedTarget);
  $modelGenerationPromptTitle.text(copy.title);
  $modelGenerationPromptHint.text(copy.hint);
  $submitModelGenerationPromptButton.text(copy.submitLabel);
  $modelGenerationPromptError.text("");
  $modelGenerationPromptInput.val("");
  isSubmittingPromptGeneration = false;
  syncPromptDialogActionState();

  if (!$modelGenerationPromptDialog[0].open) {
    $modelGenerationPromptDialog[0].showModal();
  }
  setTimeout(() => {
    $modelGenerationPromptInput.trigger("focus");
  }, 0);
}

function closePromptDialog() {
  if (!$modelGenerationPromptDialog.length || isSubmittingPromptGeneration) {
    return;
  }
  $modelGenerationPromptDialog[0].close();
}

function disableGenerationControl() {
  $modelGenerationPrimaryButton.prop("disabled", true);
  $modelGenerationMenuButton.prop("disabled", true);
}

function buildGenerationActionsMenu() {
  const { canGenerateNewModel, canRegenerateModel } = getGenerationActionState();
  const menu = { "": [] };

  if (canRegenerateModel) {
    menu[""].push({
      label: "Regenerate model",
      function_call: triggerGenerationAction,
      text_icon: undefined,
      type: undefined,
      params: [MODEL_GENERATION_TARGET.EDITING_MODEL],
    });
  }

  if (canGenerateNewModel) {
    menu[""].push(
      {
        label: "Generate new model",
        function_call: triggerGenerationAction,
        text_icon: undefined,
        type: undefined,
        params: [MODEL_GENERATION_TARGET.NEW_MODEL],
      },
      {
        label: "Generate new model with additional prompt...",
        function_call: openPromptDialog,
        text_icon: undefined,
        type: undefined,
        params: [MODEL_GENERATION_TARGET.NEW_MODEL],
      },
    );
  }

  return menu[""].length > 0 ? menu : null;
}

function triggerGenerationAction(target, options = {}) {
  handleGenerationAction(target, options).catch((error) => {
    console.error("Failed to run generation action:", error);
    applyActionButtonsState();
  });
}

function applyActionButtonsState() {
  const isDraftMode =
    workspaceStore.isEditingModelDraft() && modelService.hasPendingNewModelDraft();
  if (isDraftMode) {
    disableGenerationControl();
    $addSelectionsButton.prop("disabled", true);
    return;
  }

  const {
    hasEditingModel,
    hasSelectionChanged,
    primaryTarget,
    isPrimaryEnabled,
    hasAnyGenerationAction,
  } = getGenerationActionState();

  setPrimaryGenerationAction(primaryTarget);

  $modelGenerationPrimaryButton.prop("disabled", !isPrimaryEnabled);
  $modelGenerationMenuButton.prop("disabled", !hasAnyGenerationAction);

  if (hasEditingModel) {
    // Apply stays enabled only for pending text changes or temporary selections.
    $addSelectionsButton.prop("disabled", !hasSelectionChanged);
  } else {
    $addSelectionsButton.prop("disabled", true);
  }
}

async function handleGenerationAction(target, options = {}) {
  disableGenerationControl();
  try {
    await modelService.generateModelBySelections(target, options);
  } finally {
    applyActionButtonsState();
  }
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

    $modelGenerationPrimaryButton.on("click", async (event) => {
      const target = resolveGenerationTargetFromButton(event.currentTarget);
      await handleGenerationAction(target);
    });

    $modelGenerationMenuButton.on("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if ($modelGenerationMenuButton.prop("disabled")) {
        return;
      }
      const menu = buildGenerationActionsMenu();
      if (!menu) {
        return;
      }
      createMenu(
        {
          target: event.currentTarget,
          stopPropagation: () => event.stopPropagation(),
        },
        menu,
      );
    });

    $modelGenerationPromptInput.on("input", () => {
      if ($modelGenerationPromptError.text()) {
        $modelGenerationPromptError.text("");
      }
      syncPromptDialogActionState();
    });

    $cancelModelGenerationPromptButton.on("click", () => {
      closePromptDialog();
    });

    $modelGenerationPromptForm.on("submit", async (event) => {
      event.preventDefault();
      const promptText = getPromptDialogText();
      if (!promptText) {
        $modelGenerationPromptError.text("Prompt is required.");
        syncPromptDialogActionState();
        return;
      }
      const target = getPromptDialogTarget();
      if (!isGenerationTargetAvailable(target)) {
        $modelGenerationPromptError.text(
          "This action is not currently available.",
        );
        syncPromptDialogActionState();
        return;
      }
      isSubmittingPromptGeneration = true;
      $modelGenerationPromptError.text("");
      syncPromptDialogActionState();
      try {
        const result = await modelService.generateModelBySelections(target, {
          additionalPrompt: promptText,
        });
        if (result) {
          $modelGenerationPromptDialog[0].close();
        } else {
          $modelGenerationPromptError.text(
            "Generation failed. Please try again.",
          );
        }
      } catch (error) {
        console.error("Failed to generate model with additional prompt:", error);
        $modelGenerationPromptError.text(
          "Generation failed. Please try again.",
        );
      } finally {
        isSubmittingPromptGeneration = false;
        syncPromptDialogActionState();
        applyActionButtonsState();
      }
    });

    $modelGenerationPromptDialog.on("click", (event) => {
      if (event.target === $modelGenerationPromptDialog[0]) {
        closePromptDialog();
      }
    });

    $modelGenerationPromptDialog.on("cancel", (event) => {
      if (isSubmittingPromptGeneration) {
        event.preventDefault();
      }
    });
  },
  subscribeStores: () => {
    documentViewerStore.subscribe((_, { key }) => {
      switch (key) {
        case "hasSelectionChanged":
          applyActionButtonsState();
          syncPromptDialogActionState();
          break;
        default:
          break;
      }
    });

    workspaceStore.subscribe((_, { key }) => {
      switch (key) {
        case "editingModel": {
          applyActionButtonsState();
          syncPromptDialogActionState();
          break;
        }
        default:
          break;
      }
    });
  },
});
