import { modelsStore, workspaceStore } from "../store/index.js";
import { scopeSvgIds } from "../../../modules/model/utils/svg-scope.js";

const $modelPopover = $("#modelPopover");
const hostEl = $modelPopover[0];
const createPopper = window.Popper?.createPopper;

const INTERACTIVE_PADDING = 20;
const POPOVER_OFFSET = 12;
const POPOVER_BOUNDARY_PADDING = 12;

let popperInstance = null;
let popoverScopeCounter = 0;
let isPopoverVisible = false;
let pointerBridgeAttached = false;

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
  popoverScopeCounter += 1;
  scopeSvgIds(svgEl, `popover_m${modelId}_${popoverScopeCounter}`);
  return svgEl;
}

function createModelPopoverContent({ modelId, versionId, modelGraph }) {
  const resolvedVersionId =
    versionId || modelsStore.getLatestVersionId(modelId) || null;
  const modelName = modelsStore.getEntityName(modelId) || "Unnamed model";
  const versionName = resolvedVersionId
    ? modelsStore.getVersion(modelId, resolvedVersionId)?.name ||
      resolvedVersionId
    : modelsStore.getLatestVersionName(modelId) || "No version";

  const container = document.createElement("div");
  container.className = "model-popover-container";
  container.dataset.modelId = String(modelId);
  if (resolvedVersionId) {
    container.dataset.modelVersionId = String(resolvedVersionId);
  }

  const header = document.createElement("div");
  header.className = "model-popover-header";

  const title = document.createElement("span");
  title.className = "model-popover-title";
  title.textContent = modelName;

  const version = document.createElement("span");
  version.className = "model-popover-version";
  version.textContent = versionName;

  header.append(title, version);

  const body = document.createElement("div");
  body.className = "model-popover-body";
  body.append(modelGraph);

  container.append(header, body);
  return container;
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
        name: "flip",
        options: {
          fallbackPlacements: ["bottom", "right", "left"],
          padding: POPOVER_BOUNDARY_PADDING,
        },
      },
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

function onPointerBridgeMove(event) {
  if (!isPopoverVisible) {
    return;
  }
  const rect = hostEl.getBoundingClientRect();
  if (withinInteractivePadding(event, rect, INTERACTIVE_PADDING)) {
    workspaceStore.cancelCloseModelPopover();
    workspaceStore.cancelOpenModelPopover();
  }
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
  hostEl.replaceChildren(
    createModelPopoverContent({ modelId, versionId, modelGraph }),
  );
  hostEl.classList.remove("hidden");
  hostEl.setAttribute("aria-hidden", "false");
  const instance = ensurePopperInstance(placement);
  isPopoverVisible = true;
  attachPointerBridge();
  instance.update();
}

function hideModelPopover() {
  if (!isPopoverVisible) {
    return;
  }
  hostEl.classList.add("hidden");
  hostEl.setAttribute("aria-hidden", "true");
  isPopoverVisible = false;
  detachPointerBridge();
}

hostEl.addEventListener("mouseenter", () => {
  workspaceStore.cancelCloseModelPopover();
  workspaceStore.cancelOpenModelPopover();
});

hostEl.addEventListener("mouseleave", () => {
  workspaceStore.requestCloseModelPopover("popover");
});

workspaceStore.subscribe((state, { key, newValue }) => {
  switch (key) {
    case "modelPopover":
      if (newValue && newValue.target?.id && newValue.anchor) {
        const modelId = newValue.target.id;
        const versionId =
          newValue.target.versionId ?? modelsStore.getLatestVersionId(modelId);

        const modelGraphSource = modelsStore.getModelGraphById(modelId);
        if (!modelGraphSource) {
          break;
        }

        const modelGraph = createScopedPopoverSvg(modelGraphSource, modelId);
        if (!modelGraph) {
          console.warn("Model graph is empty for popover:", modelId);
          break;
        }

        const anchor = newValue.anchor;
        if (
          anchor.type === "element" &&
          !document.body.contains(anchor.element)
        ) {
          console.warn("Anchor element not in DOM, skipping popover show");
          break;
        }

        const placement = resolvePopoverPlacement(newValue);
        const popoverPayload = {
          modelId,
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
      } else {
        try {
          hideModelPopover();
        } catch (error) {
          console.error("Error hiding model popover:", error);
        }
      }
      break;
    default:
      break;
  }
});
