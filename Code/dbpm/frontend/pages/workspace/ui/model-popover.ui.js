import { createUI } from "../../../shared/utils/ui.js";
import { modelsStore, workspaceStore } from "../store/index.js";
import modelService from "../services/model.service.js";
import { scopeSvgIds } from "../../../modules/model/utils/svg-scope.js";

const $modelPopover = $("#modelPopover");
const hostEl = $modelPopover[0];
const $popoverTitle = $("#modelPopoverName");
const $popoverVersion = $("#modelPopoverVersionName");
const $popoverBody = $("#modelPopoverGrid");
const createPopper = window.Popper?.createPopper;

const INTERACTIVE_PADDING = 20;
const POPOVER_OFFSET = 12;
const POPOVER_BOUNDARY_PADDING = 12;

let popperInstance = null;
let isPopoverVisible = false;
let pointerBridgeAttached = false;
let wasPointerInsideInteractiveZone = false;
let currentPopoverRequestToken = null;

let currentReferenceClientRect = () => ({
  width: 0,
  height: 0,
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

const virtualReference = {
  getBoundingClientRect: () => currentReferenceClientRect(),
  contextElement: undefined,
};

function normalizeComparableId(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function hasSameId(left, right) {
  return normalizeComparableId(left) === normalizeComparableId(right);
}

function clonePopoverAnchor(anchor) {
  if (!anchor || typeof anchor !== "object") {
    return null;
  }

  switch (anchor.type) {
    case "element":
      return anchor.element
        ? {
            type: "element",
            element: anchor.element,
          }
        : null;
    case "rect":
      return anchor.rect
        ? {
            type: "rect",
            rect: { ...anchor.rect },
          }
        : null;
    case "point":
      return anchor.point
        ? {
            type: "point",
            point: { ...anchor.point },
          }
        : null;
    default:
      return null;
  }
}

async function resolvePopoverGraphSource({ modelId, requestedVersionId }) {
  const latestVersionId = modelsStore.getLatestVersionId(modelId) ?? null;

  if (!requestedVersionId) {
    return {
      versionId: latestVersionId,
      graphSource: modelsStore.getModelGraphById(modelId),
    };
  }

  const resolvedVersionId = requestedVersionId;
  let cachedVersion = modelsStore.getCachedModelByVersionId(resolvedVersionId);

  if (!cachedVersion?.svg) {
    try {
      await modelService.ensureVersionCached(resolvedVersionId, {
        needData: true,
        needSvg: true,
        modelId,
      });
    } catch (error) {
      console.warn(
        `Failed to cache model version ${resolvedVersionId} for popover:`,
        error,
      );
    }
    cachedVersion = modelsStore.getCachedModelByVersionId(resolvedVersionId);
  }

  if (cachedVersion?.svg) {
    return {
      versionId: resolvedVersionId,
      graphSource: cachedVersion.svg,
    };
  }

  if (latestVersionId && !hasSameId(resolvedVersionId, latestVersionId)) {
    // Avoid showing the latest graph when a historical version is requested.
    return {
      versionId: resolvedVersionId,
      graphSource: null,
    };
  }

  return {
    versionId: resolvedVersionId,
    graphSource: modelsStore.getModelGraphById(modelId),
  };
}

function prepareSvgForPopover(svgEl) {
  const svgW = parseFloat(svgEl.getAttribute("width")) || 0;
  const svgH = parseFloat(svgEl.getAttribute("height")) || 0;
  const viewBoxAttr = svgEl.getAttribute("viewBox");
  const viewBoxParts = viewBoxAttr
    ? viewBoxAttr
        .trim()
        .split(/[\s,]+/)
        .map((v) => parseFloat(v))
    : [];
  const viewBoxW = viewBoxParts.length === 4 ? viewBoxParts[2] : 0;

  const intrinsicWidth = svgW > 0 ? svgW : viewBoxW;

  if (svgW > 0 && svgH > 0 && !svgEl.getAttribute("viewBox")) {
    svgEl.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  }
  svgEl.setAttribute("width", "100%");
  svgEl.removeAttribute("height");
  svgEl.style.display = "block";
  svgEl.style.width = "100%";
  svgEl.style.height = "auto";

  if (intrinsicWidth > 0) {
    svgEl.style.maxWidth = `${intrinsicWidth}px`;
  } else {
    svgEl.style.removeProperty("max-width");
  }
}

function createScopedPopoverSvg(svgSource, modelId) {
  if (!svgSource || !modelId) {
    return null;
  }

  let svgEl = null;
  if (typeof svgSource === "string") {
    try {
      svgEl = $.parseXML(svgSource).documentElement;
    } catch (error) {
      console.error("Failed to parse model popover SVG:", error);
      return null;
    }
  } else if (svgSource instanceof Element) {
    svgEl = svgSource.cloneNode(true);
  }

  if (!svgEl) {
    return null;
  }

  prepareSvgForPopover(svgEl);
  scopeSvgIds(svgEl, `popover_m${modelId}`);
  return svgEl;
}

function updateModelPopoverContent({ modelId, versionId, modelGraph }) {
  if (
    !hostEl ||
    !$popoverTitle.length ||
    !$popoverVersion.length ||
    !$popoverBody.length
  ) {
    throw new Error("Model popover inner elements are missing from DOM");
  }

  const resolvedVersionId =
    versionId ?? modelsStore.getLatestVersionId(modelId) ?? null;
  const modelName = modelsStore.getEntityName(modelId) || "Unnamed model";
  const versionName = resolvedVersionId
    ? modelsStore.getVersion(modelId, resolvedVersionId)?.name ||
      resolvedVersionId
    : modelsStore.getLatestVersionName(modelId) || "No version";

  $modelPopover.attr("data-model-id", String(modelId));
  if (resolvedVersionId) {
    $modelPopover.attr("data-model-version-id", String(resolvedVersionId));
  } else {
    $modelPopover.removeAttr("data-model-version-id");
  }

  $popoverTitle.text(modelName);
  $popoverVersion.text(versionName);
  $popoverBody.empty().append(modelGraph);
}

function resolvePopoverPlacement(modelPopoverState) {
  switch (modelPopoverState?.hoverSource) {
    case "models-list":
      return "left";
    case "document-tag":
    case "graph-node":
      return "top";
    case "subprocess-node":
      return "left";
    default:
      return "top";
  }
}

function getReferenceClientRect(anchor) {
  if (anchor.type === "element") {
    return () => anchor.element.getBoundingClientRect();
  }

  if (anchor.type === "rect" && anchor.rect) {
    return () => {
      const top = Number(anchor.rect.top) || 0;
      const bottom = Number(anchor.rect.bottom) || top;
      const left = Number(anchor.rect.left) || 0;
      const right = Number(anchor.rect.right) || left;
      const width = Number(anchor.rect.width);
      const height = Number(anchor.rect.height);
      return {
        top,
        bottom,
        left,
        right,
        width: Number.isFinite(width) ? width : Math.max(0, right - left),
        height: Number.isFinite(height) ? height : Math.max(0, bottom - top),
      };
    };
  }

  return () => ({
    width: 0,
    height: 0,
    top: anchor.point.y,
    bottom: anchor.point.y,
    left: anchor.point.x,
    right: anchor.point.x,
  });
}

function buildPopperOptions(placement) {
  return {
    placement,
    strategy: "fixed",
    modifiers: [
      { name: "offset", options: { offset: [0, POPOVER_OFFSET] } },
      {
        name: "preventOverflow",
        options: {
          padding: POPOVER_BOUNDARY_PADDING,
          boundary: "viewport",
        },
      },
    ],
  };
}

function updateVirtualReference(anchor) {
  currentReferenceClientRect = getReferenceClientRect(anchor);
  virtualReference.contextElement =
    anchor.type === "element" ? anchor.element : undefined;
}

function destroyPopperInstance() {
  if (!popperInstance) {
    return;
  }
  try {
    popperInstance.destroy();
  } catch (error) {
    console.warn("Failed to destroy model popover popper instance:", error);
  } finally {
    popperInstance = null;
  }
}

function ensurePopperInstance(placement) {
  if (!createPopper) {
    throw new Error("Popper.js is not available on window.Popper");
  }
  if (!popperInstance) {
    popperInstance = createPopper(
      virtualReference,
      hostEl,
      buildPopperOptions(placement),
    );
  } else {
    popperInstance.setOptions(buildPopperOptions(placement));
  }
  return popperInstance;
}

function withinInteractivePadding(event, rect, padding) {
  const x = event.clientX;
  const y = event.clientY;
  return (
    x >= rect.left - padding &&
    x <= rect.right + padding &&
    y >= rect.top - padding &&
    y <= rect.bottom + padding
  );
}

function isPointerWithinInteractiveZone(event) {
  const popoverRect = hostEl.getBoundingClientRect();
  if (withinInteractivePadding(event, popoverRect, INTERACTIVE_PADDING)) {
    return true;
  }
  const anchorRect = currentReferenceClientRect();
  return withinInteractivePadding(event, anchorRect, INTERACTIVE_PADDING);
}

function onPointerBridgeMove(event) {
  if (!isPopoverVisible) {
    return;
  }
  if (isPointerWithinInteractiveZone(event)) {
    wasPointerInsideInteractiveZone = true;
    workspaceStore.cancelCloseModelPopover();
    workspaceStore.cancelOpenModelPopover();
    return;
  }
  if (wasPointerInsideInteractiveZone) {
    workspaceStore.requestCloseModelPopover("pointer-bridge");
  }
  wasPointerInsideInteractiveZone = false;
}

function attachPointerBridge() {
  if (pointerBridgeAttached) {
    return;
  }
  document.addEventListener("mousemove", onPointerBridgeMove, true);
  pointerBridgeAttached = true;
}

function detachPointerBridge() {
  if (!pointerBridgeAttached) {
    return;
  }
  document.removeEventListener("mousemove", onPointerBridgeMove, true);
  pointerBridgeAttached = false;
}

function showModelPopover({
  modelId,
  versionId,
  modelGraph,
  anchor,
  placement,
}) {
  updateVirtualReference(anchor);
  updateModelPopoverContent({ modelId, versionId, modelGraph });
  $modelPopover.removeClass("hidden").attr("aria-hidden", "false");
  const instance = ensurePopperInstance(placement);
  isPopoverVisible = true;
  wasPointerInsideInteractiveZone = false;
  attachPointerBridge();
  instance.update();
}

function getVisiblePopoverModelId() {
  return $modelPopover.attr("data-model-id") || null;
}

function hideModelPopover() {
  if (!isPopoverVisible) {
    return;
  }
  $modelPopover.addClass("hidden").attr("aria-hidden", "true");
  isPopoverVisible = false;
  wasPointerInsideInteractiveZone = false;
  detachPointerBridge();
}

function onModelPopoverMouseEnter() {
  workspaceStore.cancelCloseModelPopover();
  workspaceStore.cancelOpenModelPopover();
}

function onModelPopoverMouseLeave() {
  workspaceStore.requestCloseModelPopover("popover");
}

async function showRequestedModelPopover(snapshot, requestToken) {
  const { versionId, graphSource } = await resolvePopoverGraphSource({
    modelId: snapshot.modelId,
    requestedVersionId: snapshot.versionId,
  });
  if (requestToken !== currentPopoverRequestToken) {
    return;
  }
  if (!graphSource) {
    console.warn("Model graph not available for popover:", {
      modelId: snapshot.modelId,
      versionId,
    });
    return;
  }

  const modelGraph = createScopedPopoverSvg(graphSource, snapshot.modelId);
  if (!modelGraph) {
    console.warn("Model graph is empty for popover:", snapshot.modelId);
    return;
  }

  const anchor = snapshot.anchor;
  if (
    anchor.type === "element" &&
    (!anchor.element || !document.body.contains(anchor.element))
  ) {
    console.warn("Anchor element not in DOM, skipping popover show");
    return;
  }

  const placement = resolvePopoverPlacement({
    hoverSource: snapshot.hoverSource,
  });
  const popoverPayload = {
    modelId: snapshot.modelId,
    versionId,
    modelGraph,
    anchor,
    placement,
  };

  try {
    showModelPopover(popoverPayload);
  } catch (error) {
    console.warn(
      "Error showing model popover, recreating popper instance:",
      error,
    );
    try {
      destroyPopperInstance();
      showModelPopover(popoverPayload);
    } catch (retryError) {
      console.error(
        "Error showing model popover after popper recreation:",
        retryError,
      );
    }
  }
}

function handleModelPopoverStateChange(modelPopoverState) {
  if (
    modelPopoverState &&
    modelPopoverState.target?.id &&
    modelPopoverState.anchor
  ) {
    const requestToken = Symbol("modelPopoverRequest");
    currentPopoverRequestToken = requestToken;
    const visibleModelId = getVisiblePopoverModelId();
    if (
      isPopoverVisible &&
      visibleModelId !== String(modelPopoverState.target.id)
    ) {
      hideModelPopover();
    }

    const snapshot = {
      modelId: modelPopoverState.target.id,
      versionId: modelPopoverState.target.versionId ?? null,
      anchor: clonePopoverAnchor(modelPopoverState.anchor),
      hoverSource: modelPopoverState.hoverSource || null,
    };
    if (!snapshot.anchor) {
      console.warn("Model popover anchor is invalid, skipping popover show");
      return;
    }

    void showRequestedModelPopover(snapshot, requestToken);
    return;
  }

  currentPopoverRequestToken = null;
  try {
    hideModelPopover();
  } catch (error) {
    console.error("Error hiding model popover:", error);
  }
}

createUI({
  bindListeners: () => {
    $modelPopover.on("mouseenter", onModelPopoverMouseEnter);
    $modelPopover.on("mouseleave", onModelPopoverMouseLeave);
  },
  subscribeStores: () => {
    workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
      switch (key) {
        case "modelPopover":
          handleModelPopoverStateChange(newValue);
          break;
        default:
          break;
      }
    });
  },
});
