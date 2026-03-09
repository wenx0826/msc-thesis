import { createUI } from "../../../shared/utils/ui.js";
import { Constants } from "../../../constants.js";
import { modelEditorStore, workspaceStore } from "../store/index.js";
import { modelService } from "../services/index.js";

const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;

const $regeneratedModelActionBar = $("#regeneratedModelActionBar");
const $viewOriginalModelButton = $("#viewOriginalModelButton");
const $viewRegeneratedModelButton = $("#viewRegeneratedModelButton");
const $revertOriginalModelButton = $("#revertPrevModelButton");
const $replaceModelButton = $("#replaceModelButton");
const $saveNewModelButton = $("#saveNewModelButton");

let regenerationPreviewState = null;
let isApplyingRegenerationView = false;
let isRegenerationDecisionClickLocked = false;
let regenerationActionBarHintTimeoutId = null;
let regenerationDecisionAlertTimeoutId = null;

const REGENERATION_LOCKED_POINTER_EVENTS = [
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "contextmenu",
];
const REGENERATION_ACTION_BAR_HINT_CLASS = "regeneration-click-hint";

function isRegenerationUpdateType(updateType) {
  return [
    MODEL_UPDATE_TYPE.REGENERATION_BY_PROMPT,
    MODEL_UPDATE_TYPE.REGENERATION_BY_SELECTIONS,
  ].includes(updateType);
}

function getEditingModelContext() {
  const { id, versionId } = workspaceStore.getEditingModel() || {};
  return {
    modelId: id || null,
    modelVersionId: versionId || null,
  };
}

function isRegenerationPreviewContextCurrent(
  preview = regenerationPreviewState,
) {
  if (!preview?.modelId || !preview?.modelVersionId) {
    return false;
  }

  const currentContext = getEditingModelContext();
  return (
    currentContext.modelId === preview.modelId &&
    currentContext.modelVersionId === preview.modelVersionId
  );
}

function setRegenerationDecisionClickLock(isLocked) {
  const shouldLock = Boolean(isLocked);
  isRegenerationDecisionClickLocked = shouldLock;
  if (!shouldLock) {
    $regeneratedModelActionBar.removeClass(REGENERATION_ACTION_BAR_HINT_CLASS);
    if (regenerationActionBarHintTimeoutId) {
      clearTimeout(regenerationActionBarHintTimeoutId);
      regenerationActionBarHintTimeoutId = null;
    }
    if (regenerationDecisionAlertTimeoutId) {
      clearTimeout(regenerationDecisionAlertTimeoutId);
      regenerationDecisionAlertTimeoutId = null;
    }
  }
}

function showRegenerationActionBarHint() {
  $regeneratedModelActionBar.removeClass(REGENERATION_ACTION_BAR_HINT_CLASS);
  // Restart transition if user clicks outside repeatedly.
  void $regeneratedModelActionBar.get(0)?.offsetWidth;
  $regeneratedModelActionBar.addClass(REGENERATION_ACTION_BAR_HINT_CLASS);

  if (regenerationActionBarHintTimeoutId) {
    clearTimeout(regenerationActionBarHintTimeoutId);
  }
  regenerationActionBarHintTimeoutId = setTimeout(() => {
    $regeneratedModelActionBar.removeClass(REGENERATION_ACTION_BAR_HINT_CLASS);
    regenerationActionBarHintTimeoutId = null;
  }, 900);
}

function scheduleRegenerationDecisionAlert() {
  if (
    regenerationDecisionAlertTimeoutId ||
    !isRegenerationDecisionClickLocked
  ) {
    return;
  }

  const showAlert = () => {
    regenerationDecisionAlertTimeoutId = null;
    if (!isRegenerationDecisionClickLocked) {
      return;
    }
    alert("Please use the regeneration action bar to continue.");
  };

  const scheduleAfterPaint = () => {
    regenerationDecisionAlertTimeoutId = setTimeout(showAlert, 0);
  };

  if (
    typeof window !== "undefined" &&
    typeof window.requestAnimationFrame === "function"
  ) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scheduleAfterPaint);
    });
    return;
  }

  scheduleAfterPaint();
}

function shouldAllowEventDuringRegenerationDecision(eventTarget) {
  const actionBarElement = $regeneratedModelActionBar[0];
  return actionBarElement?.contains(eventTarget) ?? false;
}

