import { documentsAPI, documentModelLinksAPI } from "../api/index.js";
import { createTemplateElement } from "../shared/utils/dom.js";
import {
  deserializeRange,
  getRenderableRangeClientRects,
  getRectsBoundingBox,
} from "../modules/document/selection.js";

const DEFAULT_SELECTION_COLOR = "#d4e1f1";
const MODEL_TAG_TEMPLATE_ID = "modelTagTemplate";

const $viewerWrap = $("#viewerWrap");
const $documentContent = $("#documentContent");
const $selectionsVisualLayer = $("#selectionsVisualLayer");
const $modelTagsLayer = $("#modelTagsLayer");
const $statusBanner = $("#statusBanner");
const $versionLabel = $("#versionLabel");
const $summaryLabel = $("#summaryLabel");

let hydratedTraces = [];
let renderScheduled = false;
let shouldShowTags = true;

function getVersionIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("version_id") || params.get("document_version_id");
}

function getIncludeDeletedModelsFlagFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("include_deleted_models") === "true";
}

function getShowTagsFlagFromURL() {
  const params = new URLSearchParams(window.location.search);
  const rawValue = params.get("show_tags");
  if (rawValue === null) return true;
  return rawValue !== "false" && rawValue !== "0";
}

function setStatus(message, { isError = false, visible = true } = {}) {
  if ($statusBanner.length === 0) return;

  if (!visible) {
    $statusBanner
      .text("")
      .addClass("status--hidden")
      .removeClass("status--error");
    return;
  }

  $statusBanner
    .text(message)
    .removeClass("status--hidden")
    .toggleClass("status--error", isError);
}

function updateHeader(versionId) {
  const traceCount = hydratedTraces.length;
  const selectionCount = hydratedTraces.reduce(
    (count, trace) => count + trace.selections.length,
    0,
  );

  if ($versionLabel.length > 0) {
    $versionLabel.text(`version_id=${versionId}`);
  }
  if ($summaryLabel.length > 0) {
    $summaryLabel.text(`${traceCount} trace(s), ${selectionCount} selection(s)`);
  }
}

function clearRenderLayers() {
  $selectionsVisualLayer.empty();
  $modelTagsLayer.empty();
}

function createSelectionWrap({ top, left, width, height }) {
  return $("<div>")
    .addClass("selection-wrap")
    .css({ top, left, width, height });
}

function createSelectionRect({ top, left, width, height, color }) {
  return $("<div>").addClass("range-rect").css({
    top,
    left,
    width,
    height,
    backgroundColor: color,
  });
}

