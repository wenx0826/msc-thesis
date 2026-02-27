import { createUI } from "../../../shared/utils/ui.js";
import {
  documentsStore,
  documentViewerStore,
  modelsStore,
  workspaceStore,
} from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
import { createTemplateElement } from "../../../shared/utils/dom.js";
import { Constants } from "../../../constants.js";
import initVersionSelector from "../../../shared/widgets/version-selector.js";
const MODEL_UPDATE_TYPE = Constants.MODEL_UPDATE_TYPE;
const MODEL_GENERATION_TARGET = Constants.MODEL_GENERATION_TARGET;
const $versionSelect = $("#docVersionSelect");
const $selectionColorForm = $("#selectionColorForm");
const $deleteSelectionButton = $("#deleteSelectionButton");
const $documentContent = $("#documentContent");
const $viewerWrap = $("#viewerWrap");
const $selectionsVisualLayer = $("#selectionsVisualLayer");
const $selectionsInteractionLayer = $("#selectionsInteractionLayer");
const $selectionHandlesLayer = $("#selectionHandlesLayer");
const $modelTagsLayer = $("#modelTagsLayer");
const $addSelectionsButton = $("#addSelectionsButton");
const $generateModelButton = $("#generateModelButton");
const SELECTION_WRAP_TEMPLATE_ID = "selectionWrapTemplate";
const SELECTION_RECT_TEMPLATE_ID = "selectionRangeRectTemplate";
const MODEL_TAG_TEMPLATE_ID = "modelTagTemplate";
const MODEL_GENERATION_TARGET_VALUES = new Set(
  Object.values(MODEL_GENERATION_TARGET),
);

let selectedSelection = null;
let handleDragState = null;

function resolveSelectionScope(selection) {
  if (!selection) return null;
  if (selection.scope) return selection.scope;
  return selection.modelId !== undefined && selection.modelId !== null
    ? "model"
    : "temporary";
}

function getNumericCssPx($element, property) {
  return Number.parseFloat($element.css(property)) || 0;
}

function setHandleSelectionData($handle, selection) {
  const { selectionId, modelId, traceId } = selection;
  $handle.attr("data-selectionid", selectionId);
  if (modelId !== undefined && modelId !== null) {
    $handle.attr("data-model-id", modelId);
  } else {
    $handle.removeAttr("data-model-id");
  }
  if (traceId !== undefined && traceId !== null) {
    $handle.attr("data-traceid", traceId);
  } else {
    $handle.removeAttr("data-traceid");
  }
}

function hideSelectionHandles() {
  $selectionHandlesLayer
    .find(".selection-handle")
    .removeAttr("data-selectionid data-model-id data-traceid")
    .hide();
}

function resolveGenerationTargetFromButton(element) {
  const target = element?.dataset?.target;
  if (MODEL_GENERATION_TARGET_VALUES.has(target)) {
    return target;
  }
  console.warn(
    "Unknown model generation target on button, falling back to NEW_MODEL:",
    target,
  );
  return MODEL_GENERATION_TARGET.NEW_MODEL;
}

function getInteractionWrapsBySelection(selection) {
  if (!selection) return $();
  const { selectionId, modelId, traceId } = selection;
  const resolvedScope = resolveSelectionScope(selection);
  let $wraps = $selectionsInteractionLayer.find(
    `.selection-wrap[data-selectionid="${selectionId}"]`,
  );

  if (resolvedScope === "temporary") {
    $wraps = $wraps.filter(
      (_, element) => !element.hasAttribute("data-model-id"),
    );
  } else if (modelId !== undefined && modelId !== null) {
    $wraps = $wraps.filter(
      (_, element) => $(element).attr("data-model-id") === String(modelId),
    );
  }
  if (traceId !== undefined && traceId !== null) {
    $wraps = $wraps.filter(
      (_, element) => $(element).attr("data-traceid") === String(traceId),
    );
  }

  return $wraps;
}

function findSelectedInteractionWrap() {
  if (!selectedSelection) return $();
  const $wraps = getInteractionWrapsBySelection(selectedSelection);
  return $wraps.first();
}

function areRangesEqual(rangeA, rangeB) {
  if (!rangeA || !rangeB) return false;
  return (
    rangeA.startContainer === rangeB.startContainer &&
    rangeA.startOffset === rangeB.startOffset &&
    rangeA.endContainer === rangeB.endContainer &&
    rangeA.endOffset === rangeB.endOffset
  );
}

