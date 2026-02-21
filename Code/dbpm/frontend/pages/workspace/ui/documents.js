import { createUI } from "../../../shared/util/ui.js";
import { workspaceStore, documentsStore } from "../store/index.js";
import { workspaceService, documentService } from "../services/index.js";
import { $cloneTemplate } from "../../../shared/util/dom.js";
import initInlineEditor from "../../../shared/widgets/inlineEditor.js";

const $documentsInput = $("#documentsInput");
const $documentsList = $("#documentsList");

const removeDocumentItem = (documentId) => {
  $documentsList
    .children()
    .filter((index, element) => $(element).data("docid") === documentId)
    .remove();
};

function renderDocumentItem({ id: documentId, name: documentName }) {
  const $documentItem = $cloneTemplate("documentItemTemplate")
    .children()
    .first();
  $documentItem.attr("data-doc-id", documentId);
  $documentItem.find("[data-ref='documentName']").text(documentName);
  $documentsList.append($documentItem);
}

const highlightActiveDocumentItem = (activeDocumentId) => {
  $documentsList.children().each((index, element) => {
    const $element = $(element);
    if ($element.data("docId") === activeDocumentId) {
      $element.addClass("active");
    } else {
      $element.removeClass("active");
    }
  });
};

function updateDocument(documentId) {
  // Placeholder for update logic, e.g., open an edit modal or inline editor
  console.log("Update document with ID:", documentId);
}

createUI({
  setup: () => {
    const documentNameEditor = initInlineEditor({
      $scope: $documentsList,
      onSave: (newValue, $view) => {
        const documentId = $view.closest("li").data("docId");
        // documentService.updateDocument(documentId, { name });
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
      const docId = e.currentTarget.dataset.docId;
      workspaceService.activateDocumentById(docId);
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
          label: "Update Document",
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
  subscribeStores: () => {
    workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
      switch (key) {
        case "activeDocumentId":
          highlightActiveDocumentItem(newValue);
          break;
        default:
          break;
      }
    });

    documentsStore.subscribe((state, { key, operation, id, value }) => {
      switch (operation) {
        case "init":
          value.forEach((doc) => renderDocumentItem(doc));
          break;
        case "add":
          renderDocumentItem(state.documents.find((doc) => doc.id === id));
          break;
        case "delete":
          removeDocumentItem(id);
          break;
      }
    });
  },
});