function getDocumentHorizontalBounds() {
  const viewerElement = $viewerWrap[0];
  const contentElement = $documentContent[0];
  if (!viewerElement || !contentElement) {
    return null;
  }

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

function clampTagHorizontalPosition($tag) {
  if (!$tag || $tag.length === 0) return;

  const bounds = getDocumentHorizontalBounds();
  if (!bounds) return;

  const { minLeft, maxRight } = bounds;
  const tagWidth = $tag.outerWidth() || 0;
  const currentLeft = Number.parseFloat($tag.css("left")) || 0;
  const maxLeft = Math.max(minLeft, maxRight - tagWidth);
  const clampedLeft = Math.min(Math.max(currentLeft, minLeft), maxLeft);

  if (clampedLeft !== currentLeft) {
    $tag.css("left", `${clampedLeft}px`);
  }
}

function createModelTag({ top, left, label, modelId }) {
  const $tag = document.getElementById(MODEL_TAG_TEMPLATE_ID)
    ? createTemplateElement(MODEL_TAG_TEMPLATE_ID)
    : $("<span>").addClass("tag-span");

  if (modelId !== undefined && modelId !== null) {
    $tag.attr("data-model-id", modelId);
  }
  $tag.text(label || "Model");
  $tag.css({ top, left });
  return $tag;
}

function renderSelection(range, style, trace) {
  if (!range) return;

  const viewerElement = $viewerWrap[0];
  if (!viewerElement) return;

  const viewerRect = viewerElement.getBoundingClientRect();
  const rects = getRenderableRangeClientRects(range);
  if (rects.length === 0) return;

  const rangeRect = getRectsBoundingBox(rects);
  if (!rangeRect) return;
  const wrapTop = `${rangeRect.top - viewerRect.top + viewerElement.scrollTop}px`;
  const wrapLeft = `${rangeRect.left - viewerRect.left + viewerElement.scrollLeft}px`;
  const wrapWidth = `${rangeRect.width}px`;
  const wrapHeight = `${rangeRect.height}px`;
  const $wrap = createSelectionWrap({
    top: wrapTop,
    left: wrapLeft,
    width: wrapWidth,
    height: wrapHeight,
  });

  for (const rect of rects) {
    const $selectionRect = createSelectionRect({
      top: `${rect.top - rangeRect.top}px`,
      left: `${rect.left - rangeRect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      color: style?.backgroundColor || DEFAULT_SELECTION_COLOR,
    });
    $wrap.append($selectionRect);
  }

  $selectionsVisualLayer.append($wrap);

  if (!shouldShowTags) return;

  const modelId = trace?.modelId || null;
  if (!modelId) return;

  const modelLabel = trace?.modelName || modelId;
  const lastRect = rects[rects.length - 1];
  const $tag = createModelTag({
    modelId,
    label: modelLabel,
    top: `${lastRect.top - viewerRect.top + viewerElement.scrollTop - 11}px`,
    left: `${lastRect.right - viewerRect.left + viewerElement.scrollLeft - 11}px`,
  });

  $modelTagsLayer.append($tag);
  clampTagHorizontalPosition($tag);
}

function renderAllSelections() {
  clearRenderLayers();

  for (const trace of hydratedTraces) {
    if (!Array.isArray(trace.selections)) {
      continue;
    }
    for (const selection of trace.selections) {
      renderSelection(selection.range, selection.style, trace);
    }
  }
}

function scheduleRender() {
  if (renderScheduled) return;

  renderScheduled = true;
  window.requestAnimationFrame(() => {
    renderScheduled = false;
    renderAllSelections();
  });
}

function hydrateTraceSelections(traces) {
  if (!Array.isArray(traces)) {
    return [];
  }

  return traces
    .map((trace) => {
      const hydratedSelections = (trace.selections || [])
        .map((selection) => {
          const range = deserializeRange(selection?.textPosition);
          if (!range) return null;
          return {
            id: selection?.id,
            textPosition: selection?.textPosition,
            textQuote: selection?.textQuote,
            style:
              selection?.style && typeof selection.style === "object"
                ? { ...selection.style }
                : {},
            range,
          };
        })
        .filter(Boolean);

      return {
        ...trace,
        selections: hydratedSelections,
      };
    })
    .filter((trace) => trace.selections.length > 0);
}

async function loadReadOnlyDocument() {
  const versionId = getVersionIdFromURL();
  if (!versionId) {
    setStatus(
      "Missing required query parameter: version_id. Example: document-viewer.html?version_id=<uuid>",
      { isError: true },
    );
    return;
  }

  const includeDeletedModels = getIncludeDeletedModelsFlagFromURL();
  shouldShowTags = getShowTagsFlagFromURL();
  setStatus("Loading document and selections...");

  try {
    const [content, links] = await Promise.all([
      documentsAPI.getContentByVersionId(versionId),
      documentModelLinksAPI.getLatestLinksByDocumentVersionId(versionId, {
        includeDeletedModels,
      }),
    ]);

    $documentContent.empty().append(content || "");
    hydratedTraces = hydrateTraceSelections(links);
    updateHeader(versionId);
    scheduleRender();

    const unresolvedSelections = (links || []).reduce((count, link) => {
      const linkSelections = Array.isArray(link?.selections)
        ? link.selections.length
        : 0;
      return count + linkSelections;
    }, 0);
    const hydratedSelectionCount = hydratedTraces.reduce(
      (count, trace) => count + trace.selections.length,
      0,
    );

    if (hydratedSelectionCount < unresolvedSelections) {
      setStatus(
        `Loaded with partial highlights: ${hydratedSelectionCount}/${unresolvedSelections} selections matched current DOM.`,
      );
    } else {
      setStatus("Loaded.", { visible: false });
    }
  } catch (error) {
    console.error("Failed to render read-only document:", error);
    setStatus(`Failed to load document render view: ${error.message}`, {
      isError: true,
    });
  }
}

if (
  $viewerWrap.length === 0 ||
  $documentContent.length === 0 ||
  $selectionsVisualLayer.length === 0
) {
  console.error(
    "document-viewer init failed: missing required DOM elements (viewerWrap/documentContent/selectionsVisualLayer).",
  );
} else {
  $(window).on("resize", scheduleRender);
  $viewerWrap.on("scroll", scheduleRender);
  loadReadOnlyDocument();
}
