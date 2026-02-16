import { workspaceStore, documentsStore } from "../store/index.js";
import { workspaceService, documentService } from "../services/index.js";
import { $cloneTemplate } from "../../../shared/util/dom.js";
import initInlineEditor from "../../../shared/ui/inlineEditor.js";
const $documentsList = $("#documentsList");
const documentNameEditor = initInlineEditor({
  $scope: $documentsList,
  onSave: (name, $view) => {
    const documentId = $view.closest("li").data("docId");
    console.log("Saving document name:", name, "for documentId:", documentId);
    // documentService.updateDocument(documentId, { name });
  },
});
const getFileContentInHTML = async (file) => {
  let fileContent = "";
  if (file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fileContent += content.items.map((item) => item.str).join(" ") + "\n";
    }
  } else if (
    file.type === "application/msword" ||
    file.name.endsWith(".doc") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    fileContent = new DOMParser().parseFromString(result.value, "text/html")
      .body.innerHTML;
  } else {
    fileContent = await file.text();
  }
  return fileContent;
};

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
$("#documentsInput").on("change", async (event) => {
  event.preventDefault();
  event.stopPropagation();
  for (const file of event.target.files) {
    try {
      const content = await getFileContentInHTML(file);
      const name = file.name;
      documentService.uploadDocument({ name, content });
    } catch (error) {
      console.error("Error processing file:", error);
    }
  }
});
$documentsList.on("mousedown", "li", (e) => {
  // const $li = $(e.currentTarget);
  // const docId = $li.data("docId");
  const docId = e.currentTarget.dataset.docId;
  workspaceService.activateDocumentById(docId);
});
$documentsList.on("mousedown", "li > :last-child", (e) => {
  e.stopPropagation();
  // const $td = ;
  const $documentItem = $(e.currentTarget).parent();
  const documentId = $documentItem.data("docId");
  const $documentNameView = $documentItem.find(".inline-editor__view");

  console.log("Actions clicked for documentId:", documentId);
  const menu = {};
  menu[""] = [
    {
      label: "Rename Document",
      function_call: ($documentNameView) => {
        setTimeout(() => documentNameEditor.startEdit($documentNameView), 0);
      },
      text_icon: undefined,
      type: undefined,
      params: [$documentNameView],
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
