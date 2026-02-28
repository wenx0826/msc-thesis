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
// #endregion

// #region DOM Rendering and Manipulation
function syncDocumentsCount() {
  const count = documentsStore.getCount();
  $documentsCount.text(count);
}

function addDocumentItem({ id: docId, name }) {
  const $documentItem = createTemplateElement("documentItemTemplate");
  $documentItem.attr("data-doc-id", docId);
  $documentItem.find("[data-ref='documentName']").text(name);
  const versionName = documentsStore.getLatestVersionName(docId);
  $documentItem.find("[data-ref='versionName']").text(versionName);
  $documentsList.append($documentItem);
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
  const documentId = $(event.currentTarget).data("docId");
  workspaceService.displayDocument(documentId);
}

function onDocItemActionsBtnClick(event, getActionsMenu) {
  event.stopPropagation();
  const $documentItem = $(event.currentTarget).closest("li");
  const documentId = $documentItem.data("docId");
  const menu = getActionsMenu(documentId);
  createMenu(event, menu);
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
    $documentsList.on("mousedown", "li", onDocItemClick);
    $documentsList.on("mousedown", "li > :last-child", (e) =>
      onDocItemActionsBtnClick(e, getActionsMenu),
    );
  },
  subscribeStores: ({}) => {
    documentsStore.subscribe((state, { key, operation, value }) => {
      switch (key) {
        case "entitiesById":
          switch (operation) {
            case "init":
              value.forEach((doc) => addDocumentItem(doc));
              syncDocumentsCount();
              break;
            case "add":
              addDocumentItem(value);
              syncDocumentsCount();
              break;
            case "update":
              syncDocumentItem(value.id, { name: value.name });
              break;
            case "delete":
              removeDocumentItem(value.id);
              syncDocumentsCount();
              break;
          }
          break;
        case "entitiesById.versions":
          if (operation === "add") {
            syncDocumentItem(value.documentId, { versionName: value.name });
          }
        default:
          break;
      }
    });
    workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
      switch (key) {
        case "viewedDocument":
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
        default:
          break;
      }
    });
  },
});
