import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore, documentsStore } from "../store/index.js";
import { workspaceService, documentService } from "../services/index.js";
import { $cloneTemplate } from "../../../shared/utils/dom.js";
import initInlineEditor from "../../../shared/widgets/inline-editor.js";

const $documentsInput = $("#documentsInput");
const $documentUpdateInput = $("#documentUpdateInput");
const $documentsList = $("#documentsList");

function getLatestVersion(versions) {
  return versions[versions.length - 1];
}

function getVersionName(versions, versionId) {
  const version = versions.find((v) => v.id === versionId);
  return version ? version.name : "Untitled Document";
}
function renderDocumentItem({ id: docId, versions }) {
  const latestVersion = versions.at(-1);
  const $documentItem = $cloneTemplate("documentItemTemplate")
    .children()
    .first();
  $documentItem.attr("data-doc-id", docId);
  $documentItem.attr("data-doc-version-id", latestVersion.id);
  $documentItem.find("[data-ref='documentName']").text(latestVersion.name);
  $documentsList.append($documentItem);
}

function rerenderDocumentItem(docId, versionId, name) {
  if (!name) {
    name = documentsStore.getVersionName(docId, versionId);
  }
  const $documentItem = $documentsList.find(`li[data-doc-id='${docId}']`);
  $documentItem.attr("data-doc-version-id", versionId);
  $documentItem.find("[data-ref='documentName']").text(name);
}

const highlightActiveDocumentItem = (displayedDocumentId) => {
  $documentsList.children().each((index, element) => {
    const $element = $(element);
    if ($element.data("docId") === displayedDocumentId) {
      $element.addClass("active");
    } else {
      $element.removeClass("active");
    }
  });
};

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
function updateDisplayedDocVersionSelector(versionId) {
  const displayedDocument = workspaceStore.state.displayedDocument;
  if (!displayedDocument) return;
  workspaceService.displayDocument({
    id: displayedDocument.id,
    versionId,
  });
}
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
        const docVersionId = $view.closest("li")[0].dataset.docVersionId;
        documentService.renameVersion(docVersionId, newValue);
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
      const id = e.currentTarget.dataset.docId;
      const versionId = e.currentTarget.dataset.docVersionId;
      workspaceService.displayDocument({ id, versionId });
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
  subscribeStores: ({ displayedDocVersionSelector }) => {
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
          const displayedDocumentId = workspaceStore.state.displayedDocument.id;
          rerenderDocumentItem(value.documentId, value.id, value.name);
          if (docId === displayedDocumentId) {
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
        case "displayedDocument":
          if (newValue.id) {
            highlightActiveDocumentItem(newValue.id);
            const versions = documentsStore.getVersions(newValue.id);
            rerenderDocumentItem(newValue.id, newValue.versionId);
          } else if (oldValue?.id) {
            // highlightActiveDocumentItem(null);
          }
          break;
        default:
          break;
      }
    });
  },
});
