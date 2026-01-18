let $documentList;

const onDocumentItemSelect = (event) => {
  event.stopPropagation();
  const docId = $(event.currentTarget).data("docid");
  activeDocumentStore.setActiveDocumentId(docId);
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

  $span = $("<span>").text(documentName);
  const deleteDocButton = $("<button>")
    .text("Delete")
    .on("click", async (event) => {
      event.stopPropagation();
      documentsStore.deleteDocumentById(documentId).then(() => {
        removeDocumentItem(documentId);
      });
      // const activeDocumentId = Store.getActiveDocumentId();
      // const $li = $documentList
      //   .children()
      //   .filter((index, element) => $(element).data("docid") === documentId);

      //   await deleteDocument(documentId);
      //   $li.remove();
      // if (activeDocumentId === doc.id) {
      //   $documentContent.empty();
      //   activeDocumentId = null;
      //   $generateButton.prop('disabled', true);
      // }
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

const getFileContentInHTML = async (file) => {
  let fileContent = "";
  if (file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let pdfText = "";
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

$(document).ready(function () {
  $documentList = $("#documentList");
  $("#documentsInput").on("change", async (event) => {
    for (const file of event.target.files) {
      if (!file) continue;
      const content = await getFileContentInHTML(file);
      const name = file.name;
      documentsStore.createDocument({ name, content }).then((id) => {
        renderDocumentItem({ id, name });
        activeDocumentStore.setActiveDocumentId(id);
      });
    }
  });
});

Store.activeDocument.subscribe((state, { key, oldValue, newValue }) => {
  if (key === "activeDocumentId") {
    highlightActiveDocumentItem(newValue);
  }
});
