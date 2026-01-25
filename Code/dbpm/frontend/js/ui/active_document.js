let $documentContent;
let $generateButton;
let $selectionsLayer;
let $temporarySelectionsLayer;
let $modelTags;
let $deleteSelectionButton;
let $viewerWrap;
let $interactionLayer;

let selectedSelection = null;

$(function () {
  $interactionLayer = $("#interactionLayer");
  $selectionsLayer = $("#selectionsLayer");
  $temporarySelectionsLayer = $("#temporarySelectionsLayer");
  $modelTags = $("#modelTags");
  $deleteSelectionButton = $("#deleteSelectionButton");
  $generateButton = $("#generateButton");
  $documentContent = $("#documentContent");
  $viewerWrap = $("#viewerWrap");
  $documentContent.on("mouseup", handleTextSelection);
  $viewerWrap.on("scroll", rerenderOverlayLayers);

  $generateButton.on("click", async () => {
    // const selectedText = getSelectedText();
    $generateButton.prop("disabled", true);
    modelService.generateModelBySelections();
    // const text = Store.activeModel.setStatus("generating");
  });

  $("#columnResizehandle1").on("dragcolumnmove", (e) => {
    // e.stopPropagation();
    rerenderOverlayLayers();
  });

  $deleteSelectionButton.on("click", () => {
    if (selectedSelection) {
      const { selectionId, modelId } = selectedSelection;
      if (!modelId) {
        activeDocumentStore.removeTemporarySelectionById(selectionId);
      } else {
        activeDocumentStore.removeActiveModelTraceSelectionById(selectionId);
      }
      setSelectedSelection(null);
    }
  });
});

activeDocumentStore.subscribe((state, { key, operation, ...payload }) => {
  if (operation) {
    const { value } = payload;
    // console.log("11 activeDocumentStore subscription with operation:!!", value);
    switch (key) {
      case "traces":
        switch (operation) {
          case "init":
            rerenderSelectionsLayer();
            break;
          case "add":
            renderTrace(value);
            break;
          default:
            break;
        }
        break;
      case "activeModelTrace.selections":
        switch (operation) {
          case "remove":
            removeRenderedSelection(value);
            break;
          default:
            break;
        }
        break;
      case "temporarySelections":
        switch (operation) {
          case "add":
            renderSelection(value);
            break;
          case "remove":
            removeRenderedSelection(value);
            break;
          case "clear":
            value.forEach((selection) => {
              removeRenderedSelection(selection);
            });
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }
  } else {
    const { oldValue, newValue } = payload;
    switch (key) {
      case "status":
        if (newValue === "loading") {
          $documentContent.text("Loading document...");
        }
        break;
      case "htmlContent":
        if (newValue) {
          $documentContent.html(newValue || "");
        } else {
          clearDocumentViewer();
        }
        break;
      case "activeModelTrace":
        if (newValue) {
          console.log(
            "Active model trace changed:!!!!!!!!!",
            oldValue,
            newValue,
          );
          highlightActiveModelSelections(newValue.modelId);
          // scrollToSelection(newValue.selections[0].id);
          scrollToRange(newValue.selections[0].range);
        }
        if (oldValue) {
          unhighlightActiveModelSelections(oldValue.modelId);
        }

        break;
      default:
        break;
    }
  }
});

workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
  switch (key) {
    // case "activeDocumentId":
    //   if (newValue) {
    //     const tracesPromise = documentService.getTracesById(newValue);
    //     documentService.getHtmlContentById(newValue).then((content) => {
    //       $documentContent.html(content || "");
    //       tracesPromise.then((data) => {
    //         traces = data;
    //         rerenderSelectionsLayer();
    //       });
    //     });
    //   } else {
    //     clearDocumentViewer();
    //   }
    //   break;
    case "activeModelId":
      if (newValue) {
        // highlightActiveModelSelections(newValue);
        $generateButton.text("Regenerate Model");
        $generateButton.prop("disabled", false);
      } else {
        $generateButton.text("Generate Model");
      }
      if (oldValue) {
        // unhighlightActiveModelSelections(oldValue);
      }
      break;
    default:
      break;
  }
});

function scrollToSelection(selectionId) {
  const $selection = $selectionsLayer.find(
    `.selection-wrap[data-selectionid="${selectionId}"]`,
  );
  if ($selection.length > 0) {
    const eleViewerWrap = $viewerWrap[0];
    const eleViewerWrapRect = eleViewerWrap.getBoundingClientRect();
    const selectionRect = $selection[0].getBoundingClientRect();

    const offsetTop =
      selectionRect.top -
      eleViewerWrapRect.top +
      eleViewerWrap.scrollTop -
      eleViewerWrapRect.height / 2 +
      selectionRect.height / 2;
    const offsetLeft =
      selectionRect.left -
      eleViewerWrapRect.left +
      eleViewerWrap.scrollLeft -
      eleViewerWrapRect.width / 2 +
      selectionRect.width / 2;

    eleViewerWrap.scrollTo({
      top: offsetTop,
      left: offsetLeft,
      behavior: "smooth",
    });
  }
}

