let $documentContent;
let $generateButton;
let $tracesLayer;
let $temporarySelectionsLayer;
let $modelTagsLayer;
let $deleteSelectionButton;
let $editorWrap;
let $promptContent;

let temporarySelections = [];
const hasTemporarySelections = () => {
  return temporarySelections.length > 0;
};

$(document).ready(function () {
  $tracesLayer = $("#tracesLayer");
  $temporarySelectionsLayer = $("#temporarySelectionsLayer");
  $modelTagsLayer = $("#modelTagsLayer");
  $deleteSelectionButton = $("#deleteSelectionButton");
  $generateButton = $("#generateButton");
  $promptContent = $("#promptContent");
  $promptContainer = $("#promptContainer");
  $documentContent = $("#documentContent");
  $editorWrap = $("#editorWrap");
  $documentContent.on("mouseup", handleTextSelection);
  $editorWrap.on("scroll", rerenderOverlayLayers);

  $generateButton.on("click", async () => {
    const selectedText = getSelectedText();
    console.log("Selected text:", selectedText);
    $generateButton.prop("disabled", true);
    activeModelService.generateModelBySelections(selectedText);
    // const text = Store.activeModel.setStatus("generating");
  });
  $("#columnResizehandle1").on("dragcolumnmove", (e) => {
    // e.preventDefault();
    rerenderOverlayLayers();
  });
});

activeDocumentStore.subscribe((state, { key, oldValue, newValue, ...rest }) => {
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
      if (newValue) {
        const activeModelDocumentId = activeModelStore.getDocumentId();
        if (activeModelDocumentId != newValue) {
          activeModelStore.setModel(null);
        }
      }
      break;
    case "traces":
      rerenderTracesLayer();
      break;
    default:
      break;
  }
});

// activeModelStore.subscribe((state, { key, oldValue, newValue }) => {
//   if (key === "model") {
//     if (newValue && newValue.id) highlightActiveModelSelections(newValue.id);
//   }
// });

activeModelStore.subscribe((state, { key, oldValue, newValue }) => {
  if (key === "model") {
    const newModelId = newValue ? newValue.id : null;
    const oldModelId = oldValue ? oldValue.id : null;
    if (newModelId) {
      // highlightActiveModelInList(newValue.id);
      highlightActiveModelSelections(newValue.id);
      $generateButton.text("Regenerate Model");
      // $generateButton.prop("disabled", false);
      $promptContainer.show();
    } else {
      $generateButton.text("Generate Model");
      $promptContainer.hide();
    }
    if (oldModelId) {
      unhighlightActiveModelSelections(oldValue.id);
    }
  }
});

const getSelectedText = () => {
  return temporarySelections.map((range) => range.toString()).join(" ");
};
const clearTracesLayer = () => {
  $tracesLayer.empty();
};
const clearTagsLayer = () => {
  $modelTagsLayer.empty();
};
const clearTemporarySelections = () => {
  if (hasTemporarySelections()) {
    temporarySelections = [];
    $temporarySelectionsLayer.empty();
  }
};
const clearOverlayLayers = () => {
  clearTracesLayer();
  clearTagsLayer();
  clearTemporarySelections();
};
const clearDocumentViewer = () => {
  $("#documentContent").empty();
  clearOverlayLayers();
};