function isNodeInsideDocumentContent(node) {
  if (!node) return false;
  if (node.nodeType === Node.TEXT_NODE) {
    return $documentContent[0].contains(node.parentElement);
  }
  return $documentContent[0].contains(node);
}

function getCaretPointFromClientPoint(clientX, clientY) {
  if (document.caretPositionFromPoint) {
    const caretPosition = document.caretPositionFromPoint(clientX, clientY);
    if (
      caretPosition &&
      isNodeInsideDocumentContent(caretPosition.offsetNode)
    ) {
      return {
        node: caretPosition.offsetNode,
        offset: caretPosition.offset,
      };
    }
  }

  if (document.caretRangeFromPoint) {
    const caretRange = document.caretRangeFromPoint(clientX, clientY);
    if (caretRange && isNodeInsideDocumentContent(caretRange.startContainer)) {
      return {
        node: caretRange.startContainer,
        offset: caretRange.startOffset,
      };
    }
  }

  return null;
}

function createCollapsedRange({ node, offset }) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  return range;
}

function createRangeFromPoints(pointA, pointB) {
  const pointARange = createCollapsedRange(pointA);
  const pointBRange = createCollapsedRange(pointB);
  const compare = pointARange.compareBoundaryPoints(
    Range.START_TO_START,
    pointBRange,
  );

  const range = document.createRange();
  if (compare <= 0) {
    range.setStart(pointA.node, pointA.offset);
    range.setEnd(pointB.node, pointB.offset);
  } else {
    range.setStart(pointB.node, pointB.offset);
    range.setEnd(pointA.node, pointA.offset);
  }

  return range;
}

function getSelectionByMeta(selectionMeta) {
  if (!selectionMeta) return null;

  const scope = resolveSelectionScope(selectionMeta);
  if (scope === "temporary") {
    return (
      documentViewerStore
        .getTemporarySelections()
        .find(
          (selection) =>
            String(selection.id) === String(selectionMeta.selectionId),
        ) || null
    );
  }

  let trace = null;
  if (selectionMeta.traceId !== undefined && selectionMeta.traceId !== null) {
    trace = documentViewerStore.getTraceById(selectionMeta.traceId);
  }
  if (!trace) {
    trace = documentViewerStore.getDisplayedModelTrace();
  }
  if (!trace || !trace.selections) return null;

  return (
    trace.selections.find(
      (selection) => String(selection.id) === String(selectionMeta.selectionId),
    ) || null
  );
}

function updateSelectionRangeByMeta(selectionMeta, nextRange) {
  const scope = resolveSelectionScope(selectionMeta);
  if (scope === "temporary") {
    documentViewerStore.updateTemporarySelectionRange(
      selectionMeta.selectionId,
      nextRange,
    );
    return;
  }

  documentViewerStore.updateTraceSelectionRange({
    selectionId: selectionMeta.selectionId,
    traceId: selectionMeta.traceId,
    modelId: selectionMeta.modelId,
    range: nextRange,
  });
}

function updateSelectionHandlesPosition() {
  if (!selectedSelection) {
    hideSelectionHandles();
    return;
  }

  const $wrap = findSelectedInteractionWrap();
  if ($wrap.length === 0) {
    hideSelectionHandles();
    return;
  }

  const $rects = $wrap.find(".range-rect");
  if ($rects.length === 0) {
    hideSelectionHandles();
    return;
  }

  const $startRect = $($rects[0]);
  const $endRect = $($rects[$rects.length - 1]);
  const wrapTop = getNumericCssPx($wrap, "top");
  const wrapLeft = getNumericCssPx($wrap, "left");

  const startTop =
    wrapTop +
    getNumericCssPx($startRect, "top") +
    getNumericCssPx($startRect, "height") / 2;
  const startLeft = wrapLeft + getNumericCssPx($startRect, "left");
  const endTop =
    wrapTop +
    getNumericCssPx($endRect, "top") +
    getNumericCssPx($endRect, "height") / 2;
  const endLeft =
    wrapLeft +
    getNumericCssPx($endRect, "left") +
    getNumericCssPx($endRect, "width");

  const $startHandle = $selectionHandlesLayer.find(
    '.selection-handle[data-side="start"]',
  );
  const $endHandle = $selectionHandlesLayer.find(
    '.selection-handle[data-side="end"]',
  );

  setHandleSelectionData($startHandle, selectedSelection);
  setHandleSelectionData($endHandle, selectedSelection);

  $startHandle.css({ top: `${startTop}px`, left: `${startLeft}px` }).show();
  $endHandle.css({ top: `${endTop}px`, left: `${endLeft}px` }).show();
}