function scrollToRange(range, margin = 16) {
  const rects = range.getClientRects();
  if (!rects || rects.length === 0) return;

  // 用第一行当 anchor（最常见）
  const rect = rects[0];

  const eleViewerWrap = $viewerWrap[0];
  const eleViewerWrapRect = eleViewerWrap.getBoundingClientRect();
  // 把 viewport 坐标换成 scrollWrap 内坐标
  const y = rect.top - eleViewerWrapRect.top + eleViewerWrap.scrollTop;
  // eleViewerWrap.scrollTop = Math.max(0, y - margin);
  eleViewerWrap.scrollTo({
    top: Math.max(0, y - margin),
    // left: 0,
    behavior: "smooth",
  });
}

const clearSelectionsLayer = () => {
  $selectionsLayer.empty();
};

const clearInteractionLayer = () => {
  $modelTags.empty();
  $interactionLayer.children().not($modelTags).remove();
};

// const clearTemporarySelections = () => {
//   if (hasTemporarySelections()) {
//     temporarySelections = [];
//     // $temporarySelectionsLayer.empty();
//   }
// };
function removeRenderedSelection({ id: selectionId }) {
  $selectionsLayer
    .find(`.selection-wrap[data-selectionid="${selectionId}"]`)
    .each((index, element) => {
      const $element = $(element);
      const elementModelId = $element.attr("data-modelid");
      if (elementModelId) {
        $modelTags
          .find(
            `.tag-span[data-modelid="${elementModelId}"][data-selectionid="${selectionId}"]`,
          )
          .remove();
      }
      $element.remove();
    });

  $interactionLayer
    .find(`.selection-wrap[data-selectionid="${selectionId}"]`)
    .remove();
}
const clearOverlayLayers = () => {
  clearSelectionsLayer();
  clearInteractionLayer();
  clearTemporarySelections();
};

const clearDocumentViewer = () => {
  $("#documentContent").empty();
  clearOverlayLayers();
};

function setSelectedSelection(selection) {
  const currentSelectedSelection = selectedSelection;
  selectedSelection = selection;

  if (currentSelectedSelection) {
    $interactionLayer
      .find(
        `.selection-wrap[data-selectionid="${currentSelectedSelection.selectionId}"]`,
      )
      .removeClass("selected");
  }
  if (selection) {
    const { selectionId } = selection;
    $interactionLayer
      .find(`.selection-wrap[data-selectionid="${selectionId}"]`)
      .addClass("selected");
    $deleteSelectionButton.prop("disabled", false);
  } else {
    $deleteSelectionButton.prop("disabled", true);
  }
}
const onSelectionSelect = (event) => {
  // console.log("Range selected:", event);
  event.stopPropagation();
  const $target = $(event.currentTarget);
  // $target.addClass("selected");

  const selectionId = $target.attr("data-selectionid");
  const modelId = $target.attr("data-modelid");
  const traceId = $target.attr("data-traceid");
  setSelectedSelection({ selectionId, modelId, traceId });

  const $buttonGroup = $("#textActionBar .button-group");
  $(document).one("mousedown", (e) => {
    const $t = $(e.target);
    const isInsideTarget = $t.closest($target).length > 0;
    const isInsideButtonGroup = $t.closest($buttonGroup).length > 0;
    if (!isInsideTarget && !isInsideButtonGroup) {
      setSelectedSelection(null);
    }
  });

  // $deleteSelectionButton
  //   .show()
  //   .css({
  //     top: `${selectionRect.top + window.scrollY - 12}px`,
  //     left: `${selectionRect.right + window.scrollX - 12}px`,
  //   })
  //   .on("click", () => {
  //     // Remove range from highlightSelections and temporarySelections
  //     highlightSelections = highlightSelections.filter((r) => r.id !== rangeId);
  //     temporarySelections = temporarySelections.filter((r) => r.id !== rangeId);
  //     // Remove the highlight from the UI
  //     $target.remove();
  //     $deleteSelectionButton.hide();
  //   });
};

// #region Selection Range Serialization and Deserialization

// #endregion

