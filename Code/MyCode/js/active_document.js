let $documentContent;
let $generateButton;
let $regenerateButton;

const loadDocument = async (docId) => {
  const content = await getDocumentContentById(API.db, docId);
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

  $documentContent = $("#documentContent");
  $documentContent.on("mouseup", handleTextSelection);
  $documentContent.on("scroll", rerenderOverlayLayers);
  $(window).on("resize", rerenderOverlayLayers);

  $generateButton.on("click", async () => {
    $generateButton.prop("disabled", true);
    API.Model.generateModel();
  });

  $regenerateButton.on("click", async () => {
    $generateButton.prop("disabled", true);
    $regenerateButton.prop("disabled", true);
    regenerateModel();
  });
});
