let $tracesLayer;
let $temporarySelectionsLayer;
let $deleteSelectionButton;

const clearTraceLayer = () => {
  $tracesLayer.empty();
};

const clearTemporarySelections = () => {
  if (Store.hasTemporarySelections()) {
    Store.setTemporarySelections([]);
    $temporarySelectionsLayer.empty();
  }
};
const clearOverlayLayers = () => {
  clearTraceLayer();
  clearTemporarySelections();
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
      `selection-wrapper ${modelId == Store.getActiveModelId() ? "active" : ""}`
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

    const modelName = Store.getModelNameById(modelId);

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
        Store.setActiveModelById(modelId);
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
  const activeDocumentTraces = Store.getActiveDocumentTraces();
  activeDocumentTraces.forEach((trace) => renderTrace(trace));
};

const rerenderOverlayLayers = () => {
  rerenderTracesLayer();
  rerenderTemporarySelectionsLayer();
};
// #endregion

const handleTextSelection = () => {
  const selection = window.getSelection();

  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;
  // if (!content.contains(range.commonAncestorContainer)) return;
  $generateButton.prop("disabled", false);
  const activeModelId = Store.getActiveModelId();
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
  Store.addTemporarySelection(clonedRange);
  renderSelection(range);
  selection.removeAllRanges();
};

$(document).ready(function () {
  $tracesLayer = $("#tracesLayer");
  $temporarySelectionsLayer = $("#temporarySelectionsLayer");
});