const renderSelection = ({ range, color, id: selectionId }, modelId) => {
  const eleViewerWrap = $viewerWrap[0];
  const eleViewerWrapRect = eleViewerWrap.getBoundingClientRect();

  const rects = range.getClientRects();
  const selectionRect = range.getBoundingClientRect();
  const selectionRectTop = selectionRect.top;
  const selectionRectLeft = selectionRect.left;

  const $selectionDiv = $("<div>")
    .attr("data-selectionid", selectionId)
    .addClass("selection-wrap")
    .css({
      top: `${selectionRectTop - eleViewerWrapRect.top + eleViewerWrap.scrollTop}px`,
      left: `${selectionRectLeft - eleViewerWrapRect.left + eleViewerWrap.scrollLeft}px`,
      width: `${selectionRect.width}px`,
      height: `${selectionRect.height}px`,
    });

  const existingSelectionDiv = $selectionsLayer.find(
    `.selection-wrap[data-selectionid="${selectionId}"]`,
  );
  if (existingSelectionDiv.length > 0) {
    existingSelectionDiv.remove();
  }

  const $rangeRect = $("<div>").addClass("range-rect");
  for (const rect of rects) {
    const $rectDiv = $rangeRect.clone();
    $rectDiv
      .css({
        top: `${rect.top - selectionRectTop}px`,
        left: `${rect.left - selectionRectLeft}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        backgroundColor: color ? color : getSelectionColor(),
      })
      .on("click", onSelectionSelect);
    $selectionDiv.append($rectDiv);
  }
  $selectionsLayer.append($selectionDiv);

  if (modelId) {
    $selectionDiv.attr("data-modelid", modelId);
    const lastIndex = rects.length - 1;
    const lastRect = rects[lastIndex];

    const modelName = modelsStore.getModelNameById(modelId);

    const tagSpan = $("<span>")
      .attr("data-modelid", modelId)
      .attr("data-selectionid", selectionId)
      .addClass("tag-span")
      .text(`${modelName}`)
      .css({
        top: `${lastRect.top - eleViewerWrapRect.top + eleViewerWrap.scrollTop - 10}px`,
        left: `${lastRect.right - eleViewerWrapRect.left + eleViewerWrap.scrollLeft - 10}px`,
      })
      .on("click", (event) => {
        event.stopPropagation();
        workspaceService.toggleModelSelection(modelId);
      });
    if (modelId == workspaceStore.getActiveModelId()) {
      tagSpan.addClass("active");
    }
    // $selectionDiv.append(tagSpan);
    $modelTags.append(tagSpan);
  }
  if (!modelId || modelId == activeModelStore.getModelId()) {
    // const existingSelectionBox = $selectionsLayer.find(
    //   `.selection-wrap[data-selectionid="${selectionId}"]`,
    // );
    // if (existingSelectionBox.length > 0) {
    //   existingSelectionBox.remove();
    // }
    const $box = $selectionDiv.clone(false).empty();
    $box.appendTo($interactionLayer);
    $box.on("click", onSelectionSelect);
  }
};

const highlightActiveModelSelections = (activeModelId) => {
  $modelTags
    .find(`.tag-span[data-modelid="${activeModelId}"]`)
    .addClass("active");
  $selectionsLayer
    .find(`.selection-wrap[data-modelid="${activeModelId}"]`)
    .each((index, element) => {
      const $box = $(element).clone(false).empty();
      console.log("Cloned box for active model selection:", $box);
      $box.addClass("active");
      $box.appendTo($interactionLayer);
      $box.on("click", onSelectionSelect);
    });
};

const unhighlightActiveModelSelections = (activeModelId) => {
  $modelTags
    .find(`.tag-span[data-modelid="${activeModelId}"]`)
    .removeClass("active");
  $selectionsLayer
    .find(`.selection-wrap[data-modelid="${activeModelId}"]`)
    .removeClass("active");
  $interactionLayer
    .find(`.selection-wrap[data-modelid="${activeModelId}"]`)
    .remove();
  // $selectionsLayer.find(".selection-wrapper").each((index, element) => {
  //   const $element = $(element);
  //   const elementModelId = $element.data("modelid");
  //   if (elementModelId === activeModelId) {
  //     $element.addClass("active");
  //   } else {
  //     $element.removeClass("active");
  //   }
  // });
};

const rerenderTemporarySelectionsLayer = () => {
  // if (hasTemporarySelections()) {
  //   $temporarySelectionsLayer.empty();
  //   temporarySelections.forEach((range) => renderSelection(range));
  // }
};

const renderTrace = ({ selections, modelId }) => {
  selections.forEach((selection, index) => {
    renderSelection(selection, modelId);
  });
};

const rerenderSelectionsLayer = () => {
  clearSelectionsLayer();
  clearInteractionLayer();
  const traces = activeDocumentStore.getTraces();
  if (traces.length) {
    traces.forEach((trace) => renderTrace(trace));
  }
  const temporarySelections = activeDocumentStore.getTemporarySelections();
  temporarySelections.forEach((selection) => {
    renderSelection(selection);
  });
};

const rerenderOverlayLayers = () => {
  rerenderSelectionsLayer();
  // rerenderTemporarySelectionsLayer();
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

  const temporarySelection = {
    id: crypto.randomUUID(),
    color: getSelectionColor(),
    range: range.cloneRange(),
  };
  // temporarySelections.push(temporarySelection);
  activeDocumentStore.addTemporarySelection(temporarySelection);
  // renderSelection(temporarySelection);
  selection.removeAllRanges();
};

$(window).on("resize", rerenderOverlayLayers);
