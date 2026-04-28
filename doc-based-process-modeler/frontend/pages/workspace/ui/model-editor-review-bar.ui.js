import { createUI } from "../../../shared/utils/ui.js";
import { Constants } from "../../../constants.js";
import { modelEditorStore, workspaceStore } from "../store/index.js";
import { modelService } from "../services/index.js";

const MODEL_VERSION_CHANGE_TYPE = Constants.MODEL_VERSION_CHANGE_TYPE;

const $newModelDraftReviewBar = $("#newModelDraftReviewBar");
const $regenerationDraftReviewBar = $("#regenerationDraftReviewBar");

const $discardDraftModelButton = $("#discardDraftModelButton");
const $saveDraftModelButton = $("#saveDraftModelButton");

const $viewOriginalModelButton = $("#viewOriginalModelButton");
const $viewRegeneratedModelButton = $("#viewRegeneratedModelButton");
const $cancelRegenerationButton = $("#cancelRegenerationButton");
const $replaceModelButton = $("#replaceModelButton");
const $saveNewModelButton = $("#saveNewModelButton");

const $newModelDraftBarControls = $("#newModelDraftBarControls");
const $regenerationDraftBarControls = $("#regenerationDraftBarControls");

function setBarBusy($fieldset, isBusy) {
  $fieldset.prop("disabled", isBusy);
}

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
    MODEL_VERSION_CHANGE_TYPE.AI_REFINEMENT,
    MODEL_VERSION_CHANGE_TYPE.AI_REGENERATION,
  ].includes(updateType);
}

function isNewModelDraftVisible() {
  return $newModelDraftReviewBar.is(":visible");
}

function isRegenerationDraftVisible() {
  return $regenerationDraftReviewBar.is(":visible");
}

function getActiveDecisionActionBarElement() {
  if (isNewModelDraftVisible()) {
    return $newModelDraftReviewBar[0] || null;
  }
  if (isRegenerationDraftVisible()) {
    return $regenerationDraftReviewBar[0] || null;
  }
  return null;
}

function getEditingModelContext() {
  const { id, versionId, sourceVersionId } =
    workspaceStore.getEditingModel() || {};
  return {
    modelId: id || null,
    modelVersionId: versionId || null,
    sourceModelVersionId: sourceVersionId || null,
  };
}

function isNewModelDraftEditingModel(editingModel) {
  return !!editingModel && !editingModel.id && !editingModel.versionId;
}

function isRegenerationPreviewContextCurrent(
  preview = regenerationPreviewState,
) {
  if (!preview?.modelId || !preview?.modelVersionId) {
    return false;
  }

  const currentContext = getEditingModelContext();
  if (currentContext.modelId !== preview.modelId) {
    return false;
  }
  return (
    currentContext.modelVersionId === preview.modelVersionId ||
    currentContext.sourceModelVersionId === preview.modelVersionId
  );
}

