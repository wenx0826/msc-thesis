import { createUI } from "../../../shared/utils/ui.js";
import {
  documentsStore,
  documentViewerStore,
  modelsStore,
  workspaceStore,
} from "../store/index.js";
import { modelService, workspaceService } from "../services/index.js";
import { createTemplateElement } from "../../../shared/utils/dom.js";

const $viewerWrap = $("#viewerWrap");
const $documentContent = $("#documentContent");
const $selectionsVisualLayer = $("#selectionsVisualLayer");
const $selectionsInteractionLayer = $("#selectionsInteractionLayer");
const $selectionHandlesLayer = $("#selectionHandlesLayer");
const $modelTagsLayer = $("#modelTagsLayer");
const $selectedSelectionToolbar = $("#selectedSelectionToolbar");
const SELECTION_WRAP_TEMPLATE_ID = "selectionWrapTemplate";

const MODEL_TAG_TEMPLATE_ID = "modelTagTemplate";
let handleDragState = null;
let suppressTagPopoverOpen = false;
let suppressTagPopoverOpenTimer = null;

function suppressTagPopoverForClickWindow() {
  suppressTagPopoverOpen = true;
  if (suppressTagPopoverOpenTimer) {
    clearTimeout(suppressTagPopoverOpenTimer);
  }
  suppressTagPopoverOpenTimer = setTimeout(() => {
    suppressTagPopoverOpen = false;
    suppressTagPopoverOpenTimer = null;
  }, 400);
}

function releaseTagPopoverSuppression() {
  suppressTagPopoverOpen = false;
  if (suppressTagPopoverOpenTimer) {
    clearTimeout(suppressTagPopoverOpenTimer);
    suppressTagPopoverOpenTimer = null;
  }
}

function isViewingLatestDocumentVersion() {
  const viewedDocument = workspaceStore.getViewedDocument() || {};
  if (!viewedDocument?.id || !viewedDocument?.versionId) {
    return false;
  }
  return viewedDocument.isLatest === true;
}

function syncDocumentReadOnlyState() {
  const isReadOnly = !isViewingLatestDocumentVersion();
  $documentContent.toggleClass("is-historical-version", isReadOnly);

  if (!isReadOnly) {
    return;
  }

  if (handleDragState) {
    handleDragState = null;
    $viewerWrap.removeClass("selection-handle-dragging");
    $(document).off(".selectionHandleDrag");
  }

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
  documentViewerStore.setSelectedSelection(null);
  documentViewerStore.setTemporarySelections([]);
  hideSelectionHandles();
  hideSelectedSelectionToolbar();
}

function getCurrentSelectionColor() {
  return documentViewerStore.getSelectionColor() || "#d4e1f1";
}

function getSelectedSelection() {
  return documentViewerStore.getSelectedSelection();
}

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

function getDocumentHorizontalBounds() {
  const viewerElement = $viewerWrap[0];
  const contentElement = $documentContent[0];
  if (!viewerElement || !contentElement) return null;

  const viewerRect = viewerElement.getBoundingClientRect();
  const contentRect = contentElement.getBoundingClientRect();
  const contentStyle = window.getComputedStyle(contentElement);
  const contentPaddingLeft = Number.parseFloat(contentStyle.paddingLeft) || 0;
  const contentPaddingRight = Number.parseFloat(contentStyle.paddingRight) || 0;

  return {
    minLeft:
      contentRect.left -
      viewerRect.left +
      viewerElement.scrollLeft +
      contentPaddingLeft,
    maxRight:
      contentRect.right -
      viewerRect.left +
      viewerElement.scrollLeft -
      contentPaddingRight,
  };
}

