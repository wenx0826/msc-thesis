import { createUI } from "../../../shared/utils/ui.js";
import { createMenu } from "../../../shared/utils/dom.js";
import { Constants } from "../../../constants.js";
import {
  documentViewerStore,
  modelEditorStore,
  workspaceStore,
} from "../store/index.js";
import { modelService } from "../services/index.js";

const MODEL_VERSION_CHANGE_TYPE = Constants.MODEL_VERSION_CHANGE_TYPE;
const GENERATION_TYPE = {
  NEW: "new",
  REGENERATION: "regeneration",
};

const $generationDefaultButton = $("#generationDefaultButton");
const $generationMenuButton = $("#generationMenuButton");
const $applyLinkChangesButton = $("#applyLinkChangesButton");
const $generationButtons = $generationDefaultButton.add($generationMenuButton);
const $promptDialog = $("#modelGenerationPromptDialog");
const promptDialog = $promptDialog[0];
const $promptForm = $("#modelGenerationPromptForm");
const $dialogTitle = $promptDialog.find(".dialog-title");
const $promptInput = $("#modelGenerationPromptInput");
const $cancelModelGenerationPromptButton = $(
  "#cancelModelGenerationPromptButton",
);
const $submitModelGenerationPromptButton = $(
  "#submitModelGenerationPromptButton",
);

const GENERATION_UI_TEXT = {
  [GENERATION_TYPE.REGENERATION]: {
    action: {
      primaryLabel: "Regenerate model",
      menuButtonTitle: "More regeneration actions",
    },
    dialog: {
      title: "Regenerate Model with Instructions",
      submitLabel: "Regenerate",
    },
  },
  [GENERATION_TYPE.NEW]: {
    action: {
      primaryLabel: "Generate new model",
      menuButtonTitle: "More generation actions",
    },
    dialog: {
      title: "Generate New Model with Instructions",
      submitLabel: "Generate",
    },
  },
};

function getActiveGenerationType() {
  const editingModel = workspaceStore.getEditingModel();
  if (!editingModel) {
    return GENERATION_TYPE.NEW;
  }
  return editingModel.isLatest ? GENERATION_TYPE.REGENERATION : null;
}

function isGenerationActionBusy() {
  return modelEditorStore.getIsGenerating();
}

function isGenerationActionLocked() {
  return workspaceStore.hasPendingNewModelDraft() || isGenerationActionBusy();
}

function isGenerationActionEnabled(generationType = getActiveGenerationType()) {
  if (!generationType) {
    return false;
  }
  if (generationType === GENERATION_TYPE.REGENERATION) {
    return true;
  }
  return documentViewerStore.getHasSelectionChanged();
}

function setApplyLinkChangesButtonEnabled(enabled) {
  $applyLinkChangesButton.prop("disabled", !enabled);
}

function setGenerationButtonsEnabled(enabled) {
  $generationButtons.prop("disabled", !enabled);
}

function disableGenerationControl() {
  setGenerationButtonsEnabled(false);
}

function syncGenerationButtonContent(
  generationType = getActiveGenerationType(),
) {
  const resolvedGenerationType = generationType || GENERATION_TYPE.NEW;
  const buttonUiText = GENERATION_UI_TEXT[resolvedGenerationType].action;
  $generationDefaultButton
    .text(buttonUiText.primaryLabel)
    .attr("title", buttonUiText.primaryLabel);
  $generationMenuButton.attr("title", buttonUiText.menuButtonTitle);
}

function buildGenerationActionsMenu(
  generationType = getActiveGenerationType(),
) {
  if (!generationType) {
    return null;
  }

  const actionsUiText = GENERATION_UI_TEXT[generationType].action;
  return {
    "": [
      {
        label: actionsUiText.primaryLabel,
        function_call: triggerGeneration,
        text_icon: undefined,
        type: undefined,
        params: [],
      },
      {
        label: `${actionsUiText.primaryLabel} with instructions...`,
        function_call: openPromptDialog,
        text_icon: undefined,
        type: undefined,
        params: [],
      },
    ],
  };
}

function applyActionButtonsState() {
  const activeGenerationType = getActiveGenerationType();
  const hasEditingModel = workspaceStore.hasEditingModel();
  const hasSelectionChanged = documentViewerStore.getHasSelectionChanged();

  syncGenerationButtonContent(activeGenerationType);

  if (isGenerationActionLocked()) {
    disableGenerationControl();
    setApplyLinkChangesButtonEnabled(false);
    return;
  }

  setGenerationButtonsEnabled(isGenerationActionEnabled(activeGenerationType));
  setApplyLinkChangesButtonEnabled(hasEditingModel && hasSelectionChanged);
}

async function handleGeneration(additionalPrompt = "") {
  disableGenerationControl();
  try {
    await modelService.generateModelBySelections(additionalPrompt);
  } finally {
    applyActionButtonsState();
  }
}

function triggerGeneration(additionalPrompt = "") {
  void handleGeneration(additionalPrompt);
}

function openGenerationMenu(event) {
  event.preventDefault();
  event.stopPropagation();

  const $button = $(event.currentTarget);
  if ($button.prop("disabled")) {
    return;
  }

  const activeGenerationType = getActiveGenerationType();
  const menu = buildGenerationActionsMenu(activeGenerationType);
  if (!menu) {
    return;
  }

  createMenu(event, menu, {
    noIcons: true,
  });
}

function getPromptText() {
  return $promptInput.val().trim();
}

function syncPromptDialogActionState() {
  $submitModelGenerationPromptButton.prop("disabled", !getPromptText());
}

function openPromptDialog() {
  const activeGenerationType = getActiveGenerationType() || GENERATION_TYPE.NEW;
  const dialogUiText = GENERATION_UI_TEXT[activeGenerationType].dialog;
  $dialogTitle.text(dialogUiText.title);
  $submitModelGenerationPromptButton.text(dialogUiText.submitLabel);
  $promptInput.val("");
  syncPromptDialogActionState();

  promptDialog.showModal();

  setTimeout(() => {
    $promptInput.trigger("focus");
  }, 0);
}

function closePromptDialog() {
  if (promptDialog?.open) {
    promptDialog.close();
  }
}

createUI({
  setup: () => {},
  bindListeners: () => {
    $applyLinkChangesButton.on("click", () => {
      modelService.updateEditingVersion(
        MODEL_VERSION_CHANGE_TYPE.MANUAL_SELECTIONS_UPDATE,
      );
    });

    $generationDefaultButton.on("click", () => {
      triggerGeneration();
    });

    $generationMenuButton.on("mousedown", openGenerationMenu);

    $promptInput.on("input", () => {
      syncPromptDialogActionState();
    });

    $cancelModelGenerationPromptButton.on("click", () => {
      closePromptDialog();
    });

    $promptForm.on("submit", (event) => {
      event.preventDefault();

      const promptText = getPromptText();
      if (!promptText) {
        return;
      }
      closePromptDialog();
      triggerGeneration(promptText);
    });

    $promptDialog.on("click", (event) => {
      if (event.target === promptDialog) {
        closePromptDialog();
      }
    });
  },
  subscribeStores: () => {
    documentViewerStore.subscribe(({ key }) => {
      if (key === "hasSelectionChanged") {
        applyActionButtonsState();
      }
    });

    workspaceStore.subscribe(({ key }) => {
      if (key === "editingModel") {
        applyActionButtonsState();
      }
    });

    modelEditorStore.subscribe(({ key }) => {
      if (key === "isGenerating") {
        applyActionButtonsState();
      }
    });
  },
});
