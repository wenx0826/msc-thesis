import { createUI } from "../../../shared/utils/ui.js";
import initVersionSelector from "../../../shared/widgets/version-selector.js";
import {
  documentsStore,
  documentViewerStore,
  workspaceStore,
} from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
const $versionFilename = $("#versionFilename");
const $versionSelect = $("#docVersionSelect");
const $selectionColorForm = $("#selectionColorForm");
const $selectedSelectionColorForm = $("#selectedSelectionColorForm");
const $deselectAllSelectionsButton = $("#deselectAllSelectionsButton");
const $deleteSelectionButton = $("#selectedSelectionDeleteButton");

function syncNextSelectionColorInput(color) {
  if (!color) return;
  const $input = $selectionColorForm.find(`input[value="${color}"]`);
  if ($input.length) {
    $input.prop("checked", true);
  }
}

function getSelectedSelectionColor() {
  const selectedSelection = documentViewerStore.getSelectedSelection();
  if (!selectedSelection) {
    return null;
  }

  if (
    selectedSelection.scope === "temporary" ||
    selectedSelection.modelId === undefined ||
    selectedSelection.modelId === null
  ) {
    const selection = documentViewerStore
      .getTemporarySelections()
      .find(
        (item) => String(item.id) === String(selectedSelection.selectionId),
      );
    return selection?.color || null;
  }

  let trace = null;
  if (
    selectedSelection.traceId !== undefined &&
    selectedSelection.traceId !== null
  ) {
    trace = documentViewerStore.getTraceById(selectedSelection.traceId);
  }
  if (!trace) {
    trace = documentViewerStore.getDisplayedModelTrace();
  }
  if (!trace?.selections) {
    return null;
  }

  const selection = trace.selections.find(
    (item) => String(item.id) === String(selectedSelection.selectionId),
  );
  return selection?.color || null;
}

function syncSelectedSelectionColorInput() {
  const hasSelectedSelection = !!documentViewerStore.getSelectedSelection();
  $selectedSelectionColorForm
    .find("input")
    .prop("disabled", !hasSelectedSelection);

  if (!hasSelectedSelection) {
    return;
  }

  const color = getSelectedSelectionColor();
  if (!color) {
    return;
  }

  const $input = $selectedSelectionColorForm.find(`input[value="${color}"]`);
  if ($input.length) {
    $input.prop("checked", true);
  }
}

function syncToolbarButtonStates() {
  const hasTemporarySelections =
    documentViewerStore.getTemporarySelections().length > 0;
  const hasSelectedSelection = !!documentViewerStore.getSelectedSelection();
  const hasEditingModel = workspaceStore.hasEditingModel();

  const hasAnySelectionStateToClear =
    hasTemporarySelections || hasSelectedSelection || hasEditingModel;

  $deselectAllSelectionsButton.prop("disabled", !hasAnySelectionStateToClear);
  $deleteSelectionButton.prop("disabled", !hasSelectedSelection);
}

createUI({
  setup: () => {
    const versionSelector = initVersionSelector({
      $select: $versionSelect,
      onSelect: ({ version }) => {
        workspaceService.displayDocument(version.documentId, version.id);
      },
    });

    syncToolbarButtonStates();
    syncNextSelectionColorInput(documentViewerStore.getSelectionColor());
    syncSelectedSelectionColorInput();

    return { versionSelector };
  },
  bindListeners: () => {
    $selectionColorForm.on("input", (event) => {
      const newColor = event.target.value;
      documentViewerStore.setSelectionColor(newColor);
    });

    $selectedSelectionColorForm.on("input", (event) => {
      const newColor = event.target.value;

      const selectedSelection = documentViewerStore.getSelectedSelection();
      if (!selectedSelection) {
        return;
      }
      if (
        selectedSelection.scope === "temporary" ||
        selectedSelection.modelId === undefined ||
        selectedSelection.modelId === null
      ) {
        documentViewerStore.updateTemporarySelectionColor(
          selectedSelection.selectionId,
          newColor,
        );
      } else {
        const updatedTrace = documentViewerStore.updateTraceSelectionColor({
          selectionId: selectedSelection.selectionId,
          traceId: selectedSelection.traceId,
          modelId: selectedSelection.modelId,
          color: newColor,
        });
        if (!updatedTrace?.id) {
          return;
        }

        const activeTrace = documentViewerStore.getDisplayedModelTrace();
        const isActiveTraceUpdate =
          selectedSelection.traceId === undefined ||
          selectedSelection.traceId === null ||
          (activeTrace &&
            String(activeTrace.id) === String(selectedSelection.traceId));
        if (isActiveTraceUpdate) {
          modelService.updateActiveModelTrace();
        } else {
          modelService.updateTraceById(updatedTrace.id);
        }
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
        const updatedTrace = documentViewerStore.removeTraceSelection({
          selectionId,
          traceId: selectedSelection.traceId,
          modelId: selectedSelection.modelId,
        });
        if (!updatedTrace?.id) {
          documentViewerStore.setSelectedSelection(null);
          return;
        }

        const activeTrace = documentViewerStore.getDisplayedModelTrace();
        const isActiveTraceUpdate =
          activeTrace && String(activeTrace.id) === String(updatedTrace.id);
        if (isActiveTraceUpdate) {
          modelService.updateActiveModelTrace();
        } else {
          modelService.updateTraceTextById(updatedTrace.id);
        }
      }
      documentViewerStore.setSelectedSelection(null);
    });

    $deselectAllSelectionsButton.on("click", () => {
      const temporarySelections = [
        ...documentViewerStore.getTemporarySelections(),
      ];
      temporarySelections.forEach((selection) => {
        documentViewerStore.removeTemporarySelection(selection.id);
      });

      if (documentViewerStore.getSelectedSelection()) {
        documentViewerStore.setSelectedSelection(null);
      }

      if (workspaceStore.hasEditingModel()) {
        workspaceService.clearModelDisplay();
      }
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
        case "editingModel":
          syncToolbarButtonStates();
          break;
        default:
          break;
      }
    });

    documentViewerStore.subscribe((state, { key, newValue }) => {
      switch (key) {
        case "selectionColor":
          syncNextSelectionColorInput(newValue);
          break;
        case "selectedSelection":
          syncToolbarButtonStates();
          syncSelectedSelectionColorInput();
          break;
        case "temporarySelections":
          syncToolbarButtonStates();
          syncSelectedSelectionColorInput();
          break;
        case "activeModelTrace.selections":
        case "activeModelTrace":
          syncSelectedSelectionColorInput();
          break;
        default:
          break;
      }
    });
  },
});
