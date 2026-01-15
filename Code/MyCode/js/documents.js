let $documentList;

const loadDocumentList = async () => {
  const documentList = await getDocumentList(db);
  Store.setDocumentList(documentList);
  documentList.forEach((doc) => {
    renderDocumentItem(doc);
  });
};

const onDocumentSelect = async (event) => {
  event.stopPropagation();
  const docId = $(event.currentTarget).data("docid");
  setActiveDocument(docId);
};

const renderDocumentItem = async (doc) => {
  console.log("Rendering document item:", doc);
  const $li = $("<li>");
  $li.attr("data-docid", String(doc.id));
  $li.on("click", onDocumentSelect);
  $span = $("<span>").text(doc.name);
  const deleteDocButton = $("<button>")
    .text("Delete")
    .on("click", async (event) => {
      event.stopPropagation();
      await deleteDocument(doc.id);
      $li.remove();
      // if (activeDocId === doc.id) {
      //   $documentContent.empty();
      //   activeDocId = null;
      //   $generateButton.prop('disabled', true);
      // }
    });
  $li.append($span);
  $li.append(deleteDocButton);
  $li.attr("data-docid", String(doc.id));
  //   $li.on("click", onDocumentSelect);
  $documentList.append($li);
};

const setActiveDocument = async (docId) => {
  const activeDocId = Store.getActiveDocumentId();
  if (docId && docId != activeDocId) {
    if (Store.getActiveModelDocumentId() != docId) {
      Store.setActiveModel(null);
    }
    Store.setActiveDocumentId(docId);
    $documentList.children().each((index, element) => {
      const $element = $(element);
      if ($element.data("docid") === docId) {
        $element.addClass("active");
      } else {
        $element.removeClass("active");
      }
    });
    await loadDocument(docId);
    // clearTemporarySelections();
    // rerenderTracesLayer();
  }
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
      const documentId = await createDocument(db, file.name, content);
      renderDocumentItem({ id: documentId, name: file.name });
      setActiveDocument(documentId);
    }
  });
});
