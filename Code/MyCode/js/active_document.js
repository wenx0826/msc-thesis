let $documentContent;
let $generateButton;
let $regenerateButton;

const loadDocument = async (docId) => {
  const content = await getDocumentContentById(db, docId);
  const htmlContent = new DOMParser().parseFromString(content, "text/html").body
    .innerHTML;
  $("#documentContent").html(htmlContent || "");
};

const clearDocumentViewer = () => {
  $("#documentContent").empty();
};

$(document).ready(function () {
  $tracesLayer = $("#tracesLayer");
  $temporarySelectionsLayer = $("#temporarySelectionsLayer");

  $deleteSelectionButton = $("#deleteSelectionButton");
  $generateButton = $("#generateButton");
  $regenerateButton = $("#regenerateButton");
  $keepButton = $("#keepButton");
  $cancelButton = $("#cancelButton");
  $documentContent = $("#documentContent");
  $documentContent.on("mouseup", handleTextSelection);
  $documentContent.on("scroll", rerenderOverlayLayers);
  $(window).on("resize", rerenderOverlayLayers);

  $generateButton.on("click", async () => {
    $generateButton.prop("disabled", true);
    generateModel();
  });

  $regenerateButton.on("click", async () => {
    $generateButton.prop("disabled", true);
    $regenerateButton.prop("disabled", true);
    regenerateModel();
  });
});
