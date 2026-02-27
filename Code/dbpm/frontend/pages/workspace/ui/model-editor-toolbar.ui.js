import { createUI } from "../../../shared/utils/ui.js";
import { default as setModelNameEditor } from "../../../shared/widgets/inline-editor.js";
import initVersionSelector from "../../../shared/widgets/version-selector.js";
import { modelsStore, workspaceStore } from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";

const $modelName = $("#editingModelName");
const $actionsGroup = $("#editingModelActionsGroup");
const $versionSelect = $("#modelVersionSelect");
const $createVersionButton = $("#createModelVersionButton");

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
  versionSelector.update({ versions: [], selectedId: null });
  updateCreateVersionButton(true);
}
function setActionsGroupDisabled(isDisabled) {
  $actionsGroup.prop("disabled", isDisabled);
}
createUI({
  setup: () => {
    setActionsGroupDisabled(true);
    const versionSelector = initVersionSelector({
      $select: $versionSelect,
      onSelect: ({ version }) => {
        workspaceService.toggleModelDisplay(version.modelId, version.id);
      },
    });
    updateCreateVersionButton(true);
    setModelNameEditor({
      $scope: $modelName.parent(),
      trigger: "click",
      autoGrow: true,
      onSave: (name) => {
        const editingModelId = workspaceStore.getEditingModelId();
        modelService.renameModel(editingModelId, name);
      },
    });

    return { versionSelector };
  },
  bindListeners: () => {
    $createVersionButton.on("click", async () => {
      const { id: modelId, versionId: sourceVersionId } =
        workspaceStore.getEditingModel() || {};
      if (!modelId || !sourceVersionId) {
        alert("No model version is currently selected.");
        return;
      }
      $createVersionButton.prop("disabled", true);
      try {
        const result = await modelService.createModelVersion(
          modelId,
          sourceVersionId,
        );
        if (result?.meta?.reason === "revert") {
          console.log(
            `Created new version by reverting from ${result.meta.sourceVersionLabel}`,
          );
        }
      } catch (error) {
        console.error("Failed to create model version:", error);
        alert("Failed to create model version.");
      } finally {
        $createVersionButton.prop("disabled", false);
      }
    });
  },
  subscribeStores: ({ versionSelector }) => {
    workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "editingModel": {
          const { id: newModelId, versionId: newVersionId } = newValue;
          const { id: oldModelId, versionId: oldVersionId } = oldValue;
          if (!newModelId) {
            resetToolbar(versionSelector);
            break;
          }
          setActionsGroupDisabled(false);
          const modelMeta = modelsStore.getEntity(newModelId);
          if (newModelId !== oldModelId) {
            setModelNameText(modelMeta.name);
          }
          versionSelector.update({
            versions: modelMeta?.versions || [],
            selectedId: newVersionId,
          });
          const isLatestVersion = modelsStore.isLatestVersion(
            newModelId,
            newVersionId,
          );
          updateCreateVersionButton(isLatestVersion);
          break;
        }
        default:
          break;
      }
    });
  },
});
