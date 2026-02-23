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
const $versionSelect = $("#docVersionSelect");
const $selectionColorForm = $("#selectionColorForm");
const $deleteSelectionButton = $("#deleteSelectionButton");
const $documentContent = $("#documentContent");
const $viewerWrap = $("#viewerWrap");
const $selectionsVisualLayer = $("#selectionsVisualLayer");
const $temporarySelectionsLayer = $("#temporarySelectionsLayer");
const $selectionsInteractionLayer = $("#selectionsInteractionLayer");
const $modelTagsLayer = $("#modelTagsLayer");
const $addSelectionsButton = $("#addSelectionsButton");
const $generateButton = $("#generateButton");
const HIGHLIGHT_SELECTION_TEMPLATE_ID = "highlightSelectionTemplate";
const INTERACTION_SELECTION_TEMPLATE_ID = "interactionSelectionTemplate";
const SELECTION_RECT_TEMPLATE_ID = "selectionRectTemplate";
const MODEL_TAG_TEMPLATE_ID = "modelTagTemplate";

let selectedSelection = null;

function createSelectionWrap({
  templateId,
  selectionId,
  modelId,
  top,
  left,
  width,
  height,
  isActive = false,
}) {
  const $wrap = createTemplateElement(templateId)
    .attr("data-selectionid", selectionId)
    .css({ top, left, width, height });
  if (modelId) {
    $wrap.attr("data-model-id", modelId);
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
    .addClass("interaction-rect")
    .attr("data-selectionid", selectionId)
    .css({
      top,
      left,
      width,
      height,
      backgroundColor: "transparent",
    });
  if (modelId) {
    $rect.attr("data-model-id", modelId);
  }
  if (traceId) {
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
  isActive,
}) {
  const $tag = createTemplateElement(MODEL_TAG_TEMPLATE_ID)
    .attr("data-model-id", modelId)
    .attr("data-selectionid", selectionId)
    .text(modelName)
    .css({ top, left });
  if (isActive) {
    $tag.addClass("active");
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
}

function setSelectedSelection(selection) {
  const currentSelectedSelection = selectedSelection;
  selectedSelection = selection;

  if (currentSelectedSelection) {
    $selectionsInteractionLayer
      .find(
        `.selection-wrap[data-selectionid="${currentSelectedSelection.selectionId}"]`,
      )
      .removeClass("selected");
  }
  if (selection) {
    const { selectionId } = selection;
    $selectionsInteractionLayer
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

  const $selectionWrap = $target.closest(".selection-wrap");
  const selectionId =
    $target.attr("data-selectionid") || $selectionWrap.attr("data-selectionid");
  const modelId =
    $target.attr("data-model-id") || $selectionWrap.attr("data-model-id");
  const traceId =
    $target.attr("data-traceid") || $selectionWrap.attr("data-traceid");
  setSelectedSelection({ selectionId, modelId, traceId });

  const $buttonGroup = $("#textActionBar .action-group");
  const selectionSelector = `.interaction-rect[data-selectionid="${selectionId}"]`;
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
//   return modelId == workspaceStore.getDisplayedModelId();
// }

const renderSelection = (
  { range, color, id: selectionId, traceId },
  modelId,
  modelVersionId,
) => {
  //todo
  const isActiveModel = modelId
    ? modelId === workspaceStore.getDisplayedModelId()
    : false;

  // console.log(
  //   "Rendering selection:",
  //   workspaceStore.getDisplayedModelId(),
  //   modelId,
  //   isActiveModel,
  // );
  const eleViewerWrap = $viewerWrap[0];
  const eleViewerWrapRect = eleViewerWrap.getBoundingClientRect();

  const rects = range.getClientRects();
  const selectionRect = range.getBoundingClientRect();
  const selectionRectTop = selectionRect.top;
  const selectionRectLeft = selectionRect.left;
  const wrapTop = `${selectionRectTop - eleViewerWrapRect.top + eleViewerWrap.scrollTop}px`;
  const wrapLeft = `${selectionRectLeft - eleViewerWrapRect.left + eleViewerWrap.scrollLeft}px`;
  const wrapWidth = `${selectionRect.width}px`;
  const wrapHeight = `${selectionRect.height}px`;

  const $highlightWrap = createSelectionWrap({
    templateId: HIGHLIGHT_SELECTION_TEMPLATE_ID,
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

    const modelName =
      modelsStore.getVersionName(modelId, modelVersionId) || "-";

    const $tag = createModelTag({
      modelId,
      selectionId,
      modelName: `${modelName}`,
      top: `${lastRect.top - eleViewerWrapRect.top + eleViewerWrap.scrollTop - 10}px`,
      left: `${lastRect.right - eleViewerWrapRect.left + eleViewerWrap.scrollLeft - 10}px`,
      isActive: modelId == workspaceStore.getDisplayedModelId(),
    });
    $modelTagsLayer.append($tag);
  }
  const $interactionWrap = createSelectionWrap({
    templateId: INTERACTION_SELECTION_TEMPLATE_ID,
    selectionId,
    modelId,
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
      height: `${rect.height - 4}px`,
      selectionId,
      modelId,
      traceId,
    });
    $interactionWrap.append($interactionRect);
  }

  $interactionWrap.appendTo($selectionsInteractionLayer);
  if (selectedSelection && selectedSelection.selectionId === selectionId) {
    $interactionWrap.addClass("selected");
  }
};

function unhighlightModelSelections(modelId) {
  $selectionsVisualLayer
    .find(`.selection-wrap[data-model-id="${modelId}"]`)
    .removeClass("active");
  $modelTagsLayer
    .find(`.tag-span[data-model-id="${modelId}"]`)
    .removeClass("active");

  $selectionsInteractionLayer
    .find(`.selection-wrap[data-model-id="${modelId}"]`)
    .remove();
}

const rerenderTemporarySelectionsLayer = () => {
  // if (hasTemporarySelections()) {
  //   $temporarySelectionsLayer.empty();
  //   temporarySelections.forEach((range) => renderSelection(range));
  // }
};

const renderTrace = ({ selections, modelId, modelVersionId }) => {
  selections.forEach((selection, index) => {
    renderSelection(selection, modelId, modelVersionId);
  });
};

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
  // $generateButton.prop("disabled", false);
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
    // Initial UI setup if needed
    const versionSelector = initVersionSelector({
      $select: $versionSelect,
      onSelect: ({ version }) => {
        workspaceService.displayDocument({
          id: version.documentId,
          versionId: version.id,
        });
      },
    });
    return { versionSelector };
  },
  bindListeners: () => {
    $selectionColorForm.on("input", (e) => {
      console.log("Selection color input.");
      console.log(e.target.value);
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
    $generateButton.on("click", async () => {
      modelService.generateModelBySelections();
    });
    $viewerWrap.on("scroll", rerenderOverlayLayers);
    $("#columnResizehandle1").on("dragcolumnmove", (e) => {
      // e.stopPropagation();
      rerenderOverlayLayers();
    });
    $(window).on("resize", rerenderOverlayLayers);
    $selectionsInteractionLayer.on("click", ".range-rect", onSelectionSelect);
    // Event listeners are set up in the initActiveDocumentUI function
    $modelTagsLayer.on("click", ".tag-span", (event) => {
      // const $target = $(event.currentTarget);
      event.stopPropagation();
      const modelId = event.currentTarget.dataset.modelId;
      workspaceService.toggleModelDisplay({ id: modelId });
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
              default:
                break;
            }
            break;
          case "activeModelTrace.selections":
            switch (operation) {
              case "update":
                removeRenderedSelection(value);
                renderSelection(value, workspaceStore.getDisplayedModelId());
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
              $generateButton.prop("disabled", false);
              $addSelectionsButton.prop("disabled", false);
            } else {
              $generateButton.prop("disabled", true);
            }
            break;
          default:
            break;
        }
      }
    });

    workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
      switch (key) {
        case "displayedDocument":
          if (newValue.id) {
            const versions = documentsStore.getVersions(newValue.id);
            versionSelector.update({
              versions,
              selectedId: newValue.versionId,
            });
          }
          // if (newValue) {
          // versionSelector.update({
          //   versions,
          //   selectedId: newValue.versionId,
          // });
          // if (newValue.id) {
          //   $generateButton.text("Regenerate Model");
          //   $generateButton.prop(
          //     "disabled",
          //     !documentViewerStore.getHasSelectionChanged(),
          //   );
          //   $addSelectionsButton.show();
          //   $addSelectionsButton.prop(
          //     "disabled",
          //     !documentViewerStore.getHasSelectionChanged(),
          //   );
          // } else {
          //   $generateButton.text("Generate Model");
          //   $addSelectionsButton.hide();
          // }
          break;
        default:
          break;
      }
    });
  },
});