function createSelectionWrap({
  templateId,
  selectionId,
  modelId,
  traceId,
  top,
  left,
  width,
  height,
  isActive = false,
}) {
  const $wrap = createTemplateElement(templateId)
    .attr("data-selectionid", selectionId)
    .css({ top, left, width, height });
  if (modelId !== undefined && modelId !== null) {
    $wrap.attr("data-model-id", modelId);
  }
  if (traceId !== undefined && traceId !== null) {
    $wrap.attr("data-traceid", traceId);
  }
  if (isActive) {
    $wrap.addClass("active");
  }
  return $wrap;
}

function createSelectionRect({ top, left, width, height, color }) {
  return createTemplateElement(SELECTION_RECT_TEMPLATE_ID).css({
    top,
    left,
    width,
    height,
    backgroundColor: color,
  });
}

function createInteractionRect({
  top,
  left,
  width,
  height,
  selectionId,
  modelId,
  traceId,
}) {
  const $rect = createTemplateElement(SELECTION_RECT_TEMPLATE_ID)
    .attr("data-selectionid", selectionId)
    .css({
      top,
      left,
      width,
      height,
      backgroundColor: "transparent",
    });
  if (modelId !== undefined && modelId !== null) {
    $rect.attr("data-model-id", modelId);
  }
  if (traceId !== undefined && traceId !== null) {
    $rect.attr("data-traceid", traceId);
  }
  return $rect;
}

function createModelTag({
  modelId,
  selectionId,
  modelName,
  top,
  left,
  isCurrent,
}) {
  const $tag = createTemplateElement(MODEL_TAG_TEMPLATE_ID)
    .attr("data-model-id", modelId)
    .attr("data-selectionid", selectionId)
    .text(modelName)
    .css({ top, left });
  if (isCurrent) {
    $tag.addClass("is-current");
  }
  return $tag;
}