const onRangeSelect = (event) => {
  console.log("Range selected");
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

// #region Selection Range Serialization and Deserialization
function getXPath(node, root = document.getElementById("documentContent")) {
  if (node === root) return "/";
  const path = [];
  let cur = node;
  while (cur && cur !== root) {
    const idx = Array.prototype.indexOf.call(cur.parentNode.childNodes, cur);
    path.unshift(idx);
    cur = cur.parentNode;
  }
  return "/" + path.join("/");
}

function getNodeByXPath(
  path,
  root = document.getElementById("documentContent"),
) {
  const parts = path.split("/").filter(Boolean);
  let node = root;
  for (const idx of parts) {
    const i = parseInt(idx, 10);
    if (!node || !node.childNodes[i]) return null;
    node = node.childNodes[i];
  }
  return node;
}

const serializeRange = (range) => {
  return {
    id: range.id,
    // color: h.color,
    startXPath: getXPath(range.startContainer),
    startOffset: range.startOffset,
    endXPath: getXPath(range.endContainer),
    endOffset: range.endOffset,
  };
};

const deserializeRange = (serializedRange) => {
  const startNode = getNodeByXPath(serializedRange.startXPath);
  const endNode = getNodeByXPath(serializedRange.endXPath);
  const range = document.createRange();
  range.setStart(startNode, serializedRange.startOffset);
  range.setEnd(endNode, serializedRange.endOffset);
  range.id = serializedRange.id;
  return range;
};

// #endregion

const renderSelection = (range, modelId) => {
  const rangeId = range.id || Date.now();
  const color = getSelectionColor();
  const eleEditorWrap = $editorWrap[0];
  const eleEditorWrapRect = eleEditorWrap.getBoundingClientRect();
  const $rangeRect = $("<div>").addClass("range-rect");
  const rects = range.getClientRects();
  const $selectionDiv = $("<div>")
    .attr("id", rangeId)
    .attr("data-modelid", modelId || "")
    .addClass(
      `selection-wrapper ${modelId == activeModelStore.getModelId() ? "active" : ""}`,
    )
    .css({
      top: `${range.getBoundingClientRect().top - eleEditorWrapRect.top + eleEditorWrap.scrollTop}px`,
      left: `${range.getBoundingClientRect().left - eleEditorWrapRect.left + eleEditorWrap.scrollLeft}px`,
      width: `${range.getBoundingClientRect().width}px`,
      height: `${range.getBoundingClientRect().height}px`,
    });

  for (const rect of rects) {
    const $rectDiv = $rangeRect.clone();
    $rectDiv
      .css({
        top: `${rect.top - eleEditorWrapRect.top + eleEditorWrap.scrollTop}px`,
        left: `${rect.left - eleEditorWrapRect.left + eleEditorWrap.scrollLeft}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        // backgroundColor: "inherit",
        backgroundColor: getSelectionColor(),
      })
      .on("click", onRangeSelect);
    $selectionDiv.append($rectDiv);
  }

  if (modelId) {
    const lastIndex = rects.length - 1;
    const lastRect = rects[lastIndex];

    const modelName = modelsStore.getModelNameById(modelId);

    const tagSpan = $("<span>")
      .attr("data-modelid", modelId)
      .addClass("tag-span")
      .text(`${modelName}`)
      .css({
        top: `${lastRect.top - eleEditorWrapRect.top + eleEditorWrap.scrollTop}px`,
        left: `${lastRect.right - eleEditorWrapRect.left + eleEditorWrap.scrollLeft}px`,
      })
      .on("click", (event) => {
        event.stopPropagation();
        // activeModelStore.setModelById(modelId);
        const activeModel = activeModelStore.getModel();
        const activeModeId = activeModel ? activeModel.id : null;
        activeModelStore.setModelById(activeModeId == modelId ? null : modelId);
      });
    if (modelId == activeModelStore.getModelId()) {
      tagSpan.addClass("active");
    }
    // $selectionDiv.append(tagSpan);
    $tracesLayer.append($selectionDiv);
    $modelTagsLayer.append(tagSpan);
  } else {
    $temporarySelectionsLayer.append($selectionDiv);
  }
};

const highlightActiveModelSelections = (activeModelId) => {
  $modelTagsLayer
    .find(`.tag-span[data-modelid="${activeModelId}"]`)
    .addClass("active");
  $tracesLayer
    .find(`.selection-wrapper[data-modelid="${activeModelId}"]`)
    .addClass("active");
  // $tracesLayer.find(".selection-wrapper").each((index, element) => {
  //   const $element = $(element);
  //   const elementModelId = $element.data("modelid");
  //   if (elementModelId === activeModelId) {
  //     $element.addClass("active");
  //   } else {
  //     $element.removeClass("active");
  //   }
  // });
};

const unhighlightActiveModelSelections = (activeModelId) => {
  $modelTagsLayer
    .find(`.tag-span[data-modelid="${activeModelId}"]`)
    .removeClass("active");
  $tracesLayer
    .find(`.selection-wrapper[data-modelid="${activeModelId}"]`)
    .removeClass("active");
  // $tracesLayer.find(".selection-wrapper").each((index, element) => {
  //   const $element = $(element);
  //   const elementModelId = $element.data("modelid");
  //   if (elementModelId === activeModelId) {
  //     $element.addClass("active");
  //   } else {
  //     $element.removeClass("active");
  //   }
  // });
};

function removeSelectionsByModelId(modelId) {
  console.log("Removing selections for model ID:", modelId);
  $tracesLayer.find(`.selection-wrapper[data-modelid="${modelId}"]`).remove();
}

const rerenderTemporarySelectionsLayer = () => {
  console.log(
    "Rerendering temporary selections layer????",
    hasTemporarySelections(),
  );
  if (hasTemporarySelections()) {
    $temporarySelectionsLayer.empty();
    temporarySelections.forEach((range) => renderSelection(range));
  }
};

const renderTrace = ({ selections, model_id: modelId }) => {
  // const
  selections.forEach((serializedRange, index) => {
    const range = deserializeRange(serializedRange);
    if (index === 0) {
      console.log("First range!!:", modelId, "with range:", range);
    }
    renderSelection(range, modelId);
  });
};

const rerenderTracesLayer = () => {
  clearTracesLayer();
  clearTagsLayer();
  const traces = activeDocumentStore.getTraces();
  traces.forEach((trace) => renderTrace(trace));
};

const rerenderOverlayLayers = () => {
  rerenderTracesLayer();
  rerenderTemporarySelectionsLayer();
};

function getSelectionColor() {
  const form = document.getElementById("selectionColorForm");
  const color = new FormData(form).get("color");
  return color;
}

const handleTextSelection = () => {
  const selection = window.getSelection();

  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;
  // if (!content.contains(range.commonAncestorContainer)) return;
  $generateButton.prop("disabled", false);
  const activeModelId = activeModelStore.getModelId();

  const clonedRange = range.cloneRange();
  clonedRange.id = Date.now();
  temporarySelections.push(clonedRange);
  renderSelection(range);
  selection.removeAllRanges();
};

$(window).on("resize", rerenderOverlayLayers);
