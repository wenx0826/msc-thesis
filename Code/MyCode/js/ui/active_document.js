let $documentContent;
let $generateButton;
let $regenerateButton;
let $tracesLayer;
let $temporarySelectionsLayer;
let $deleteSelectionButton;

let temporarySelections = [];
const hasTemporarySelections = () => {
  return temporarySelections.length > 0;
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

  $generateButton.on("click", async () => {
    const selectedText = getSelectedText();
    console.log("Selected text:", selectedText);
    $generateButton.prop("disabled", true);
    activeModelStore.generateNewModel(selectedText);
    // const text = Store.activeModel.setStatus("generating");
    // API.Model.generateModel();
  });

  $regenerateButton.on("click", async () => {
    $generateButton.prop("disabled", true);
    $regenerateButton.prop("disabled", true);
    activeModelStore.regenerateModel();
  });
});

activeDocumentStore.subscribe((state, { key, oldValue, newValue }) => {
  switch (key) {
    case "status":
      if (newValue === "loading") {
        $documentContent.text("Loading document...");
      }
      break;
    case "content":
      if (newValue) {
        const htmlContent = new DOMParser().parseFromString(
          newValue,
          "text/html",
        ).body.innerHTML;
        $documentContent.html(htmlContent || "");
        clearTemporarySelections();
        rerenderTracesLayer();
      } else {
        clearDocumentViewer();
      }
      break;
    case "activeDocumentId":
      break;
  }
});

activeModelStore.subscribe((state, { key, oldValue, newValue }) => {
  if (key === "model") {
    if (newValue && newValue.id) highlightActiveModelSelections(newValue.id);
  }
});

const getSelectedText = () => {
  return temporarySelections.map((range) => range.toString()).join(" ");
};
const clearTraceLayer = () => {
  $tracesLayer.empty();
};
const clearTemporarySelections = () => {
  if (hasTemporarySelections()) {
    temporarySelections = [];
    $temporarySelectionsLayer.empty();
  }
};
const clearOverlayLayers = () => {
  clearTraceLayer();
  clearTemporarySelections();
};
const clearDocumentViewer = () => {
  $("#documentContent").empty();
  clearOverlayLayers();
};

const onRangeSelect = (event) => {
  event.stopPropagation();
  const $target = $(event.currentTarget).parent();
  $target.addClass("selected");
  const rangeId = $target.attr("id");
  $target.siblings().removeClass("selected");

  const rangeBoundingRect = $target[0].getBoundingClientRect();

  $(document).one("mousedown", () => {
    $deleteSelectionButton.hide();
    $target.removeClass("selected");
  });

  $deleteSelectionButton
    .show()
    .css({
      top: `${rangeBoundingRect.top + window.scrollY - 12}px`,
      left: `${rangeBoundingRect.right + window.scrollX - 12}px`,
    })
    .on("click", () => {
      // Remove range from highlightSelections and temporarySelections
      highlightSelections = highlightSelections.filter((r) => r.id !== rangeId);
      temporarySelections = temporarySelections.filter((r) => r.id !== rangeId);
      // Remove the highlight from the UI
      $target.remove();
      $deleteSelectionButton.hide();
    });
};

const renderSelection = (range, modelId) => {
  const rangeId = range.id || Date.now();

  const $selectionDiv = $("<div>")
    .attr("id", rangeId)
    .attr("data-modelid", modelId || "")
    .addClass(
      `selection-wrapper ${modelId == activeModelStore.getModelId() ? "active" : ""}`,
    )
    .css({
      top: `${range.getBoundingClientRect().top + window.scrollY}px`,
      left: `${range.getBoundingClientRect().left + window.scrollX}px`,
      width: `${range.getBoundingClientRect().width}px`,
      height: `${range.getBoundingClientRect().height}px`,
    });
  const $rangeRect = $("<div>").addClass("range-rect");
  const rects = range.getClientRects();
  for (const rect of rects) {
    const $rectDiv = $rangeRect.clone();
    $rectDiv
      .css({
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      })
      .on("click", onRangeSelect);
    $selectionDiv.append($rectDiv);
  }

  if (modelId) {
    const lastIndex = rects.length - 1;
    const lastRect = rects[lastIndex];

    const modelName = modelsStore.getModelNameById(modelId);

    const labelSpan = $("<span>")
      .attr("data-modelid", modelId)
      .addClass("label-span")
      .text(`${modelName}`)
      .css({
        top: `${lastRect.top + window.scrollY - 10}px`,
        left: `${lastRect.right + window.scrollX}px`,
      })
      .on("click", (event) => {
        event.stopPropagation();
        activeModelStore.setModelById(modelId);
      });
    $selectionDiv.append(labelSpan);
    $tracesLayer.append($selectionDiv);
  } else {
    $temporarySelectionsLayer.append($selectionDiv);
  }
};

const highlightActiveModelSelections = (activeModelId) => {
  $tracesLayer.find(".selection-wrapper").each((index, element) => {
    const $element = $(element);
    const elementModelId = $element.data("modelid");
    if (elementModelId === activeModelId) {
      $element.addClass("active");
    } else {
      $element.removeClass("active");
    }
  });
};

function removeSelectionsByModelId(modelId) {
  console.log("Removing selections for model ID:", modelId);
  $tracesLayer.find(`.selection-wrapper[data-modelid="${modelId}"]`).remove();
}

const rerenderTemporarySelectionsLayer = () => {
  if (Store.hasTemporarySelections()) {
    $temporarySelectionsLayer.empty();
    Store.getTemporarySelections().forEach((range) => renderSelection(range));
  }
};
const renderTrace = ({ selections, model_id: modelId }) => {
  selections.forEach((serializedRange) => {
    const range = deserializeRange(serializedRange);
    renderSelection(range, modelId);
  });
};

const rerenderTracesLayer = () => {
  clearTraceLayer();
  const traces = activeDocumentStore.getTraces();
  traces.forEach((trace) => renderTrace(trace));
};

const rerenderOverlayLayers = () => {
  rerenderTracesLayer();
  rerenderTemporarySelectionsLayer();
};

const handleTextSelection = () => {
  const selection = window.getSelection();

  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;
  // if (!content.contains(range.commonAncestorContainer)) return;
  $generateButton.prop("disabled", false);
  const activeModelId = activeModelStore.getModelId();
  if (activeModelId) {
    // $generateButton.hide();
    $generateButton.text("Generate New Model");
    $regenerateButton.show();
  } else {
    // $generateButton.show();
    $generateButton.text("Generate Model");
  }
  const clonedRange = range.cloneRange();
  clonedRange.id = Date.now();
  temporarySelections.push(clonedRange);
  renderSelection(range);
  selection.removeAllRanges();
};

$(window).on("resize", rerenderOverlayLayers);
