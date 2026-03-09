import { createUI } from "../../../shared/utils/ui.js";
import { modelService } from "../services/index.js";

const $promptInput = $("#promptInput");
const $promptActionsGroup = $("#promptActionsGroup");
const $sendPromptButton = $("#sendPromptButton");
const $clearPromptButton = $("#clearPromptButton");

function getPromptInput() {
  return $promptInput.val();
}

function getPromptText() {
  return getPromptInput().trim();
}

function syncPromptActionState() {
  $promptActionsGroup.prop("disabled", !getPromptInput());
  $sendPromptButton.prop("disabled", !getPromptText());
}

function clearPromptInput() {
  $promptInput.val("");
  $promptActionsGroup.prop("disabled", true);
}

createUI({
  setup: () => {
    syncPromptActionState();
  },
  bindListeners: () => {
    $promptInput.on("input", () => {
      syncPromptActionState();
    });

    $clearPromptButton.on("mousedown", (e) => {
      e.preventDefault(); // Prevent losing focus on the input
      clearPromptInput();
    });

    $sendPromptButton.on("click", () => {
      const promptText = getPromptText();
      modelService.generateModelByPrompt(promptText);
      clearPromptInput();
    });
  },
  subscribeStores: () => {},
});
