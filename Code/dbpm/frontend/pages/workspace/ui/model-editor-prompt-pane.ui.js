import { createUI } from "../../../shared/utils/ui.js";
import { modelEditorStore, workspaceStore } from "../store/index.js";
import { modelService } from "../services/index.js";

const $promptPane = $("#promptPane");
const $promptInput = $("#promptInput");
const $promptActionsGroup = $("#promptActionsGroup");
const $sendPromptButton = $("#sendPromptButton");
const $clearPromptButton = $("#clearPromptButton");

function setPromptActionsEnabled(isEnabled) {
  if (isEnabled) {
    $promptActionsGroup.removeAttr("disabled");
  } else {
    $promptActionsGroup.attr("disabled", "disabled");
  }
}

function resetPrompt() {
  $promptInput.empty();
  setPromptActionsEnabled(false);
}

function setPromptPaneVisible(isVisible) {
  console.log("Setting prompt pane visibility to:", isVisible);
  if (isVisible) {
    $promptPane.show();
  } else {
    $promptPane.hide();
    resetPrompt();
  }
}

createUI({
  setup: () => {
    setPromptPaneVisible(false);
  },
  bindListeners: () => {
    $promptInput.on("input", () => {
      const promptText = $promptInput.text();
      setPromptActionsEnabled(!!promptText && promptText.trim() !== "");
    });

    $clearPromptButton.on("mousedown", (event) => {
      event.preventDefault();
      console.log("Clearing prompt input");
      resetPrompt();
    });

    $sendPromptButton.on("click", () => {
      const promptText = $promptInput.text();
      if (!promptText || promptText.trim() === "") {
        alert("Please enter a prompt.");
        return;
      }
      resetPrompt();
      modelService.generateModelByPrompt(promptText);
    });
  },
  subscribeStores: () => {
    workspaceStore.subscribe((state, { key, newValue }) => {
      switch (key) {
        case "editingModel":
          const hasEditingModel = workspaceStore.hasEditingModel();
          const isReadOnly = workspaceStore.isEditingModelReadOnly();
          console.log(
            "Editing model changed. hasEditingModel:",
            hasEditingModel,
            "isReadOnly:",
            isReadOnly,
          );
          console.log("!!!! visibility:", hasEditingModel && !isReadOnly);
          setPromptPaneVisible(hasEditingModel && !isReadOnly);
          break;
        default:
          break;
      }
    });
  },
});
