import { createUI } from "../../../shared/utils/ui.js";
import initVersionSelector from "../../../shared/widgets/version-selector.js";
import { Constants } from "../../../constants.js";
import {
  documentsStore,
  documentViewerStore,
  workspaceStore,
} from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";

const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;
const $versionFilename = $("#versionFilename");
const $versionSelect = $("#docVersionSelect");
const $selectionColorForm = $("#selectionColorForm");
const $deleteSelectionButton = $("#deleteSelectionButton");

createUI({
  setup: () => {
    const versionSelector = initVersionSelector({
      $select: $versionSelect,
      onSelect: ({ version }) => {
        workspaceService.displayDocument(version.documentId, version.id);
      },
    });

    $deleteSelectionButton.prop(
      "disabled",
      !documentViewerStore.getSelectedSelection(),
    );

    return { versionSelector };
  },
  bindListeners: () => {
    $selectionColorForm.on("input", (event) => {
      const newColor = event.target.value;
      documentViewerStore.setSelectionColor(newColor);

      const selectedSelection = documentViewerStore.getSelectedSelection();
      if (!selectedSelection) {
        return;
      }
      if (!selectedSelection.modelId) {
        documentViewerStore.updateTemporarySelectionColor(
          selectedSelection.selectionId,
          newColor,
        );
      } else {
        documentViewerStore.updateActiveModelTraceSelectionColor(
          selectedSelection.selectionId,
          newColor,
        );
        modelService.updateActiveModelTrace();
      }
    });

    $deleteSelectionButton.on("click", () => {
      const selectedSelection = documentViewerStore.getSelectedSelection();
      if (!selectedSelection) {
        return;
      }

      const { selectionId, modelId } = selectedSelection;
      if (!modelId) {
        documentViewerStore.removeTemporarySelection(selectionId);
      } else {
        // todo change it to rerender after trace update
        documentViewerStore.removeActiveModelTraceSelectionById(selectionId);
        modelService.updateActiveModel(
          MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
        );
      }
      documentViewerStore.setSelectedSelection(null);
    });
  },
  subscribeStores: ({ versionSelector }) => {
    workspaceStore.subscribe((state, { key, newValue }) => {
      switch (key) {
        case "viewedDocument": {
          const { id, versionId } = newValue || {};
          if (!id) {
            break;
          }
          versionSelector.update({
            versions: documentsStore.getVersions(id),
            selectedId: versionId,
          });
          $versionFilename.text(
            documentsStore.getFileName(id, versionId) || "",
          );
          break;
        }
        default:
          break;
      }
    });

    documentViewerStore.subscribe((state, { key, newValue }) => {
      switch (key) {
        case "selectionColor":
          break;
        case "selectedSelection":
          $deleteSelectionButton.prop("disabled", !newValue);
          break;
        default:
          break;
      }
    });
  },
});
