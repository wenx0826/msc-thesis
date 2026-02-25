import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore, documentsStore } from "../store/index.js";
import { workspaceService, documentService } from "../services/index.js";
import { createTemplateElement } from "../../../shared/utils/dom.js";
import initInlineEditor from "../../../shared/widgets/inline-editor.js";

const $documentsInput = $("#documentsInput");
const $documentUpdateInput = $("#documentUpdateInput");
const $documentsList = $("#documentsList");

function renderDocumentItem({ id: docId, name }) {
  const $documentItem = createTemplateElement("documentItemTemplate");
  $documentItem.attr("data-doc-id", docId);
  // $documentItem.attr("data-doc-version-id", resolvedLatestVersion.id);
  $documentItem.find("[data-ref='documentName']").text(name);
  $documentsList.append($documentItem);
}

function getDocumentItem(documentId) {
  return $documentsList.find(`li[data-doc-id='${documentId}']`);
}
function rerenderDocumentItem(docId, versionId, name) {
  // if (!name) {
  //   name = documentsStore.getVersionDisplayName(docId, versionId);
  // }
  const $documentItem = getDocumentItem(docId);
  $documentItem.attr("data-doc-version-id", versionId);
  $documentItem.find("[data-ref='documentName']").text(name);
}

function highlightViewedDocumentItem(viewedDocumentId) {
  $documentsList.children().each((index, element) => {
    const $element = $(element);
    if ($element.data("docId") === viewedDocumentId) {
      $element.addClass("active");
    } else {
      $element.removeClass("active");
    }
  });
}

function updateDocument(documentId) {
  $documentUpdateInput.click();
  $documentUpdateInput.one("change", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.target.files[0];
    if (!file) return;
    documentService.updateDocument(documentId, file);
    // Placeholder for update logic, e.g., open an edit modal or inline editor
  });
}

const removeDocumentItem = (documentId) => {
  $documentsList
    .children()
    .filter((index, element) => $(element).data("docId") === documentId)
    .remove();
};

function updateDocumentsCount() {
  const count = documentsStore.getCount();
  $("[data-ref='documentsCount']").text(count);
}
createUI({
  setup: () => {
    const documentNameEditor = initInlineEditor({
      $scope: $documentsList,
      onSave: (newValue, $view) => {
        // const doc = $view.closest("li")[0].dataset;
        // const documentId = doc.docId;
        const docId = $view.closest("li")[0].dataset.docId;
        documentService.renameDocument(docId, newValue);
      },
    });
    return { documentNameEditor };
  },
  bindListeners: ({ documentNameEditor }) => {
    $documentsInput.on("change", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      for (const file of event.target.files) {
        try {
          documentService.uploadDocument(file);
        } catch (error) {
          console.error("Error processing file:", error);
        }
      }
    });
    $documentsList.on("mousedown", "li", (e) => {
      const id = e.currentTarget.dataset.docId;
      workspaceService.displayDocument({ id });
    });
    $documentsList.on("mousedown", "li > :last-child", (e) => {
      e.stopPropagation();
      // const $td = ;
      const $documentItem = $(e.currentTarget).parent();
      const documentId = $documentItem.data("docId");
      const $documentNameView = $documentItem.find(".inline-editor__view");

      const menu = {};
      menu[""] = [
        {
          label: "Rename Document",
          function_call: ($documentNameView) => {
            setTimeout(
              () => documentNameEditor.startEdit($documentNameView),
              0,
            );
          },
          text_icon: undefined,
          type: undefined,
          params: [$documentNameView],
        },
        {
          label: "Upload New Version",
          function_call: updateDocument,
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

      new CustomMenu(e).contextmenu(menu);
    });
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
        case "versions.add":
          const docId = value.documentId;
          const viewedDocumentId = workspaceStore.state.viewedDocument.id;
          rerenderDocumentItem(value.documentId, value.id, value.name);
          if (docId === viewedDocumentId) {
            // updateVersionSelect(value.id);
          }
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
          if (newValue.id) {
            rerenderDocumentItem(newValue.id, newValue.versionId);
            highlightViewedDocumentItem(newValue.id);
          } else if (oldValue?.id) {
            // highlightViewedDocumentItem(null);
          }
          break;
        default:
          break;
      }
    });
  },
});