function clampModelTagHorizontalPosition($tag) {
  if (!$tag || $tag.length === 0) return;

  const bounds = getDocumentHorizontalBounds();
  if (!bounds) return;

  const { minLeft, maxRight } = bounds;
  const availableWidth = Math.max(0, maxRight - minLeft);
  const computedTagStyle = window.getComputedStyle($tag[0]);
  const configuredMaxWidth = Number.parseFloat(computedTagStyle.maxWidth);

  if (availableWidth === 0) {
    $tag.css({ left: `${minLeft}px`, "max-width": "0px" });
    return;
  }

  if (Number.isFinite(configuredMaxWidth)) {
    $tag.css("max-width", `${Math.min(configuredMaxWidth, availableWidth)}px`);
  } else {
    $tag.css("max-width", `${availableWidth}px`);
  }

  const currentLeft = getNumericCssPx($tag, "left");
  const tagWidth = $tag.outerWidth() || 0;
  const maxLeft = Math.max(minLeft, maxRight - tagWidth);
  const clampedLeft = Math.min(Math.max(currentLeft, minLeft), maxLeft);

  if (clampedLeft !== currentLeft) {
    $tag.css("left", `${clampedLeft}px`);
  }
}

function setHandleSelectionData($handle, selection) {
  const { selectionId, modelId, modelVersionId, traceId } = selection;
  $handle.attr("data-selection-id", selectionId);
  if (modelId !== undefined && modelId !== null) {
    $handle.attr("data-model-id", modelId);
  } else {
    $handle.removeAttr("data-model-id");
  }
  if (modelVersionId !== undefined && modelVersionId !== null) {
    $handle.attr("data-model-version-id", modelVersionId);
  } else {
    $handle.removeAttr("data-model-version-id");
  }
  if (traceId !== undefined && traceId !== null) {
    $handle.attr("data-trace-id", traceId);
  } else {
    $handle.removeAttr("data-trace-id");
  }
}

function hideSelectionHandles() {
  $selectionHandlesLayer
    .find(".selection-handle")
    .removeAttr(
      "data-selection-id data-model-id data-model-version-id data-trace-id",
    )
    .hide();
}

function hideSelectedSelectionToolbar() {
  $selectedSelectionToolbar
    .removeClass("is-visible")
    .attr("aria-hidden", "true")
    .css("pointer-events", "none");
}

function updateSelectedSelectionToolbarPosition() {
  if (handleDragState) {
    hideSelectedSelectionToolbar();
    return;
  }

  const selectedSelection = getSelectedSelection();
  if (!selectedSelection) {
    hideSelectedSelectionToolbar();
    return;
  }

  const $wrap = findSelectedInteractionWrap();
  if ($wrap.length === 0) {
    hideSelectedSelectionToolbar();
    return;
  }

  const $rects = $wrap.find(".range-rect");
  if ($rects.length === 0) {
    hideSelectedSelectionToolbar();
    return;
  }

  const viewerElement = $viewerWrap[0];
  if (!viewerElement) {
    hideSelectedSelectionToolbar();
    return;
  }

  const $firstRect = $($rects[0]);
  const $lastRect = $($rects[$rects.length - 1]);
  const wrapTop = getNumericCssPx($wrap, "top");
  const wrapLeft = getNumericCssPx($wrap, "left");

  const anchorCenterX =
    wrapLeft +
    getNumericCssPx($firstRect, "left") +
    getNumericCssPx($firstRect, "width") / 2;
  const selectionTop = wrapTop + getNumericCssPx($firstRect, "top");
  const selectionBottom =
    wrapTop +
    getNumericCssPx($lastRect, "top") +
    getNumericCssPx($lastRect, "height");

  const toolbarWidth = $selectedSelectionToolbar.outerWidth() || 0;
  const toolbarHeight = $selectedSelectionToolbar.outerHeight() || 0;
  const padding = 8;

  const minLeft = viewerElement.scrollLeft + padding + toolbarWidth / 2;
  const maxLeft =
    viewerElement.scrollLeft +
    viewerElement.clientWidth -
    padding -
    toolbarWidth / 2;
  const left = Math.min(
    Math.max(anchorCenterX, minLeft),
    Math.max(minLeft, maxLeft),
  );

  const preferredTop = selectionTop - toolbarHeight - padding;
  const minTop = viewerElement.scrollTop + padding;
  const fallbackTop = selectionBottom + padding;
  const top = preferredTop < minTop ? fallbackTop : preferredTop;

  $selectedSelectionToolbar.css({
    left: `${left}px`,
    top: `${top}px`,
    "pointer-events": "auto",
  });
  $selectedSelectionToolbar.addClass("is-visible").attr("aria-hidden", "false");
}

