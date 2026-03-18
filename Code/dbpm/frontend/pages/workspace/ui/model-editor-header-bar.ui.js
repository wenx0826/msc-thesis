import { createUI } from "../../../shared/utils/ui.js";
import { default as setModelNameEditor } from "../../../shared/widgets/inline-editor.js";
import setVersionTag from "../../../shared/widgets/version-tag.js";
import initVersionSelector from "../../../shared/widgets/version-selector.js";
import { modelsStore, workspaceStore } from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
import { createModelActionsMenu } from "./model-actions-menu.ui.js";
const $modelName = $("#editingModelName");
const $modelVersionTag = $("#editingModelVersionTag");
const $deselectButton = $("#deselectModelButton");
const $versionSelect = $("#modelVersionSelect");
const $createVersionButton = $("#createModelVersionButton");
const $restoreVersionButton = $("#restoreModelVersionButton");
const $versionActionButtons = $createVersionButton.add($restoreVersionButton);
const $moreActionsButton = $("#editingModelMoreActionsButton");
let isCreatingModelVersion = false;

function setModelNameText(name) {
  $modelName.text(name || "");
}

function resetToolbar(versionSelector) {
  setModelNameText("");
  setVersionTag($modelVersionTag, null);
  versionSelector.update({ versions: [], selectedId: null });
}

createUI({
  setup: () => {
    const versionSelector = initVersionSelector({
      $select: $versionSelect,
      onSelect: ({ version }) => {
        workspaceService.displayModel(version.modelId, version.id);
      },
    });
    setModelNameEditor({
      $scope: $modelName.parent(),
      trigger: "click",
      autoGrow: true,
      onSave: (name) => {
        const editingModelId = workspaceStore.getEditingModelId();
        modelService.renameModel(editingModelId, name);
      },
    });
    // const getActionsMenuItems = (modelId, versionId) => {
    //   const isLatestVersion = modelsStore.isLatestVersion(modelId, versionId);
    //   return [
    return { versionSelector };
  },
  bindListeners: () => {
    $deselectButton.on("click", () => {
      workspaceService.clearModelDisplay();
    });
    $versionActionButtons.on("click", async () => {
      if (isCreatingModelVersion) {
        return;
      }
      const { id: modelId, versionId: sourceVersionId } =
        workspaceStore.getEditingModel() || {};
      if (!modelId || !sourceVersionId) {
        alert("No model version is currently selected.");
        return;
      }
      isCreatingModelVersion = true;
      $versionActionButtons.prop("disabled", true);
      try {
        await modelService.createModelVersion(modelId, sourceVersionId, {
          allowSelectionDraftPayload: false,
        });
      } catch (error) {
        alert("Failed to create model version.");
      } finally {
        isCreatingModelVersion = false;
        $versionActionButtons.prop("disabled", false);
      }
    });
    $moreActionsButton.on("mousedown", (e) => {
      console.log("More actions button clicked");
      const { id: modelId, versionId } = workspaceStore.getEditingModel() || {};
      createModelActionsMenu(e, { modelId, versionId });
      // showContextMenu($moreActionsButton, menuItems);
    });
  },
  subscribeStores: ({ versionSelector }) => {
    workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "editingModel": {
          const { id: newModelId, versionId: newVersionId, isDraft } = newValue;
          const { id: oldModelId } = oldValue;

          if (isDraft) {
            const modelMeta = newModelId
              ? modelsStore.getEntity(newModelId)
              : null;
            setModelNameText(modelMeta?.name || "");
            versionSelector.update({ versions: [], selectedId: null });
            setVersionTag($modelVersionTag, newValue);
            break;
          }

          if (!newModelId) {
            resetToolbar(versionSelector);
            break;
          }
          const modelMeta = modelsStore.getEntity(newModelId);
          if (newModelId !== oldModelId) {
            setModelNameText(modelMeta.name);
          }
          versionSelector.update({
            versions: modelMeta?.versions || [],
            selectedId: newVersionId,
          });
          setVersionTag($modelVersionTag, newValue);

          break;
        }
        default:
          break;
      }
    });
    modelsStore.subscribe((state, { key, operation, value }) => {
      switch (key) {
        case "entitiesById":
          switch (operation) {
            case "update": {
              const editingModelId = workspaceStore.getEditingModelId();
              if (value.id === editingModelId) {
                setModelNameText(value.name);
              }
              break;
            }
            default:
              break;
          }
          break;
        default:
          break;
      }
    });
  },
});