function setRegenerationDecisionClickLock(isLocked) {
  const shouldLock = Boolean(isLocked);
  isRegenerationDecisionClickLocked = shouldLock;
  if (!shouldLock) {
    $newModelDraftReviewBar.removeClass(REGENERATION_ACTION_BAR_HINT_CLASS);
    $regenerationDraftReviewBar.removeClass(REGENERATION_ACTION_BAR_HINT_CLASS);
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
  const activeBarElement = getActiveDecisionActionBarElement();
  if (!activeBarElement) {
    return;
  }

  const $activeBar = $(activeBarElement);
  $activeBar.removeClass(REGENERATION_ACTION_BAR_HINT_CLASS);
  // Restart transition if user clicks outside repeatedly.
  void $activeBar.get(0)?.offsetWidth;
  $activeBar.addClass(REGENERATION_ACTION_BAR_HINT_CLASS);

  if (regenerationActionBarHintTimeoutId) {
    clearTimeout(regenerationActionBarHintTimeoutId);
  }
  regenerationActionBarHintTimeoutId = setTimeout(() => {
    $activeBar.removeClass(REGENERATION_ACTION_BAR_HINT_CLASS);
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
    alert("Please use the action bar to continue.");
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
  const activeBarElement = getActiveDecisionActionBarElement();
  return activeBarElement?.contains(eventTarget) ?? false;
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

function restoreEditingModelAfterRegeneration(
  preview = regenerationPreviewState,
) {
  if (!preview?.modelId || !preview?.modelVersionId) {
    return;
  }
  const currentEditingModel = workspaceStore.getEditingModel() || {};
  const restoredIsLatest =
    typeof preview.modelIsLatest === "boolean"
      ? preview.modelIsLatest
      : typeof currentEditingModel.isLatest === "boolean"
        ? currentEditingModel.isLatest
        : null;
  workspaceStore.setEditingModel({
    id: preview.modelId,
    versionId: preview.modelVersionId,
    isLatest: restoredIsLatest,
  });
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
  const nextUpdateType =
    normalizedView === "regenerated"
      ? regenerationPreviewState.updateType
      : null;
  if (!nextDataXml) {
    return;
  }

  regenerationPreviewState = {
    ...regenerationPreviewState,
    view: normalizedView,
  };

  isApplyingRegenerationView = true;
  modelEditorStore.setData(nextDataXml, {
    updateType: nextUpdateType,
  });
  isApplyingRegenerationView = false;
}

function syncRegenerationDraftButtonsState() {
  if (!isRegenerationDraftVisible() || !regenerationPreviewState) {
    return;
  }

  const isViewingOriginal = regenerationPreviewState.view === "original";
  $viewOriginalModelButton.prop("disabled", isViewingOriginal);
  $viewRegeneratedModelButton.prop("disabled", !isViewingOriginal);
  $cancelRegenerationButton.prop("disabled", false);
  $replaceModelButton.prop("disabled", isViewingOriginal);
  $saveNewModelButton.prop("disabled", isViewingOriginal);
}

function syncDecisionActionState() {
  syncRegenerationDraftButtonsState();
  setRegenerationDecisionClickLock(
    isNewModelDraftVisible() || isRegenerationDraftVisible(),
  );
}

createUI({
  setup: () => {
    syncDecisionActionState();
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
      syncDecisionActionState();
    });

    $viewRegeneratedModelButton.on("click", () => {
      setRegenerationPreviewView("regenerated");
      syncDecisionActionState();
    });

    $cancelRegenerationButton.on("click", () => {
      const preview = regenerationPreviewState;
      if (!preview?.originalDataXml) {
        regenerationPreviewState = null;
        return;
      }

      // Record declined regeneration attempt
      const meta = modelService.getPendingGenerationAttemptMeta();
      if (meta) {
        modelService.clearPendingGenerationAttemptMeta();
        modelService.recordGenerationAttempt({
          ...meta,
          result: "declined",
          resultModelVersionId: null,
        });
      }

      isApplyingRegenerationView = true;
      modelEditorStore.setData(preview.originalDataXml);
      isApplyingRegenerationView = false;
      modelEditorStore.setLatestUpdateType(null);
      restoreEditingModelAfterRegeneration(preview);
      regenerationPreviewState = null;
      syncDecisionActionState();
    });

    $replaceModelButton.on("click", async () => {
      const preview = regenerationPreviewState;
      if (!preview) {
        regenerationPreviewState = null;
        return;
      }
      if (!preview.modelId || !preview.modelVersionId) {
        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
        return;
      }
      if (preview.view !== "regenerated") {
        setRegenerationPreviewView("regenerated");
      }

      setBarBusy($regenerationDraftBarControls, true);
      try {
        restoreEditingModelAfterRegeneration(preview);
        await modelService.updateEditingVersion(preview.updateType, {
          expectedModelId: preview.modelId,
          expectedModelVersionId: preview.modelVersionId,
          prompt: preview.prompt || null,
        });
        // Record accepted-replace regeneration attempt
        const meta = modelService.getPendingGenerationAttemptMeta();
        if (meta) {
          modelService.clearPendingGenerationAttemptMeta();
          modelService.recordGenerationAttempt({
            ...meta,
            result: "accepted_replace",
            resultModelVersionId: preview.modelVersionId,
          });
        }
        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
        syncDecisionActionState();
      } catch (error) {
        console.error("Failed to keep regenerated model:", error);
        alert("Failed to keep regenerated model.");
      } finally {
        setBarBusy($regenerationDraftBarControls, false);
      }
    });

    $saveNewModelButton.on("click", async () => {
      const preview = regenerationPreviewState;
      if (!preview) {
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

      setBarBusy($regenerationDraftBarControls, true);
      try {
        await modelService.createModelVersion(modelId, modelVersionId, {
          modelData: regeneratedDataXml,
          type: regenerationUpdateType,
          prompt: preview.prompt || null,
        });
        const { id: createdModelId, versionId: createdVersionId } =
          workspaceStore.getEditingModel() || {};
        if (!createdModelId || !createdVersionId) {
          throw new Error("Failed to resolve created model version.");
        }

        // Record accepted-new-version regeneration attempt
        const meta = modelService.getPendingGenerationAttemptMeta();
        if (meta) {
          modelService.clearPendingGenerationAttemptMeta();
          modelService.recordGenerationAttempt({
            ...meta,
            result: "accepted_new_version",
            resultModelVersionId: createdVersionId,
          });
        }

        modelEditorStore.setLatestUpdateType(null);
        regenerationPreviewState = null;
        syncDecisionActionState();
      } catch (error) {
        console.error(
          "Failed to save regenerated model as a new version:",
          error,
        );
        alert("Failed to save regenerated model as a new version.");
      } finally {
        setBarBusy($regenerationDraftBarControls, false);
      }
    });

    $discardDraftModelButton.on("click", () => {
      modelService.discardPendingNewModelDraft();
      syncDecisionActionState();
    });

    $saveDraftModelButton.on("click", async () => {
      setBarBusy($newModelDraftBarControls, true);
      try {
        await modelService.commitPendingNewModelDraft();
      } catch (error) {
        console.error("Failed to create model from new model draft:", error);
        alert("Failed to create model from draft.");
      } finally {
        setBarBusy($newModelDraftBarControls, false);
        syncDecisionActionState();
      }
    });
  },
  subscribeStores: () => {
    modelEditorStore.subscribe(({ key, oldValue, newValue }) => {
      switch (key) {
        case "data": {
          if (!isApplyingRegenerationView) {
            const updateType = modelEditorStore.getLatestUpdateType();
            if (isRegenerationUpdateType(updateType) && oldValue && newValue) {
              const originalDataXml = serializeXmlNode(oldValue);
              const regeneratedDataXml = serializeXmlNode(newValue);
              if (originalDataXml && regeneratedDataXml) {
                const editingModelContext = getEditingModelContext();
                const editingModel = workspaceStore.getEditingModel() || {};
                const pendingMeta =
                  modelService.getPendingGenerationAttemptMeta();
                regenerationPreviewState = {
                  updateType,
                  modelId: editingModelContext.modelId,
                  modelVersionId: editingModelContext.modelVersionId,
                  modelIsLatest:
                    typeof editingModel.isLatest === "boolean"
                      ? editingModel.isLatest
                      : null,
                  originalDataXml,
                  regeneratedDataXml,
                  view: "regenerated",
                  prompt: pendingMeta?.prompt || null,
                };
              }
            } else if (!isRegenerationUpdateType(updateType)) {
              regenerationPreviewState = null;
            }
          }

          syncDecisionActionState();
          break;
        }
        case "latestUpdateType":
          if (
            !isRegenerationUpdateType(newValue) &&
            !workspaceStore.isEditingModelRegenerationDraft()
          ) {
            regenerationPreviewState = null;
          }
          syncDecisionActionState();
          break;
        default:
          break;
      }
    });

    workspaceStore.subscribe(({ key, oldValue, newValue }) => {
      if (key !== "editingModel") {
        return;
      }

      const hasEditingModelChanged =
        oldValue?.id !== newValue?.id ||
        oldValue?.versionId !== newValue?.versionId ||
        oldValue?.sourceVersionId !== newValue?.sourceVersionId;
      const oldHasVersion =
        oldValue?.versionId !== null && oldValue?.versionId !== undefined;
      const newHasVersion =
        newValue?.versionId !== null && newValue?.versionId !== undefined;
      const isRegenerationDraftTransition =
        oldValue?.id &&
        oldValue?.id === newValue?.id &&
        ((oldHasVersion &&
          !newHasVersion &&
          newValue?.sourceVersionId === oldValue?.versionId) ||
          (!oldHasVersion &&
            oldValue?.sourceVersionId &&
            newHasVersion &&
            oldValue?.sourceVersionId === newValue?.versionId));
      const shouldResetRegenerationState =
        hasEditingModelChanged && !isRegenerationDraftTransition;

      if (shouldResetRegenerationState) {
        regenerationPreviewState = null;
        const latestUpdateType = modelEditorStore.getLatestUpdateType();
        if (isRegenerationUpdateType(latestUpdateType)) {
          modelEditorStore.setLatestUpdateType(null);
        }
      }

      const hadNewModelDraftState = isNewModelDraftEditingModel(oldValue);
      if (hadNewModelDraftState && !isNewModelDraftEditingModel(newValue)) {
        modelService.discardPendingNewModelDraft({ clearEditorData: false });
      }

      syncDecisionActionState();
    });
  },
});
