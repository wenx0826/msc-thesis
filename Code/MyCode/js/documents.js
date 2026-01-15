let $documentList;

const loadDocumentList = async () => {
  const documentList = await getDocumentList(db);
  Store.setDocumentList(documentList);
  documentList.forEach((doc) => {
    renderDocumentItem(doc);
  });
};

const loadDocument = async (docId) => {
  const content = await getDocumentContentById(db, docId);
  const htmlContent = new DOMParser().parseFromString(content, "text/html").body
    .innerHTML;
  $("#documentContent").html(htmlContent || "");
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
