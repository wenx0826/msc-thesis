import { createUI } from "../../../shared/utils/ui.js";
import { default as setModelNameEditor } from "../../../shared/widgets/inline-editor.js";
import initVersionSelector from "../../../shared/widgets/version-selector.js";
import { modelsStore, workspaceStore } from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
import { createModelActionsMenu } from "./model-actions-menu.ui.js";
const $modelName = $("#editingModelName");
const $modelVersionTag = $("#editingModelVersionTag");
const $deselectButton = $("#deselectModelButton");
const $versionSelect = $("#modelVersionSelect");
const $createVersionButton = $("#createModelVersionButton");
const $moreActionsButton = $("#editingModelMoreActionsButton");
let isCreatingModelVersion = false;

function setVersionTag($tag, isLatest) {
  if (typeof isLatest !== "boolean") {
    $tag
      .addClass("hidden")
      .removeClass("version-tag--latest version-tag--historical")
      .text("");
    return;
  }

  $tag
    .removeClass("hidden version-tag--latest version-tag--historical")
    .addClass(isLatest ? "version-tag--latest" : "version-tag--historical")
    .text(isLatest ? "Latest" : "Historical");
}

function updateCreateVersionButton(isSelectedVersionLatest) {
  if (isSelectedVersionLatest) {
    $createVersionButton
      .text("+ New version")
      .attr("title", "Create a version from the current latest version")
      .attr("data-action", "new_version");
    return;
  }
  $createVersionButton
    .text("Revert to this version")
    .attr("title", "Create a new version by copying this selected version")
    .attr("data-action", "revert");
}

function setModelNameText(name) {
  $modelName.text(name || "");
}

function resetToolbar(versionSelector) {
  setModelNameText("");
  setVersionTag($modelVersionTag, null);
  versionSelector.update({ versions: [], selectedId: null });
  updateCreateVersionButton(true);
}

createUI({
  setup: () => {
    const versionSelector = initVersionSelector({
      $select: $versionSelect,
      onSelect: ({ version }) => {
        workspaceService.displayModel(version.modelId, version.id);
      },
    });
    // updateCreateVersionButton(true);
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
    $createVersionButton.on("click", async () => {
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
      try {
        await modelService.createModelVersion(modelId, sourceVersionId);
      } catch (error) {
        alert("Failed to create model version.");
      } finally {
        isCreatingModelVersion = false;
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
          const {
            id: newModelId,
            versionId: newVersionId,
            isLatest,
          } = newValue;
          const { id: oldModelId, versionId: oldVersionId } = oldValue;
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
          setVersionTag($modelVersionTag, isLatest);
          updateCreateVersionButton(isLatest);

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