function getInteractionWrapsBySelection(selection) {
  if (!selection) return $();
  const { selectionId, modelId, modelVersionId, traceId } = selection;
  const resolvedScope = resolveSelectionScope(selection);
  let $wraps = $selectionsInteractionLayer.find(
    `.selection-wrap[data-selection-id="${selectionId}"]`,
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
  if (modelVersionId !== undefined && modelVersionId !== null) {
    $wraps = $wraps.filter(
      (_, element) =>
        $(element).attr("data-model-version-id") === String(modelVersionId),
    );
  }
  if (traceId !== undefined && traceId !== null) {
    $wraps = $wraps.filter(
      (_, element) => $(element).attr("data-trace-id") === String(traceId),
    );
  }

  return $wraps;
}

function findSelectedInteractionWrap() {
  const selectedSelection = getSelectedSelection();
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

function canEditLinkSelections({
  documentId,
  documentVersionId,
  modelId,
  modelVersionId,
} = {}) {
  return (
    documentsStore.isLatestVersion(documentId, documentVersionId) &&
    modelsStore.isLatestVersion(modelId, modelVersionId)
  );
}

function resolveTraceBySelectionMeta(selectionMeta) {
  if (!selectionMeta) {
    return null;
  }
  const traceId =
    selectionMeta.traceId !== undefined && selectionMeta.traceId !== null
      ? String(selectionMeta.traceId)
      : null;
  const modelId =
    selectionMeta.modelId !== undefined && selectionMeta.modelId !== null
      ? String(selectionMeta.modelId)
      : null;
  const modelVersionId =
    selectionMeta.modelVersionId !== undefined &&
    selectionMeta.modelVersionId !== null
      ? String(selectionMeta.modelVersionId)
      : null;

  let trace = null;
  if (traceId) {
    trace = documentViewerStore.getTraceById(traceId);
  }

  const activeTrace = documentViewerStore.getDisplayedModelTrace();
  if (
    !trace &&
    activeTrace &&
    traceId &&
    String(activeTrace.id || "") === traceId
  ) {
    trace = activeTrace;
  }

  if (!trace && modelId && modelVersionId) {
    trace = (documentViewerStore.getTraces() || []).find(
      (item) =>
        String(item?.modelId || "") === modelId &&
        String(item?.modelVersionId || "") === modelVersionId,
    );
  }

  if (
    !trace &&
    activeTrace &&
    modelId &&
    modelVersionId &&
    String(activeTrace.modelId || "") === modelId &&
    String(activeTrace.modelVersionId || "") === modelVersionId
  ) {
    trace = activeTrace;
  }

  return trace || null;
}

function isSelectionMetaSelectable(selectionMeta) {
  const scope = resolveSelectionScope(selectionMeta);
  if (scope !== "model") {
    return isViewingLatestDocumentVersion();
  }
  const trace = resolveTraceBySelectionMeta(selectionMeta);
  return canEditLinkSelections(trace);
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
  const selectedSelection = getSelectedSelection();
  if (!selectedSelection) {
    hideSelectionHandles();
    hideSelectedSelectionToolbar();
    return;
  }

  const $wrap = findSelectedInteractionWrap();
  if ($wrap.length === 0) {
    hideSelectionHandles();
    hideSelectedSelectionToolbar();
    return;
  }

  const $rects = $wrap.find(".range-rect");
  if ($rects.length === 0) {
    hideSelectionHandles();
    hideSelectedSelectionToolbar();
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
  updateSelectedSelectionToolbarPosition();
}

function createSelectionWrap({
  templateId,
  selectionId,
  modelId,
  modelVersionId,
  traceId,
  top,
  left,
  width,
  height,
  isCurrent = false,
  showReadonlyBound = false,
}) {
  const $wrap = createTemplateElement(templateId)
    .attr("data-selection-id", selectionId)
    .css({ top, left, width, height });
  if (modelId !== undefined && modelId !== null) {
    $wrap.attr("data-model-id", modelId);
  }
  if (modelVersionId !== undefined && modelVersionId !== null) {
    $wrap.attr("data-model-version-id", modelVersionId);
  }
  if (traceId !== undefined && traceId !== null) {
    $wrap.attr("data-trace-id", traceId);
  }
  if (isCurrent) {
    $wrap.addClass("is-current");
  }
  if (showReadonlyBound) {
    $wrap.addClass("is-readonly-trace");
  }
  return $wrap;
}

function createSelectionRect(css) {
  const SELECTION_RANGE_RECT_TEMPLATE_ID = "selectionRangeRectTemplate";
  return createTemplateElement(SELECTION_RANGE_RECT_TEMPLATE_ID).css(css);
}

function createModelTag({
  modelId,
  modelVersionId,
  selectionId,
  modelName,
  top,
  left,
  isCurrent,
  showReadonlyBound = false,
}) {
  const $tag = createTemplateElement(MODEL_TAG_TEMPLATE_ID)
    .attr("data-model-id", modelId)
    .attr("data-model-version-id", modelVersionId || "")
    .attr("data-selection-id", selectionId)
    .text(modelName)
    .css({ top, left });
  if (isCurrent) {
    $tag.addClass("is-current");
  }
  if (showReadonlyBound) {
    $tag.addClass("is-readonly-trace is-readonly");
  }
  return $tag;
}

function scrollToSelection(selectionId) {
  const $selection = $selectionsVisualLayer.find(
    `.selection-wrap[data-selection-id="${selectionId}"]`,
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
  $viewerWrap.find(`*[data-selection-id="${selectionId}"]`).remove();
  updateSelectionHandlesPosition();
}

function syncSelectedSelectionUI(oldSelection, newSelection) {
  if (oldSelection) {
    getInteractionWrapsBySelection(oldSelection).removeClass("selected");
  }
  if (newSelection) {
    getInteractionWrapsBySelection(newSelection).addClass("selected");
  }
  updateSelectionHandlesPosition();
}

function setSelectedSelection(selection) {
  documentViewerStore.setSelectedSelection(selection);
}

const onSelectedSelectionOutsideMouseDown = (event) => {
  if (!getSelectedSelection()) return;

  const isInsideSelectedSelectionToolbar =
    $(event.target).closest("#selectedSelectionToolbar").length > 0;
  const isInsideSelectionInteraction =
    $(event.target).closest(
      "#selectionsInteractionLayer, #selectionHandlesLayer",
    ).length > 0;

  if (isInsideSelectedSelectionToolbar || isInsideSelectionInteraction) {
    return;
  }

  setSelectedSelection(null);
};

const onSelectionSelect = (event) => {
  // console.log("Range selected:", event);
  event.stopPropagation();
  const $target = $(event.currentTarget);
  // $target.addClass("selected");

  const $selectionWrap = $target.closest(".selection-wrap");
  const { selectionId, modelId, modelVersionId, traceId } =
    $selectionWrap.data();

  const scope = $selectionWrap.is("[data-model-id]") ? "model" : "temporary";
  if (selectionId === undefined || selectionId === null || selectionId === "") {
    return;
  }
  const selectionMeta = {
    selectionId,
    modelId,
    modelVersionId,
    traceId,
    scope,
  };
  if (!isSelectionMetaSelectable(selectionMeta)) {
    return;
  }
  setSelectedSelection(selectionMeta);
};

const renderSelection = (
  { range, style, id: selectionId, traceId },
  modelId,
  modelVersionId,
  { selectable = true } = {},
) => {
  if (!range) {
    console.warn("Selection has no range, skipping render:", selectionId);
    return;
  }
  if (selectionId === undefined || selectionId === null) {
    console.warn("Selection has no valid ID, skipping render:", selectionId);
    return;
  }

  const editingModel = workspaceStore.getEditingModel() || {};
  const editingModelId = editingModel.id ?? null;
  const editingModelVersionId = editingModel.versionId ?? null;
  const isEditingModel = modelId === editingModelId;
  const isDisplayedModelVersion = modelVersionId === editingModelVersionId;
  const shouldShowReadonlyBound = !selectable && isDisplayedModelVersion;

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
    modelVersionId,
    traceId,
    top: wrapTop,
    left: wrapLeft,
    width: wrapWidth,
    height: wrapHeight,
    isCurrent: isDisplayedModelVersion,
    showReadonlyBound: shouldShowReadonlyBound,
  });

  for (const rect of rects) {
    const $rectDiv = createSelectionRect({
      top: `${rect.top - selectionRectTop}px`,
      left: `${rect.left - selectionRectLeft}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      backgroundColor: style?.backgroundColor || getCurrentSelectionColor(),
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
      modelVersionId,
      selectionId,
      modelName: `${modelName}`,
      top: `${lastRect.top - eleViewerWrapRect.top + eleViewerWrap.scrollTop - 11}px`,
      left: `${lastRect.right - eleViewerWrapRect.left + eleViewerWrap.scrollLeft - 11}px`,
      isCurrent: isDisplayedModelVersion,
      showReadonlyBound: shouldShowReadonlyBound,
    });
    $modelTagsLayer.append($tag);
    clampModelTagHorizontalPosition($tag);
  }
  const $interactionWrap = createSelectionWrap({
    templateId: SELECTION_WRAP_TEMPLATE_ID,
    selectionId,
    modelId,
    modelVersionId,
    traceId,
    top: wrapTop,
    left: wrapLeft,
    width: wrapWidth,
    height: wrapHeight,
    isCurrent: isDisplayedModelVersion,
    showReadonlyBound: shouldShowReadonlyBound,
  });
  if (selectable) {
    for (const rect of rects) {
      const $interactionRect = createSelectionRect({
        top: `${rect.top - selectionRectTop + 2}px`,
        left: `${rect.left - selectionRectLeft}px`,
        width: `${rect.width}px`,
        height: `${Math.max(rect.height - 4, 1)}px`,
      });
      $interactionWrap.append($interactionRect);
    }
  }
  $interactionWrap.appendTo($selectionsInteractionLayer);
  const selectedSelection = getSelectedSelection();
  if (
    selectedSelection &&
    String(selectedSelection.selectionId) === String(selectionId)
  ) {
    getInteractionWrapsBySelection(selectedSelection).addClass("selected");
    updateSelectionHandlesPosition();
  }
};

const onSelectionHandleDragStart = (event) => {
  // if (!isViewingLatestDocumentVersion()) {
  //   return;
  // }
  event.preventDefault();
  event.stopPropagation();
  const $handle = $(event.currentTarget);
  const selectionId = $handle.attr("data-selection-id");
  if (!selectionId) return;

  const selectionMeta = {
    selectionId,
    modelId: $handle.attr("data-model-id"),
    modelVersionId: $handle.attr("data-model-version-id"),
    traceId: $handle.attr("data-trace-id"),
    scope: $handle.attr("data-model-id") ? "model" : "temporary",
  };
  if (!isSelectionMetaSelectable(selectionMeta)) {
    return;
  }
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
  hideSelectedSelectionToolbar();
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
  updateSelectionHandlesPosition();
  if (didUpdate && scope === "model") {
    if (isActiveTraceUpdate) {
      modelService.updateActiveModelTrace();
    } else if (traceId) {
      modelService.updateTraceTextById(traceId);
    }
  }
};

function unhighlightModelSelections(modelId) {
  $selectionsVisualLayer
    .find(`.selection-wrap[data-model-id="${modelId}"]`)
    .removeClass("is-current");
  $modelTagsLayer
    .find(`.tag-span[data-model-id="${modelId}"]`)
    .removeClass("is-current");

  $selectionsInteractionLayer
    .find(`.selection-wrap[data-model-id="${modelId}"]`)
    .remove();
  updateSelectionHandlesPosition();
}

function setModelTagCurrent(modelId, modelVersionId, isCurrent) {
  if (modelId === undefined || modelId === null) {
    return;
  }
  const selector =
    modelVersionId === undefined || modelVersionId === null
      ? `.tag-span[data-model-id="${modelId}"]`
      : `.tag-span[data-model-id="${modelId}"][data-model-version-id="${modelVersionId}"]`;
  $modelTagsLayer.find(selector).toggleClass("is-current", isCurrent);
}

function setModelSelectionWrapCurrent(modelId, modelVersionId, isCurrent) {
  if (modelId === undefined || modelId === null) {
    return;
  }
  const selector =
    modelVersionId === undefined || modelVersionId === null
      ? `.selection-wrap[data-model-id="${modelId}"]`
      : `.selection-wrap[data-model-id="${modelId}"][data-model-version-id="${modelVersionId}"]`;
  $selectionsVisualLayer.find(selector).toggleClass("is-current", isCurrent);
  $selectionsInteractionLayer
    .find(selector)
    .toggleClass("is-current", isCurrent);
}

const rerenderTemporarySelectionsLayer = () => {
  // if (hasTemporarySelections()) {
  //   $temporarySelectionsLayer.empty();
  //   temporarySelections.forEach((range) => renderSelection(range));
  // }
};

const renderTrace = ({
  id: traceId,
  selections,
  modelId,
  modelVersionId,
  documentId,
  documentVersionId,
}) => {
  const selectable = canEditLinkSelections({
    documentId,
    documentVersionId,
    modelId,
    modelVersionId,
  });
  selections.forEach((selection) => {
    renderSelection({ ...selection, traceId }, modelId, modelVersionId, {
      selectable,
    });
  });
};

function getRenderableTraces() {
  const baseTraces = documentViewerStore.getTraces();
  const traces = Array.isArray(baseTraces) ? baseTraces : [];
  const activeTrace = documentViewerStore.getDisplayedModelTrace();
  if (!activeTrace?.id) {
    return traces;
  }

  const hasActiveTraceInBaseLayer = traces.some(
    (trace) => String(trace?.id || "") === String(activeTrace.id || ""),
  );
  if (hasActiveTraceInBaseLayer) {
    return traces;
  }

  return [...traces, activeTrace];
}

const rerenderOverlayLayers = () => {
  clearHighlightLayer();
  clearInteractionLayer();
  const traces = getRenderableTraces();
  // console.log("Rerendering overlay layers...", traces);
  if (traces.length) {
    traces.forEach((trace) => renderTrace(trace));
  }
  const selectedSelection = getSelectedSelection();
  if (selectedSelection && !isSelectionMetaSelectable(selectedSelection)) {
    setSelectedSelection(null);
  }
  const temporarySelections = documentViewerStore.getTemporarySelections();
  temporarySelections.forEach((selection) => {
    renderSelection(selection);
  });
  updateSelectionHandlesPosition();
  // rerenderTemporarySelectionsLayer();
};

const handleTextSelection = () => {
  if (!isViewingLatestDocumentVersion()) {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    return;
  }
  const selection = window.getSelection();

  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;
  // if (!content.contains(range.commonAncestorContainer)) return;
  // $generateModelButton.prop("disabled", false);
  const temporarySelection = {
    id: crypto.randomUUID(),
    style: {
      backgroundColor: getCurrentSelectionColor(),
    },
    range: range.cloneRange(),
  };
  // temporarySelections.push(temporarySelection);
  documentViewerStore.addTemporarySelection(temporarySelection);
  // renderSelection(temporarySelection);
  selection.removeAllRanges();
};

const blockDocumentTextEdit = (event) => {
  if (isViewingLatestDocumentVersion()) {
    return;
  }
  event.preventDefault();
};

createUI({
  setup: () => {
    hideSelectionHandles();
    hideSelectedSelectionToolbar();
    syncDocumentReadOnlyState();
    return {};
  },
  bindListeners: () => {
    $documentContent.on("mouseup", handleTextSelection);
    $documentContent.on("beforeinput paste drop", blockDocumentTextEdit);
    $viewerWrap.on("scroll", rerenderOverlayLayers);
    $("#columnResizehandle1").on("dragcolumnmove", (e) => {
      // e.stopPropagation();
      rerenderOverlayLayers();
    });
    $(window).on("resize", rerenderOverlayLayers);
    $(document)
      .off("mousedown.selectedSelectionDismiss")
      .on(
        "mousedown.selectedSelectionDismiss",
        onSelectedSelectionOutsideMouseDown,
      );
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
      suppressTagPopoverForClickWindow();
      workspaceStore.setModelPopoverParams(null);
      const modelId = event.currentTarget.dataset.modelId;
      const modelVersionId = event.currentTarget.dataset.modelVersionId || null;
      workspaceService.toggleModelDisplay(modelId, modelVersionId, false);
    });
    $modelTagsLayer.on("mouseenter", ".tag-span", (event) => {
      event.stopPropagation();
      if (suppressTagPopoverOpen) {
        return;
      }
      // const $target = $(event.currentTarget); // OLD: Unused
      const element = event.currentTarget;
      const modelId = element.dataset.modelId;
      const versionId = element.dataset.modelVersionId || null;

      // ✨ NEW: Pass source identifier to prevent conflicts with other hover sources
      workspaceStore.setModelPopoverParams({
        target: {
          id: modelId,
          versionId,
        },
        anchor: {
          type: "element",
          element,
        },
        source: "document-tag",
      }); // ✨ NEW: Source tracking for conflict prevention
    });
    $modelTagsLayer.on("mouseleave", ".tag-span", (event) => {
      event.stopPropagation();
      releaseTagPopoverSuppression();
      console.log(
        "Mouse leaving model tag:",
        event.currentTarget.dataset.modelId,
      );
      // ✨ NEW: Pass source identifier to ensure only the same source can close
      workspaceStore.requestCloseModelPopover("document-tag");
    });
  },
  subscribeStores: () => {
    documentViewerStore.subscribe((state, { key, operation, ...payload }) => {
      if (operation) {
        const { value } = payload;
        switch (key) {
          case "traces":
            switch (operation) {
              case "init":
                rerenderOverlayLayers();
                modelService.maybeAlertNoSelectionOnLoadedEditingModel(
                  "ui_traces_init",
                );
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
              case "update": {
                removeRenderedSelection(value);
                const activeTrace =
                  documentViewerStore.getDisplayedModelTrace();
                renderSelection(
                  {
                    ...value,
                    traceId: activeTrace?.id || value?.traceId || null,
                  },
                  activeTrace?.modelId ||
                    workspaceStore.getEditingModelId() ||
                    null,
                  activeTrace?.modelVersionId || null,
                  {
                    selectable: canEditLinkSelections(activeTrace),
                  },
                );
                break;
              }
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
            rerenderOverlayLayers();
            if (newValue) {
              const firstSelection = newValue.selections?.[0];
              if (firstSelection?.range) {
                scrollToRange(firstSelection.range);
              }
            }
            // if (oldValue && oldValue.modelId !== newValue?.modelId) {
            //   unhighlightModelSelections(oldValue.modelId);
            // }
            break;
          case "temporarySelections":
            oldValue.forEach((selection) => {
              removeRenderedSelection(selection);
            });
            break;
          case "selectedSelection":
            syncSelectedSelectionUI(oldValue, newValue);
            break;
          default:
            break;
        }
      }
    });

    workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "viewedDocument":
          syncDocumentReadOnlyState();
          break;
        case "editingModel":
          const oldModelId = oldValue?.id;
          const oldModelVersionId = oldValue?.versionId;
          const newModelId = newValue?.id;
          const newModelVersionId = newValue?.versionId;
          if (oldModelId) {
            setModelTagCurrent(oldModelId, oldModelVersionId, false);
            setModelSelectionWrapCurrent(oldModelId, oldModelVersionId, false);
          }
          if (newModelId) {
            setModelTagCurrent(newModelId, newModelVersionId, true);
            setModelSelectionWrapCurrent(newModelId, newModelVersionId, true);
          }
          setTimeout(() => {
            modelService.maybeAlertNoSelectionOnLoadedEditingModel(
              "ui_editing_model",
            );
          }, 0);
          break;
        default:
          break;
      }
    });
  },
});
