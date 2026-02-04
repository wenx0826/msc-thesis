// Documents UI Module
import { workspaceStore, documentsStore } from "../store/index.js";
import { workspaceService, documentService } from "../services/index.js";

let $documentList;

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

const onDocumentItemSelect = (event) => {
  event.stopPropagation();
  const docId = $(event.currentTarget).data("docid");
  workspaceService.activateDocumentById(docId);
};

const removeDocumentItem = (documentId) => {
  $documentList
    .children()
    .filter((index, element) => $(element).data("docid") === documentId)
    .remove();
};

const renderDocumentItem = async ({ id: documentId, name: documentName }) => {
  const $li = $("<li>");
  $li.attr("data-docid", String(documentId));
  $li.on("click", onDocumentItemSelect);

  const $span = $("<span>").text(documentName);
  const deleteDocButton = $("<button>")
    .text("Delete")
    .prop("disabled", true)
    .on("click", async (event) => {
      event.stopPropagation();
      documentsStore.deleteDocumentById(documentId).then(() => {
        // removeDocumentItem(documentId);
      });
    });
  $li.append($span);
  $li.append(deleteDocButton);
  $li.attr("data-docid", String(documentId));
  $documentList.append($li);
};

const highlightActiveDocumentItem = (activeDocumentId) => {
  $documentList.children().each((index, element) => {
    const $element = $(element);
    if ($element.data("docid") === activeDocumentId) {
      $element.addClass("active");
    } else {
      $element.removeClass("active");
    }
  });
};

export function initDocumentsUI() {
  $documentList = $("#documentList");

  // Set up file input handler
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

  // Subscribe to store changes
  workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
    switch (key) {
      case "activeDocumentId":
        highlightActiveDocumentItem(newValue);
        break;
      default:
        break;
    }
  });

  documentsStore.subscribe((state, { key, operation, id }) => {
    switch (operation) {
      case "init":
        state.documents.forEach((doc) => {
          renderDocumentItem(doc);
        });
        break;
      case "add":
        renderDocumentItem(state.documents.find((doc) => doc.id === id));
        break;
      case "delete":
        removeDocumentItem(id);
        break;
    }
  });

  console.log("Documents UI initialized");
}
