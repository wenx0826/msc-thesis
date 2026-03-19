import { createUI } from "../../../shared/utils/ui.js";
import { modelService } from "../services/index.js";

const $modelEditPromptInput = $("#modelEditPromptInput");
const $promptActionsGroup = $("#promptActionsGroup");
const $sendPromptButton = $("#sendPromptButton");
const $clearPromptButton = $("#clearPromptButton");

function getPromptInput() {
  return $modelEditPromptInput.val();
}

function getPromptText() {
  return getPromptInput().trim();
}

function syncPromptActionState() {
  $promptActionsGroup.prop("disabled", !getPromptInput());
  $sendPromptButton.prop("disabled", !getPromptText());
}

function clearPromptInput() {
  $modelEditPromptInput.val("");
  $promptActionsGroup.prop("disabled", true);
}

createUI({
  setup: () => {
    syncPromptActionState();
  },
  bindListeners: () => {
    $modelEditPromptInput.on("input", () => {
      syncPromptActionState();
    });

    $clearPromptButton.on("mousedown", (e) => {
      e.preventDefault(); // Prevent losing focus on the input
      clearPromptInput();
    });

    $sendPromptButton.on("click", async () => {
      const promptText = getPromptText();
      if (!promptText) {
        return;
      }
      clearPromptInput();
      await modelService.generateModelByPrompt(promptText);
    });
  },
  subscribeStores: () => {},
});
