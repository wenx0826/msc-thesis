import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore, documentsStore } from "../store/index.js";
import { workspaceService, documentService } from "../services/index.js";
import {
  createTemplateElement,
  createMenu,
} from "../../../shared/utils/dom.js";
import initInlineEditor from "../../../shared/widgets/inline-editor.js";

// #region DOM References
const $documentsCount = $("#documentsCount");
const $documentsInput = $("#documentsInput");
const $documentVersionInput = $("#documentVersionInput");
const $documentsList = $("#documentsList");
const $documentsPanel = $("#documentsPanel");
const $documentsBulkEditToggleButton = $("#documentsBulkEditToggleButton");
const $documentsSelectedCount = $("#documentsSelectedCount");
const $documentsSelectAllButton = $("#documentsSelectAllButton");
const $documentsClearSelectionButton = $("#documentsClearSelectionButton");
const $documentsDeleteSelectedButton = $("#documentsDeleteSelectedButton");
// #endregion

// #region DOM Rendering and Manipulation
function syncDocumentsCount() {
  const count = documentsStore.getCount();
  const isBulkEditMode = documentsStore.getIsBulkEditMode();
  const hasDocuments = count > 0;
  $documentsCount.text(count);
  $documentsBulkEditToggleButton.prop(
    "disabled",
    !hasDocuments && !isBulkEditMode,
  );
}

function getVisibleDocumentIds() {
  return $documentsList
    .find("li[data-doc-id]")
    .map((_, element) => String(element.dataset.docId || ""))
    .get()
    .filter(Boolean);
}

function syncDocumentsSelectionControls() {
  const isBulkEditMode = documentsStore.getIsBulkEditMode();
  const selectedCount = documentsStore.getSelectedCount();
  const visibleIds = getVisibleDocumentIds();
  const visibleCount = visibleIds.length;
  const selectedVisibleCount = visibleIds.filter((id) =>
    documentsStore.isSelected(id),
  ).length;

  $documentsSelectedCount.text(`${selectedCount} selected`);
  if (!isBulkEditMode) {
    $documentsSelectAllButton.prop("disabled", true);
    $documentsClearSelectionButton.prop("disabled", true);
    $documentsDeleteSelectedButton.prop("disabled", true);
    return;
  }
  $documentsSelectAllButton.prop(
    "disabled",
    visibleCount === 0 || selectedVisibleCount >= visibleCount,
  );
  $documentsClearSelectionButton.prop("disabled", selectedCount === 0);
  $documentsDeleteSelectedButton.prop("disabled", selectedCount === 0);
}

function syncDocumentsBulkModeUI() {
  const isBulkEditMode = documentsStore.getIsBulkEditMode();
  const hasDocuments = documentsStore.getCount() > 0;
  $documentsPanel.attr("data-bulk-mode", isBulkEditMode ? "true" : "false");
  $documentsBulkEditToggleButton.text(isBulkEditMode ? "Done" : "Bulk Edit");
  $documentsBulkEditToggleButton.prop(
    "disabled",
    !hasDocuments && !isBulkEditMode,
  );
  syncDocumentsSelectionControls();
}

function addDocumentItem({ id: docId, name }) {
  const $documentItem = createTemplateElement("documentItemTemplate");
  $documentItem.attr("data-doc-id", docId);
  $documentItem.find("[data-ref='documentName']").text(name);
  const versionName = documentsStore.getLatestVersionName(docId);
  $documentItem.find("[data-ref='versionName']").text(versionName);
  $documentItem
    .find(".item-select-checkbox")
    .prop("checked", documentsStore.isSelected(docId));
  $documentsList.append($documentItem);
  setDocumentItemSelected(docId, documentsStore.isSelected(docId));
}

function getDocumentItem(docId) {
  return $documentsList.find(`li[data-doc-id='${docId}']`);
}

function syncDocumentItem(docId, { name, versionName } = {}) {
  const $documentItem = getDocumentItem(docId);
  if (name) $documentItem.find("[data-ref='documentName']").text(name);
  if (versionName)
    $documentItem.find("[data-ref='versionName']").text(versionName);
}

function setDocumentItemCurrent(docId, isCurrent) {
  const $documentItem = getDocumentItem(docId);
  $documentItem.toggleClass("is-current", isCurrent);
}

function setDocumentItemSelected(docId, isSelected) {
  const $documentItem = getDocumentItem(docId);
  if ($documentItem.length === 0) {
    return;
  }
  $documentItem.toggleClass("is-selected", isSelected);
  $documentItem.find(".item-select-checkbox").prop("checked", isSelected);
}

function syncDocumentSelectionsInView() {
  $documentsList.find("li[data-doc-id]").each((_, element) => {
    const docId = element.dataset.docId;
    if (!docId) {
      return;
    }
    setDocumentItemSelected(docId, documentsStore.isSelected(docId));
  });
}

function removeDocumentItem(docId) {
  getDocumentItem(docId).remove();
}
// #endregion

// #region DOM Actions
function onDocumentsInputChange(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  documentService.uploadDocuments(files);
}

function onVersionInputChange(event, docId) {
  const file = event.target.files[0];
  if (!file) return;
  documentService.uploadNewVersion(docId, file);
}

function onDocItemClick(event) {
  if (
    $(event.target).closest(".item-select-checkbox, .more-actions-btn").length >
    0
  ) {
    return;
  }
  const documentId = $(event.currentTarget).data("docId");
  if (documentsStore.getIsBulkEditMode()) {
    documentsStore.toggleSelected(documentId);
    return;
  }
  workspaceService.displayDocument(documentId);
}

