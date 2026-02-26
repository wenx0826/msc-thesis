import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore, documentsStore } from "../store/index.js";
import { workspaceService, documentService } from "../services/index.js";
import { createTemplateElement } from "../../../shared/utils/dom.js";
import initInlineEditor from "../../../shared/widgets/inline-editor.js";

// #region DOM References
const $documentsInput = $("#documentsInput");
const $documentVersionInput = $("#documentVersionInput");
const $documentsList = $("#documentsList");
// #endregion

// #region DOM Rendering and Manipulation
function updateDocumentsCount() {
  const count = documentsStore.getCount();
  $("[data-ref='documentsCount']").text(count);
}

function renderDocumentItem({ id: docId, name }) {
  const $documentItem = createTemplateElement("documentItemTemplate");
  $documentItem.attr("data-doc-id", docId);
  $documentItem.find("[data-ref='documentName']").text(name);
  $documentsList.append($documentItem);
}

function getDocumentItem(docId) {
  return $documentsList.find(`li[data-doc-id='${docId}']`);
}

function rerenderDocumentItem(docId, name) {
  const $documentItem = getDocumentItem(docId);
  $documentItem.find("[data-ref='documentName']").text(name);
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
function onDocumnentsInputChange(event) {
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
  workspaceService.displayDocument({ id: documentId });
}

function onDocItemActionsBtnClick(event, renameDocument, uploadNewVersion) {
  event.stopPropagation();
  const $documentItem = $(event.currentTarget).parent();
  const documentId = $documentItem.data("docId");

  const menu = {};
  menu[""] = [
    {
      label: "Rename Document",
      function_call: renameDocument,
      text_icon: undefined,
      type: undefined,
      params: [documentId],
    },
    {
      label: "Upload New Version",
      function_call: uploadNewVersion,
      text_icon: undefined,
      type: undefined,
      params: [documentId],
    },
    {
      label: "Delete Document",
      function_call: () => {},
      text_icon: undefined,
      type: undefined,
      params: [documentId],
    },
  ];
  new CustomMenu(event).contextmenu(menu);
}
// #endregion

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

    return { renameDocument };
  },
  bindListeners: ({ renameDocument }) => {
    $documentsInput.on("change", onDocumnentsInputChange);
    function uploadNewVersion(docId) {
      $documentVersionInput.click();
      $documentVersionInput.one("change", (e) =>
        onVersionInputChange(e, docId),
      );
    }
    $documentsList.on("mousedown", "li", onDocItemClick);
    $documentsList.on("mousedown", "li > :last-child", (e) =>
      onDocItemActionsBtnClick(e, renameDocument, uploadNewVersion),
    );
  },
  subscribeStores: ({}) => {
    documentsStore.subscribe((state, { key, operation, value }) => {
      switch (operation) {
        case "init":
          value.forEach((doc) => renderDocumentItem(doc));
          updateDocumentsCount();
          break;
        case "add":
          renderDocumentItem(value);
          updateDocumentsCount();
          break;
        case "update":
          rerenderDocumentItem(value.id, value.name);
          break;
        case "delete":
          removeDocumentItem(value.id);
          updateDocumentsCount();
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