function scrollToSelection(selectionId) {
  const $selection = $selectionsVisualLayer.find(
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

function scrollToRange(range) {
  const rects = range.getClientRects();
  if (!rects || rects.length === 0) return;

  const eleViewerWrap = $viewerWrap[0];
  const eleViewerWrapRect = eleViewerWrap.getBoundingClientRect();

  const rect = rects[0];
  const margin = 20;
  const isVisible =
    rect.top >= eleViewerWrapRect.top + margin &&
    rect.bottom <= eleViewerWrapRect.bottom - margin;

  if (isVisible) {
    return;
  }

  const y = rect.top - eleViewerWrapRect.top + eleViewerWrap.scrollTop;

  eleViewerWrap.scrollTo({
    top: Math.max(0, y - margin),
    behavior: "smooth",
  });
}

const clearHighlightLayer = () => {
  $selectionsVisualLayer.empty();
};

const clearInteractionLayer = () => {
  $modelTagsLayer.empty();
  $selectionsInteractionLayer.empty();
  hideSelectionHandles();
};

const clearOverlayLayers = () => {
  clearHighlightLayer();
  clearInteractionLayer();
};

const clearDocumentViewer = () => {
  $documentContent.empty();
  clearOverlayLayers();
};

// const clearTemporarySelections = () => {
//   if (hasTemporarySelections()) {
//     temporarySelections = [];
//     // $temporarySelectionsLayer.empty();
//   }
// };
function removeRenderedTrace({ modelId }) {
  $selectionsVisualLayer.find(`[data-model-id="${modelId}"]`).remove();
  $selectionsInteractionLayer.find(`[data-model-id="${modelId}"]`).remove();
  $modelTagsLayer.find(`[data-model-id="${modelId}"]`).remove();
  updateSelectionHandlesPosition();
}
function removeRenderedSelection({ id: selectionId }) {
  $selectionsVisualLayer
    .find(`.selection-wrap[data-selectionid="${selectionId}"]`)
    .each((index, element) => {
      const $element = $(element);
      const elementModelId = $element.attr("data-model-id");
      if (elementModelId) {
        $modelTagsLayer
          .find(
            `.tag-span[data-model-id="${elementModelId}"][data-selectionid="${selectionId}"]`,
          )
          .remove();
      }
      $element.remove();
    });

  $selectionsInteractionLayer
    .find(`.selection-wrap[data-selectionid="${selectionId}"]`)
    .remove();
  updateSelectionHandlesPosition();
}

function setSelectedSelection(selection) {
  const currentSelectedSelection = selectedSelection;
  selectedSelection = selection;

  if (currentSelectedSelection) {
    getInteractionWrapsBySelection(currentSelectedSelection).removeClass(
      "selected",
    );
  }
  if (selection) {
    getInteractionWrapsBySelection(selection).addClass("selected");
    $deleteSelectionButton.prop("disabled", false);
  } else {
    $deleteSelectionButton.prop("disabled", true);
  }
  updateSelectionHandlesPosition();
}
const onSelectionSelect = (event) => {
  // console.log("Range selected:", event);
  event.stopPropagation();
  const $target = $(event.currentTarget);
  // $target.addClass("selected");

  const $selectionWrap = $target.closest(".selection-wrap");
  const selectionId =
    $target.attr("data-selectionid") || $selectionWrap.attr("data-selectionid");
  const modelId =
    $target.attr("data-model-id") || $selectionWrap.attr("data-model-id");
  const traceId =
    $target.attr("data-traceid") || $selectionWrap.attr("data-traceid");
  const scope =
    $target.is("[data-model-id]") || $selectionWrap.is("[data-model-id]")
      ? "model"
      : "temporary";
  setSelectedSelection({ selectionId, modelId, traceId, scope });

  const $buttonGroup = $("#textActionBar .action-group");
  const selectionSelector = `#selectionsInteractionLayer .range-rect[data-selectionid="${selectionId}"], #selectionHandlesLayer .selection-handle[data-selectionid="${selectionId}"]`;
  $(document).one("mousedown", (e) => {
    const $t = $(e.target);
    const isInsideTarget = $t.closest(selectionSelector).length > 0;
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

// function isActiveModel(modelId) {
//   return modelId == workspaceStore.getEditingModelId();
// }

const renderSelection = (
  { range, color, id: selectionId, traceId },
  modelId,
  modelVersionId,
) => {
  if (!range) {
    return;
  }

  //todo
  const isActiveModel = modelId
    ? modelId === workspaceStore.getEditingModelId()
    : false;

  // console.log(
  //   "Rendering selection:",
  //   workspaceStore.getEditingModelId(),
  //   modelId,
  //   isActiveModel,
  // );
  const eleViewerWrap = $viewerWrap[0];
  const eleViewerWrapRect = eleViewerWrap.getBoundingClientRect();

  const rects = range.getClientRects();
  if (!rects || rects.length === 0) {
    return;
  }

  const selectionRect = range.getBoundingClientRect();
  const selectionRectTop = selectionRect.top;
  const selectionRectLeft = selectionRect.left;
  const wrapTop = `${selectionRectTop - eleViewerWrapRect.top + eleViewerWrap.scrollTop}px`;
  const wrapLeft = `${selectionRectLeft - eleViewerWrapRect.left + eleViewerWrap.scrollLeft}px`;
  const wrapWidth = `${selectionRect.width}px`;
  const wrapHeight = `${selectionRect.height}px`;

  const $highlightWrap = createSelectionWrap({
    templateId: SELECTION_WRAP_TEMPLATE_ID,
    selectionId,
    modelId,
    top: wrapTop,
    left: wrapLeft,
    width: wrapWidth,
    height: wrapHeight,
    isActive: isActiveModel,
  });

  for (const rect of rects) {
    const $rectDiv = createSelectionRect({
      top: `${rect.top - selectionRectTop}px`,
      left: `${rect.left - selectionRectLeft}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      color: color ? color : getSelectionColor(),
    });
    $highlightWrap.append($rectDiv);
  }
  $selectionsVisualLayer.append($highlightWrap);

  if (modelId) {
    const lastIndex = rects.length - 1;
    const lastRect = rects[lastIndex];

    const modelName = modelsStore.getEntityName(modelId) || "-";

    const $tag = createModelTag({
      modelId,
      selectionId,
      modelName: `${modelName}`,
      top: `${lastRect.top - eleViewerWrapRect.top + eleViewerWrap.scrollTop - 11}px`,
      left: `${lastRect.right - eleViewerWrapRect.left + eleViewerWrap.scrollLeft - 11}px`,
      isCurrent: modelId == workspaceStore.getEditingModelId(),
    });
    $modelTagsLayer.append($tag);
  }
  const $interactionWrap = createSelectionWrap({
    templateId: SELECTION_WRAP_TEMPLATE_ID,
    selectionId,
    modelId,
    traceId,
    top: wrapTop,
    left: wrapLeft,
    width: wrapWidth,
    height: wrapHeight,
  });

  for (const rect of rects) {
    const $interactionRect = createInteractionRect({
      top: `${rect.top - selectionRectTop + 2}px`,
      left: `${rect.left - selectionRectLeft}px`,
      width: `${rect.width}px`,
      height: `${Math.max(rect.height - 4, 1)}px`,
      selectionId,
      modelId,
      traceId,
    });
    $interactionWrap.append($interactionRect);
  }

  $interactionWrap.appendTo($selectionsInteractionLayer);
  if (selectedSelection && selectedSelection.selectionId === selectionId) {
    getInteractionWrapsBySelection(selectedSelection).addClass("selected");
    updateSelectionHandlesPosition();
  }
};

const onSelectionHandleDragStart = (event) => {
  event.preventDefault();
  event.stopPropagation();
  const $handle = $(event.currentTarget);
  const selectionId = $handle.attr("data-selectionid");
  if (!selectionId) return;

  const selectionMeta = {
    selectionId,
    modelId: $handle.attr("data-model-id"),
    traceId: $handle.attr("data-traceid"),
    scope: $handle.attr("data-model-id") ? "model" : "temporary",
  };
  const selection = getSelectionByMeta(selectionMeta);
  if (!selection || !selection.range) return;

  const fixedPoint =
    $handle.attr("data-side") === "start"
      ? {
          node: selection.range.endContainer,
          offset: selection.range.endOffset,
        }
      : {
          node: selection.range.startContainer,
          offset: selection.range.startOffset,
        };

  if (!isNodeInsideDocumentContent(fixedPoint.node)) return;

  handleDragState = {
    ...selectionMeta,
    side: $handle.attr("data-side"),
    fixedPoint,
    didUpdate: false,
  };
  $viewerWrap.addClass("selection-handle-dragging");
  $(document).on("mousemove.selectionHandleDrag", onSelectionHandleDragMove);
  $(document).on("mouseup.selectionHandleDrag", onSelectionHandleDragEnd);
};

const onSelectionHandleDragMove = (event) => {
  if (!handleDragState) return;
  event.preventDefault();

  const movingPoint = getCaretPointFromClientPoint(
    event.clientX,
    event.clientY,
  );
  if (!movingPoint) return;

  let nextRange;
  try {
    nextRange = createRangeFromPoints(handleDragState.fixedPoint, movingPoint);
  } catch (error) {
    return;
  }
  if (!nextRange || nextRange.collapsed) return;

  const currentSelection = getSelectionByMeta(handleDragState);
  if (!currentSelection || !currentSelection.range) return;
  if (areRangesEqual(currentSelection.range, nextRange)) return;

  updateSelectionRangeByMeta(handleDragState, nextRange);
  handleDragState.didUpdate = true;
};

const onSelectionHandleDragEnd = () => {
  if (!handleDragState) return;
  const { didUpdate, traceId } = handleDragState;
  const scope = resolveSelectionScope(handleDragState);
  const activeTrace = documentViewerStore.getDisplayedModelTrace();
  const isActiveTraceUpdate =
    !traceId || (activeTrace && String(activeTrace.id) === String(traceId));
  handleDragState = null;
  $viewerWrap.removeClass("selection-handle-dragging");
  $(document).off(".selectionHandleDrag");
  if (didUpdate && scope === "model" && isActiveTraceUpdate) {
    modelService.updateActiveModelTrace();
  }
};

function unhighlightModelSelections(modelId) {
  $selectionsVisualLayer
    .find(`.selection-wrap[data-model-id="${modelId}"]`)
    .removeClass("active");
  $modelTagsLayer
    .find(`.tag-span[data-model-id="${modelId}"]`)
    .removeClass("is-current");

  $selectionsInteractionLayer
    .find(`.selection-wrap[data-model-id="${modelId}"]`)
    .remove();
  updateSelectionHandlesPosition();
}

function setModelTagCurrent(modelId, isCurrent) {
  if (modelId === undefined || modelId === null) return;
  $modelTagsLayer
    .find(`.tag-span[data-model-id="${modelId}"]`)
    .toggleClass("is-current", isCurrent);
}

const rerenderTemporarySelectionsLayer = () => {
  // if (hasTemporarySelections()) {
  //   $temporarySelectionsLayer.empty();
  //   temporarySelections.forEach((range) => renderSelection(range));
  // }
};

const renderTrace = ({ id: traceId, selections, modelId, modelVersionId }) => {
  selections.forEach((selection, index) => {
    renderSelection({ ...selection, traceId }, modelId, modelVersionId);
  });
};
function onGenerationButtonClick(event) {
  const target = event.currentTarget?.dataset?.target;
  modelService.generateModelBySelections(target);
}
// const rerenderSelectionsLayer = () => {};

const rerenderOverlayLayers = () => {
  clearHighlightLayer();
  clearInteractionLayer();
  const traces = documentViewerStore.getTraces();
  if (traces.length) {
    traces.forEach((trace) => renderTrace(trace));
  }
  const temporarySelections = documentViewerStore.getTemporarySelections();
  temporarySelections.forEach((selection) => {
    renderSelection(selection);
  });
  updateSelectionHandlesPosition();
  // rerenderTemporarySelectionsLayer();
};

function getSelectionColor() {
  const color = new FormData($selectionColorForm[0]).get("color");
  return color;
}

const handleTextSelection = () => {
  const selection = window.getSelection();

  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;
  // if (!content.contains(range.commonAncestorContainer)) return;
  // $generateModelButton.prop("disabled", false);
  const temporarySelection = {
    id: crypto.randomUUID(),
    color: getSelectionColor(),
    range: range.cloneRange(),
  };
  // temporarySelections.push(temporarySelection);
  documentViewerStore.addTemporarySelection(temporarySelection);
  // renderSelection(temporarySelection);
  selection.removeAllRanges();
};

createUI({
  setup: () => {
    hideSelectionHandles();
    // Initial UI setup if needed
    const versionSelector = initVersionSelector({
      $select: $versionSelect,
      onSelect: ({ version }) => {
        workspaceService.displayDocument(version.documentId, version.id);
      },
    });
    return { versionSelector };
  },
  bindListeners: () => {
    $selectionColorForm.on("input", (e) => {
      console.log("Selection color input.");
      const newColor = e.target.value;
      if (selectedSelection) {
        if (!selectedSelection.modelId) {
          documentViewerStore.updateTemporarySelectionColor(
            selectedSelection.selectionId,
            newColor,
          );
        } else {
          documentViewerStore.updateActiveModelTraceSelectionColor(
            selectedSelection.selectionId,
            newColor,
          );
          modelService.updateActiveModelTrace();
        }
      }
    });
    $deleteSelectionButton.on("click", () => {
      if (selectedSelection) {
        const { selectionId, modelId } = selectedSelection;
        if (!modelId) {
          documentViewerStore.removeTemporarySelection(selectionId);
        } else {
          // todo change it to rerender after trace update
          documentViewerStore.removeActiveModelTraceSelectionById(selectionId);
          modelService.updateActiveModel(
            MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
          );
        }
        setSelectedSelection(null);
      }
    });
    $documentContent.on("mouseup", handleTextSelection);
    $addSelectionsButton.on("click", () => {
      modelService.updateActiveModel(
        MODEL_UPDATE_TYPE.MANUAL_UPDATE_SELECTIONS,
      );
    });

    $generateModelButton.on("click", onGenerationButtonClick);
    $viewerWrap.on("scroll", rerenderOverlayLayers);
    $("#columnResizehandle1").on("dragcolumnmove", (e) => {
      // e.stopPropagation();
      rerenderOverlayLayers();
    });
    $(window).on("resize", rerenderOverlayLayers);
    $selectionsInteractionLayer.on("click", ".range-rect", onSelectionSelect);
    $selectionHandlesLayer.on(
      "mousedown",
      ".selection-handle",
      onSelectionHandleDragStart,
    );
    // Event listeners are set up in the initActiveDocumentUI function
    $modelTagsLayer.on("click", ".tag-span", (event) => {
      // const $target = $(event.currentTarget);
      event.stopPropagation();
      const modelId = event.currentTarget.dataset.modelId;
      workspaceService.toggleModelDisplay(modelId);
    });
    $modelTagsLayer.on("mouseenter", ".tag-span", (event) => {
      event.stopPropagation();
      // const $target = $(event.currentTarget); // OLD: Unused
      const element = event.currentTarget;
      const modelId = element.dataset.modelId;
      console.log("Hovering over model tag:", modelId);

      // ✨ NEW: Pass source identifier to prevent conflicts with other hover sources
      workspaceStore.setModelPopoverParams(
        {
          modelId,
          anchor: {
            type: "element",
            element,
          },
        },
        "document-tag",
      ); // ✨ NEW: Source tracking for conflict prevention

      /* OLD CODE - No source tracking:
    workspaceStore.setModelPopoverParams({
      modelId,
      anchor: {
        type: "element",
        element,
      },
    });
    */
    });
    $modelTagsLayer.on("mouseleave", ".tag-span", (event) => {
      event.stopPropagation();
      console.log(
        "Mouse leaving model tag:",
        event.currentTarget.dataset.modelId,
      );
      // ✨ NEW: Pass source identifier to ensure only the same source can close
      workspaceStore.requestCloseModelPopover("document-tag");

      /* OLD CODE - No source tracking:
    workspaceStore.requestCloseModelPopover();
    */
    });
  },
  subscribeStores: ({ versionSelector }) => {
    documentViewerStore.subscribe((state, { key, operation, ...payload }) => {
      if (operation) {
        const { value } = payload;
        switch (key) {
          case "traces":
            switch (operation) {
              case "init":
                rerenderOverlayLayers();
                break;
              case "add":
                renderTrace(value);
                break;
              case "update":
                rerenderOverlayLayers();
                break;
              default:
                break;
            }
            break;
          case "activeModelTrace.selections":
            switch (operation) {
              case "update":
                removeRenderedSelection(value);
                renderSelection(value, workspaceStore.getEditingModelId());
                break;
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
              case "update":
                removeRenderedSelection(value);
                renderSelection(value);
                break;
              case "remove":
                removeRenderedSelection(value);
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
          case "content":
            if (newValue) {
              $documentContent.append(newValue);
            } else {
              clearDocumentViewer();
            }
            break;
          case "activeModelTrace":
            if (newValue) {
              removeRenderedTrace(newValue);
              renderTrace(newValue);
              const firstSelection = newValue.selections[0];
              if (firstSelection) {
                scrollToRange(newValue.selections[0].range);
              }
            }
            if (oldValue && oldValue.modelId !== newValue?.modelId) {
              unhighlightModelSelections(oldValue.modelId);
            }
            break;
          case "temporarySelections":
            oldValue.forEach((selection) => {
              removeRenderedSelection(selection);
            });
            break;
          case "hasSelectionChanged":
            if (newValue) {
              $generateModelButton.prop("disabled", false);
              $addSelectionsButton.prop("disabled", false);
            } else {
              $generateModelButton.prop("disabled", true);
            }
            break;
          default:
            break;
        }
      }
    });

    workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
      switch (key) {
        case "viewedDocument":
          const { id, versionId } = newValue || {};
          if (id) {
            const versions = documentsStore.getVersions(id);
            versionSelector.update({
              versions,
              selectedId: newValue.versionId,
            });

            const fileName = documentsStore.getFileName(id, versionId);
            console.log("Updating document file name:", fileName);
            $(`[data-ref="versionFileName"]`).text(fileName);
          }
          break;
        case "editingModelId":
          if (oldValue === newValue) {
            break;
          }
          setModelTagCurrent(oldValue, false);
          setModelTagCurrent(newValue, true);
          break;
        case "editingModel":
          const hasEditingModel = !!newValue.id;
          if (!!oldValue.id !== hasEditingModel) {
            if (hasEditingModel) {
              $addSelectionsButton.show();
              $generateModelButton.attr(
                "data-target",
                MODEL_GENERATION_TARGET.EDITING_MODEL,
              );
              $generateModelButton.text("Regenerate model");
            } else {
              $addSelectionsButton.hide();
              $generateModelButton.attr(
                "data-target",
                MODEL_GENERATION_TARGET.NEW_MODEL,
              );
              $generateModelButton.text("Generate new model");
            }
          }
          break;
        default:
          break;
      }
    });
  },
});