function onDocItemActionsBtnClick(event, getActionsMenu) {
  event.stopPropagation();
  const $documentItem = $(event.currentTarget).closest("li");
  const documentId = $documentItem.data("docId");
  const menu = getActionsMenu(documentId);
  createMenu(event, menu);
}

function onDocumentCheckboxMouseDown(event) {
  event.stopPropagation();
}

function onDocumentCheckboxChange(event) {
  event.stopPropagation();
  if (!documentsStore.getIsBulkEditMode()) {
    event.currentTarget.checked = false;
    return;
  }
  const $documentItem = $(event.currentTarget).closest("li[data-doc-id]");
  const documentId = $documentItem.data("docId");
  documentsStore.setSelected(documentId, event.currentTarget.checked);
}

function onSelectAllDocuments() {
  if (!documentsStore.getIsBulkEditMode()) {
    return;
  }
  documentsStore.selectAllVisible(getVisibleDocumentIds());
}

function onClearDocumentsSelection() {
  if (!documentsStore.getIsBulkEditMode()) {
    return;
  }
  documentsStore.clearSelection();
}

async function onDeleteSelectedDocuments() {
  if (!documentsStore.getIsBulkEditMode()) {
    return;
  }
  const selectedIds = documentsStore.getSelectedIds();
  if (selectedIds.length === 0) {
    return;
  }

  const { failed = [] } =
    await documentService.deleteDocumentsBulk(selectedIds);
  if (failed.length > 0) {
    console.error("Failed to delete some documents:", failed);
  }
}

function onToggleDocumentsBulkEditMode() {
  documentsStore.toggleBulkEditMode();
}
// #endregion

function uploadNewVersion(docId) {
  $documentVersionInput.click();
  $documentVersionInput.one("change", (e) => onVersionInputChange(e, docId));
}

async function deleteDocument(docId) {
  try {
    await documentService.deleteDocument(docId);
  } catch (err) {
    console.error("Failed to delete document:", err);
  }
}

createUI({
  setup: () => {
    const documentNameEditor = initInlineEditor({
      $scope: $documentsList,
      onSave: (newValue, $view) => {
        const docId = $view.closest("li").data("docId");
        documentService.renameDocument(docId, newValue);
      },
    });
    function renameDocument(docId) {
      const $documentNameView = getDocumentItem(docId).find(
        ".inline-editor__view",
      );
      setTimeout(() => documentNameEditor.startEdit($documentNameView), 0);
    }

    function getActionsMenu(docId) {
      const menu = {};
      menu[""] = [
        {
          label: "Rename Document",
          function_call: renameDocument,
          text_icon: undefined,
          type: undefined,
          params: [docId],
        },
        {
          label: "Upload New Version",
          function_call: uploadNewVersion,
          text_icon: undefined,
          type: undefined,
          params: [docId],
        },
        {
          label: "Delete Document",
          function_call: deleteDocument,
          text_icon: undefined,
          type: undefined,
          params: [docId],
        },
      ];
      return menu;
    }
    return { getActionsMenu };
  },
  bindListeners: ({ getActionsMenu }) => {
    $documentsInput.on("change", onDocumentsInputChange);
    $documentsList.on("mousedown", "li[data-doc-id]", onDocItemClick);
    $documentsList.on("mousedown", ".more-actions-btn", (e) =>
      onDocItemActionsBtnClick(e, getActionsMenu),
    );
    $documentsList.on(
      "mousedown",
      ".item-select-checkbox",
      onDocumentCheckboxMouseDown,
    );
    $documentsList.on(
      "change",
      ".item-select-checkbox",
      onDocumentCheckboxChange,
    );
    $documentsSelectAllButton.on("click", onSelectAllDocuments);
    $documentsClearSelectionButton.on("click", onClearDocumentsSelection);
    $documentsDeleteSelectedButton.on("click", onDeleteSelectedDocuments);
    $documentsBulkEditToggleButton.on("click", onToggleDocumentsBulkEditMode);
    syncDocumentsBulkModeUI();
  },
  subscribeStores: () => {
    documentsStore.subscribe((state, { key, operation, value }) => {
      switch (key) {
        case "entitiesById":
          switch (operation) {
            case "init":
              $documentsList.find("li[data-doc-id]").remove();
              value.forEach((doc) => addDocumentItem(doc));
              syncDocumentsCount();
              syncDocumentSelectionsInView();
              syncDocumentsSelectionControls();
              break;
            case "add":
              addDocumentItem(value);
              syncDocumentsCount();
              syncDocumentsSelectionControls();
              break;
            case "update":
              syncDocumentItem(value.id, { name: value.name });
              break;
            case "delete":
              if (value?.id) {
                removeDocumentItem(value.id);
              }
              syncDocumentsCount();
              syncDocumentsSelectionControls();
              break;
            default:
              break;
          }
          break;
        case "entitiesById.versions":
          if (operation === "add") {
            syncDocumentItem(value.documentId, { versionName: value.name });
          }
          break;
        case "selectedIds":
          syncDocumentSelectionsInView();
          syncDocumentsSelectionControls();
          break;
        case "isBulkEditMode":
          syncDocumentsBulkModeUI();
          syncDocumentSelectionsInView();
          break;
        default:
          break;
      }
    });
    workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "viewedDocument": {
          const newDocId = newValue?.id;
          const oldDocId = oldValue?.id;
          if (newDocId === oldDocId) {
            break;
          }
          if (newDocId) {
            setDocumentItemCurrent(newDocId, true);
          }
          if (oldDocId) {
            setDocumentItemCurrent(oldDocId, false);
          }
          break;
        }
        default:
          break;
      }
    });
  },
});