function onRegenerationDecisionPointerEvent(event) {
  if (!isRegenerationDecisionClickLocked) {
    return;
  }

  if (shouldAllowEventDuringRegenerationDecision(event.target)) {
    return;
  }

  if (event.type === "click") {
    showRegenerationActionBarHint();
    scheduleRegenerationDecisionAlert();
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function serializeXmlNode(node) {
  if (!node) {
    return null;
  }
  return new XMLSerializer().serializeToString(node);
}

function setRegenerationPreviewView(view) {
  if (!regenerationPreviewState) {
    return;
  }
  if (!isRegenerationPreviewContextCurrent(regenerationPreviewState)) {
    regenerationPreviewState = null;
    return;
  }
  const normalizedView = view === "original" ? "original" : "regenerated";
  if (regenerationPreviewState.view === normalizedView) {
    return;
  }

  const nextDataXml =
    normalizedView === "original"
      ? regenerationPreviewState.originalDataXml
      : regenerationPreviewState.regeneratedDataXml;
  if (!nextDataXml) {
    return;
  }

  regenerationPreviewState = {
    ...regenerationPreviewState,
    view: normalizedView,
  };
  isApplyingRegenerationView = true;
  modelEditorStore.setData(nextDataXml);
  isApplyingRegenerationView = false;
}

function applyRegenerationActionBar(updateType) {
  const preview = regenerationPreviewState;
  const hasCurrentPreviewContext = isRegenerationPreviewContextCurrent(preview);
  if (
    !isRegenerationUpdateType(updateType) ||
    !preview ||
    !hasCurrentPreviewContext
  ) {
    if (preview && !hasCurrentPreviewContext) {
      regenerationPreviewState = null;
    }
    $regeneratedModelActionBar.hide();
    setRegenerationDecisionClickLock(false);
    return;
  }

  const isViewingOriginal = preview.view === "original";
  $viewOriginalModelButton.prop("disabled", isViewingOriginal);
  $viewRegeneratedModelButton.prop("disabled", !isViewingOriginal);
  $revertOriginalModelButton.prop("disabled", false);
  $replaceModelButton.prop("disabled", isViewingOriginal);
  $saveNewModelButton.prop("disabled", isViewingOriginal);
  $regeneratedModelActionBar.show();
  setRegenerationDecisionClickLock(true);
}

createUI({
  setup: () => {
    applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
  },
  bindListeners: () => {
    REGENERATION_LOCKED_POINTER_EVENTS.forEach((eventName) => {
      document.addEventListener(
        eventName,
        onRegenerationDecisionPointerEvent,
        true,
      );
    });

    $viewOriginalModelButton.on("click", () => {
      setRegenerationPreviewView("original");
      applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
    });

    $viewRegeneratedModelButton.on("click", () => {
      setRegenerationPreviewView("regenerated");
      applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
    });

    $replaceModelButton.on("click", async () => {
      const preview = regenerationPreviewState;
      if (!preview || !isRegenerationPreviewContextCurrent(preview)) {
        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
        return;
      }
      if (preview.view !== "regenerated") {
        setRegenerationPreviewView("regenerated");
      }
      try {
        await modelService.updateEditingVersion(preview.updateType, {
          expectedModelId: preview.modelId,
          expectedModelVersionId: preview.modelVersionId,
        });
        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
      } catch (error) {
        console.error("Failed to keep regenerated model:", error);
        alert("Failed to keep regenerated model.");
      }
    });

    $saveNewModelButton.on("click", async () => {
      const preview = regenerationPreviewState;
      if (!preview || !isRegenerationPreviewContextCurrent(preview)) {
        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
        return;
      }

      const {
        modelId,
        modelVersionId,
        regeneratedDataXml,
        updateType: regenerationUpdateType,
      } = preview;
      if (!modelId || !modelVersionId || !regeneratedDataXml) {
        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
        return;
      }

      $saveNewModelButton.prop("disabled", true);
      try {
        await modelService.createModelVersion(modelId, modelVersionId);
        const { id: createdModelId, versionId: createdVersionId } =
          workspaceStore.getEditingModel() || {};
        if (!createdModelId || !createdVersionId) {
          throw new Error("Failed to resolve created model version.");
        }

        modelEditorStore.setData(regeneratedDataXml, {
          updateType: null,
        });

        await modelService.updateEditingVersion(regenerationUpdateType, {
          expectedModelId: createdModelId,
          expectedModelVersionId: createdVersionId,
        });

        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
        applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
      } catch (error) {
        console.error("Failed to save regenerated model as a new version:", error);
        alert("Failed to save regenerated model as a new version.");
      } finally {
        $saveNewModelButton.prop("disabled", false);
      }
    });

    $revertOriginalModelButton.on("click", () => {
      const preview = regenerationPreviewState;
      if (!preview || !isRegenerationPreviewContextCurrent(preview)) {
        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
        return;
      }
      if (!preview.originalDataXml) {
        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
        return;
      }
      isApplyingRegenerationView = true;
      modelEditorStore.setData(preview.originalDataXml);
      isApplyingRegenerationView = false;
      modelEditorStore.setLatestUpdateType(null);
      regenerationPreviewState = null;
    });
  },
  subscribeStores: () => {
    modelEditorStore.subscribe((_, { key, oldValue, newValue }) => {
      switch (key) {
        case "data": {
          if (!isApplyingRegenerationView) {
            const updateType = modelEditorStore.getLatestUpdateType();
            if (isRegenerationUpdateType(updateType) && oldValue && newValue) {
              const originalDataXml = serializeXmlNode(oldValue);
              const regeneratedDataXml = serializeXmlNode(newValue);
              if (originalDataXml && regeneratedDataXml) {
                const editingModelContext = getEditingModelContext();
                regenerationPreviewState = {
                  updateType,
                  modelId: editingModelContext.modelId,
                  modelVersionId: editingModelContext.modelVersionId,
                  originalDataXml,
                  regeneratedDataXml,
                  view: "regenerated",
                };
              }
            } else if (!isRegenerationUpdateType(updateType)) {
              regenerationPreviewState = null;
            }
          }

          applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
          break;
        }
        case "latestUpdateType":
          if (!isRegenerationUpdateType(newValue)) {
            regenerationPreviewState = null;
          }
          applyRegenerationActionBar(newValue);
          break;
        default:
          break;
      }
    });

    workspaceStore.subscribe((_, { key, oldValue, newValue }) => {
      if (key !== "editingModel") {
        return;
      }

      const hasEditingModelChanged =
        oldValue?.id !== newValue?.id ||
        oldValue?.versionId !== newValue?.versionId;

      if (hasEditingModelChanged) {
        regenerationPreviewState = null;
        const latestUpdateType = modelEditorStore.getLatestUpdateType();
        if (isRegenerationUpdateType(latestUpdateType)) {
          modelEditorStore.setLatestUpdateType(null);
        }
      }

      applyRegenerationActionBar(modelEditorStore.getLatestUpdateType());
    });
  },
});
