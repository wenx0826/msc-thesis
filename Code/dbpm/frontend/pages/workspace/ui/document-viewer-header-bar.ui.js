import { createUI } from "../../../shared/utils/ui.js";
import initVersionSelector from "../../../shared/widgets/version-selector.js";
import {
  documentsStore,
  documentViewerStore,
  workspaceStore,
} from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";

const $versionFilename = $("#versionFilename");
const $documentVersionTag = $("#documentVersionTag");
const $versionSelect = $("#docVersionSelect");
const $selectionColorForm = $("#selectionColorForm");
const $selectedSelectionColorForm = $("#selectedSelectionColorForm");
const $deselectAllSelectionsButton = $("#deselectAllSelectionsButton");
const $deleteSelectionButton = $("#selectedSelectionDeleteButton");

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
    return selection?.style?.backgroundColor || null;
  }

  let link = null;
  const editingModelLink = documentViewerStore.getDisplayedEditingModelLink();
  if (
    selectedSelection.linkId !== undefined &&
    selectedSelection.linkId !== null
  ) {
    if (
      editingModelLink &&
      String(editingModelLink.id || "") === String(selectedSelection.linkId)
    ) {
      link = editingModelLink;
    } else {
      link = documentViewerStore.getLinkById(selectedSelection.linkId);
    }
  }
  if (!link) {
    link = editingModelLink;
  }
  if (!link?.selections) {
    return null;
  }

  const selection = link.selections.find(
    (item) => String(item.id) === String(selectedSelection.selectionId),
  );
  return selection?.style?.backgroundColor || null;
}

function syncSelectedSelectionColorInput() {
  const color = getSelectedSelectionColor();
  if (!color) {
    return;
  }

  const $input = $selectedSelectionColorForm.find(`input[value="${color}"]`);
  if ($input.length) {
    $input.prop("checked", true);
  }
}

createUI({
  setup: () => {
    const versionSelector = initVersionSelector({
      $select: $versionSelect,
      onSelect: ({ version }) => {
        workspaceService.displayDocument(version.documentId, version.id);
      },
    });

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
        const updatedLink = documentViewerStore.updateLinkSelectionColor({
          selectionId: selectedSelection.selectionId,
          linkId: selectedSelection.linkId,
          modelId: selectedSelection.modelId,
          color: newColor,
        });
        if (!updatedLink?.id) {
          return;
        }

        const editingModelLink =
          documentViewerStore.getDisplayedEditingModelLink();
        const isEditingModelLinkUpdate =
          selectedSelection.linkId === undefined ||
          selectedSelection.linkId === null ||
          (editingModelLink &&
            String(editingModelLink.id) === String(selectedSelection.linkId));
        if (isEditingModelLinkUpdate) {
          modelService.syncEditingModelLinkStyles();
        } else {
          modelService.updateLinkById(updatedLink.id);
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
        const updatedLink = documentViewerStore.removeLinkSelection({
          selectionId,
          linkId: selectedSelection.linkId,
          modelId: selectedSelection.modelId,
        });
        if (!updatedLink?.id) {
          documentViewerStore.setSelectedSelection(null);
          return;
        }

        const editingModelLink =
          documentViewerStore.getDisplayedEditingModelLink();
        const isEditingModelLinkUpdate =
          editingModelLink &&
          String(editingModelLink.id) === String(updatedLink.id);
        if (!isEditingModelLinkUpdate) {
          modelService.updateLinkTextById(updatedLink.id, {
            alertOnEmptyAfterDeletion: true,
          });
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
          const { id, versionId, isLatest } = newValue || {};
          if (!id) {
            $versionFilename.text("");
            setVersionTag($documentVersionTag, null);
            break;
          }
          versionSelector.update({
            versions: documentsStore.getVersions(id),
            selectedId: versionId,
          });
          $versionFilename.text(
            documentsStore.getFileName(id, versionId) || "",
          );
          const isLatestVersion =
            typeof isLatest === "boolean"
              ? isLatest
              : documentsStore.isLatestVersion(id, versionId);
          setVersionTag($documentVersionTag, isLatestVersion);
          break;
        }
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
          syncSelectedSelectionColorInput();
          break;
        case "temporarySelections":
          syncSelectedSelectionColorInput();
          break;
        case "editingModelLink.selections":
        case "editingModelLink":
          syncSelectedSelectionColorInput();
          break;
        default:
          break;
      }
    });
  },
});
