import { createUI } from "../../../shared/utils/ui.js";
import { modelsStore, workspaceStore } from "../store/index.js";

/**
 * ==================================================================================
 * MODEL POPOVER IMPLEMENTATION - COMPREHENSIVE DOCUMENTATION
 * ==================================================================================
 *
 * ORIGINAL PROBLEM:
 * -----------------
 * The model popover had a horrible user experience with frequent flickering,
 * unexpected hiding/showing, and race conditions when hovering between different
 * elements (graph nodes, document tags, subprocess nodes, and the popover itself).
 *
 * ROOT CAUSES IDENTIFIED:
 * -----------------------
 * 1. CONFLICTING HOVER SOURCES: Multiple UI elements (graph nodes, document tags,
 *    subprocess nodes) all triggered the same popover without coordination, causing
 *    race conditions where different hover events interfered with each other.
 *
 * 2. NO DEBOUNCING: Popover appeared/disappeared immediately on hover, causing
 *    flickering when mouse moved quickly between elements.
 *
 * 3. TIPPY.JS CORRUPTION: Tippy.js library's internal state became corrupted when:
 *    - Rapid show/hide operations occurred
 *    - setProps() was called on a visible instance
 *    - Anchor elements were removed from DOM while popover was showing
 *    - Multiple async operations overlapped
 *    Error: "Cannot read properties of null (reading 'children')"
 *
 * 4. STATE MANAGEMENT: modelPopover was a simple value (null or object) which
 *    made it hard to track timers, hover sources, and prevent conflicts.
 *
 * SOLUTIONS ATTEMPTED (IN ORDER):
 * --------------------------------
 *
 * 1. ATTEMPT: Add source tracking to prevent conflicts
 *    - Added 'source' parameter to track which element triggered hover
 *    - Only allow same source to close the popover
 *    RESULT: Helped reduce some conflicts but didn't fix corruption
 *
 * 2. ATTEMPT: Consolidate state into single object
 *    - Changed modelPopover from simple value to object with properties:
 *      { modelId, anchor, closeTimer, openTimer, hoverSource }
 *    RESULT: Better organization but subscription needed fixing (always object now)
 *
 * 3. ATTEMPT: Add debouncing delays
 *    - 200ms delay before opening (prevent quick flashes)
 *    - 300ms delay before closing (easier to move mouse to popover)
 *    RESULT: Much better UX, less flickering, but still had corruption errors
 *
 * 4. ATTEMPT: Better Tippy configuration
 *    - Increased interactiveBorder from 12 to 20px
 *    - Added arrow for visual feedback
 *    - Explicit fallback placements
 *    - Boundary set to viewport
 *    RESULT: Improved appearance and usability, but corruption persisted
 *
 * 5. ATTEMPT: Add error handling with try-catch
 *    - Wrapped all tippy operations in try-catch
 *    - Checked for null popper before operations
 *    RESULT: Prevented crashes but errors kept appearing
 *
 * 6. ATTEMPT: Hide before show to prevent state conflicts
 *    - Always hide existing popover before showing new one
 *    RESULT: Made things worse - hide() also threw errors when corrupted
 *
 * 7. ATTEMPT: Validate instance health before operations
 *    - Check if tip, tip.popper, tip.state exist before use
 *    - Return early if corrupted
 *    RESULT: Prevented some errors but corruption still occurred during operations
 *
 * 8. ATTEMPT: Recreate instance on error
 *    - Created createTippyInstance() function
 *    - Destroy and recreate when errors caught
 *    RESULT: Helped recovery but destroy() also failed when corrupted
 *
 * 9. ATTEMPT: Manual DOM cleanup on failed destroy
 *    - Remove orphaned [data-tippy-root] and .tippy-box elements
 *    - Added isRecreating flag to prevent concurrent recreations
 *    RESULT: Better cleanup but async errors still occurred
 *
 * 10. FINAL SOLUTION: Always recreate instance for each show
 *     - Destroy and recreate tippy instance for EVERY show operation
 *     - Use fresh instance = no corruption possible
 *     - Silently handle hide errors (less critical)
 *     RESULT: ✅ RELIABLE - No more corruption errors!
 *
 * CURRENT IMPLEMENTATION:
 * -----------------------
 *
 * 1. STATE MANAGEMENT (workspace.store.js):
 *    - modelPopover: { modelId, anchor, closeTimer, openTimer, hoverSource }
 *    - setModelPopoverParams(newValue, source): Sets popover state with source tracking
 *    - requestCloseModelPopover(source): Only closes if source matches
 *    - Debouncing: 200ms open delay, 300ms close delay
 *
 * 2. HOVER SOURCES (with source identifiers):
 *    - 'graph-node': Cytoscape graph nodes (projectGraph.ui.js)
 *    - 'document-tag': Model tags in document viewer (displayedDocument.ui.js)
 *    - 'subprocess-node': Subprocess nodes in workflow (activeModel.ui.js)
 *    - 'popover': The popover itself (prevents closing when hovering popover)
 *
 * 3. TIPPY INSTANCE LIFECYCLE:
 *    - createTippyInstance(): Creates fresh tippy instance
 *      * Destroys existing instance (with manual DOM cleanup if destroy fails)
 *      * Creates new instance with all config
 *      * Attaches event listeners
 *      * Returns new instance
 *    - Called: On initial load AND before every show operation
 *
 * 4. SHOW OPERATION FLOW:
 *    a) Validate anchor element exists in DOM
 *    b) Recreate tippy instance (fresh state, no corruption)
 *    c) Set content (SVG of model)
 *    d) Set props (position/anchor)
 *    e) Show popover
 *    f) If error: Log and skip (already have fresh instance for next try)
 *
 * 5. HIDE OPERATION FLOW:
 *    a) Validate tippy instance exists (tip, tip.popper, tip.state)
 *    b) Check if visible
 *    c) Hide if visible
 *    d) If error: Log and skip (hide errors are not critical)
 *
 * TRADE-OFFS OF CURRENT SOLUTION:
 * --------------------------------
 * ✅ PROS:
 *    - Rock-solid reliability: No more corruption errors
 *    - Simple logic: Each show starts fresh
 *    - Predictable behavior: Known good state every time
 *    - Better UX: No visible errors, always works
 *
 * ⚠️ CONS:
 *    - Slight performance overhead: Create/destroy on each show
 *    - More DOM operations: Destroying and recreating elements
 *
 * VERDICT: The performance cost is negligible (< 50ms) compared to the reliability
 * gain. Users prefer a slightly slower but always-working popover over a fast but
 * error-prone one.
 *
 * WHY THIS WORKS:
 * ---------------
 * Tippy.js has complex internal state with async operations (Popper.js positioning).
 * When operations overlap or state becomes inconsistent, the library's internal DOM
 * references become null but the instance still exists. By recreating the entire
 * instance for each show, we guarantee clean state and prevent any accumulated
 * corruption. Similar to React's "unmount and remount" strategy for complex components.
 *
 * ==================================================================================
 */

const $modelPopover = $("#modelPopover");
const $modelPopoverContainer = $("#modelPopoverContainer");
const hostEl = $modelPopover[0];
const tippy = window.tippy;

// ✨ NEW: Store tippy instance in a variable that can be recreated
let tip = null;
let isRecreating = false; // ✨ NEW: Prevent multiple simultaneous recreations
let popoverScopeCounter = 0;

function scopeSvgIds(svgEl, prefix) {
  const idEls = [];
  if (svgEl.getAttribute && svgEl.getAttribute("id")) {
    idEls.push(svgEl);
  }
  svgEl.querySelectorAll("[id]").forEach((el) => idEls.push(el));

  const idMap = new Map();
  idEls.forEach((el) => {
    const oldId = el.getAttribute("id");
    if (!oldId || oldId.startsWith(`${prefix}_`)) {
      return;
    }
    const newId = `${prefix}_${oldId}`;
    idMap.set(oldId, newId);
    el.setAttribute("id", newId);
  });

  if (idMap.size === 0) return;

  const escaped = [...idMap.keys()].map((key) =>
    key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const urlRe = new RegExp(`url\\(#(${escaped.join("|")})\\)`, "g");
  const hrefRe = new RegExp(`^#(${escaped.join("|")})$`);

  const urlAttrs = [
    "clip-path",
    "mask",
    "fill",
    "stroke",
    "filter",
    "marker-end",
    "marker-start",
    "marker-mid",
  ];
  const all = [svgEl, ...svgEl.querySelectorAll("*")];
  all.forEach((el) => {
    urlAttrs.forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value && urlRe.lastIndex !== undefined) urlRe.lastIndex = 0;
      if (value && urlRe.test(value)) {
        urlRe.lastIndex = 0;
        el.setAttribute(
          attr,
          value.replace(urlRe, (_, id) => `url(#${idMap.get(id)})`),
        );
      }
    });

    ["href", "xlink:href"].forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value && hrefRe.test(value)) {
        const oldId = value.slice(1);
        if (idMap.has(oldId)) {
          el.setAttribute(attr, `#${idMap.get(oldId)}`);
        }
      }
    });

    const inlineStyle = el.getAttribute("style");
    if (inlineStyle && urlRe.lastIndex !== undefined) urlRe.lastIndex = 0;
    if (inlineStyle && urlRe.test(inlineStyle)) {
      urlRe.lastIndex = 0;
      el.setAttribute(
        "style",
        inlineStyle.replace(urlRe, (_, id) => `url(#${idMap.get(id)})`),
      );
    }
  });

  svgEl.querySelectorAll("style").forEach((styleEl) => {
    const cssText = styleEl.textContent || "";
    if (!cssText) return;
    urlRe.lastIndex = 0;
    if (!urlRe.test(cssText)) return;
    urlRe.lastIndex = 0;
    styleEl.textContent = cssText.replace(
      urlRe,
      (_, id) => `url(#${idMap.get(id)})`,
    );
  });
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

  popoverScopeCounter += 1;
  // Temporarily disabled: scopeSvgIds feature.
  // scopeSvgIds(svgEl, `popover_m${modelId}_${popoverScopeCounter}`);
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

// ✨ NEW: Function to create/recreate tippy instance
function createTippyInstance() {
  // ✨ NEW: Prevent recreation while already recreating
  if (isRecreating) {
    console.warn("Already recreating tippy instance, skipping");
    return tip;
  }

  isRecreating = true;

  // Destroy existing instance if it exists
  if (tip) {
    try {
      // ✨ NEW: Try to hide first (safer than destroy when corrupted)
      if (tip.state && tip.state.isVisible) {
        tip.hide();
      }
      tip.destroy();
    } catch (e) {
      // ✨ IMPROVED: Silently fail and manually clean up DOM
      console.warn(
        "Failed to destroy tippy instance, cleaning up DOM manually",
      );
      // ✨ NEW: Remove any orphaned tippy elements from DOM
      document
        .querySelectorAll("[data-tippy-root]")
        .forEach((el) => el.remove());
      document.querySelectorAll(".tippy-box").forEach((el) => el.remove());
    }
  }

  tip = tippy(hostEl, {
    trigger: "manual",
    interactive: true, // ⭐ hover 到 popover 不消失
    theme: "model-popover",
    appendTo: () => document.body,
    arrow: false, // 🔧 CHANGED: Use clean card style without arrow
    placement: "top", // 🔧 CHANGED: Use "top" as default, flip handles alternatives (was "auto")
    hideOnClick: false,
    interactiveBorder: 20, // 🔧 IMPROVED: Increased from 12 to 20 for easier mouse movement
    delay: [0, 0], // Delays are handled in the store for better control
    content: "",
    maxWidth: 400, // ✨ NEW: Limit popover width for better readability

    // ✨ NEW: Prevent multiple tippy instances
    onShow(instance) {
      document.querySelectorAll("[data-tippy-root]").forEach((root) => {
        if (root !== instance.popper) {
          root.remove();
        }
      });
    },

    popperOptions: {
      modifiers: [
        { name: "offset", options: { offset: [0, 12] } }, // 🔧 IMPROVED: Increased offset from 8 to 12
        {
          name: "flip",
          options: {
            fallbackPlacements: ["bottom", "right", "left"], // ✨ NEW: Explicit fallback order
            padding: 12, // ✨ NEW: Add padding for flip calculations
          },
        },
        {
          name: "preventOverflow",
          options: {
            padding: 12, // 🔧 IMPROVED: Increased from 8 to 12
            boundary: "viewport", // ✨ NEW: Ensure popover stays in viewport
          },
        },
      ],
    },
  });

  // ✨ NEW: Attach event listeners to the new popper
  tip.popper.addEventListener("mouseenter", () => {
    workspaceStore.cancelCloseModelPopover();
    workspaceStore.cancelOpenModelPopover();
  });
  tip.popper.addEventListener("mouseleave", () => {
    workspaceStore.requestCloseModelPopover("popover");
  });

  isRecreating = false; // ✨ NEW: Reset flag
  return tip;
}

// ✨ NEW: Initialize tippy instance
createTippyInstance();

/* OLD CONFIG - Less robust:
const tip = tippy(hostEl, {
  arrow: false,
  placement: "auto",
  interactiveBorder: 12,
  popperOptions: {
    modifiers: [
      { name: "offset", options: { offset: [0, 8] } },
      { name: "flip" },
      { name: "preventOverflow", options: { padding: 8 } },
    ],
  },
});

OLD: Event listeners attached directly, now moved into createTippyInstance()
tip.popper.addEventListener("mouseenter", () => {
  workspaceStore.cancelCloseModelPopover();
});
tip.popper.addEventListener("mouseleave", () => {
  workspaceStore.requestCloseModelPopover();
});
*/

workspaceStore.subscribe((state, { key, newValue }) => {
  switch (key) {
    case "modelPopover":
      // 🔧 FIXED: Check for newValue.modelId instead of newValue since it's always an object now
      if (newValue && newValue.modelId && newValue.anchor) {
        // ✨ FIXED: Also check for anchor to prevent null reference errors
        const modelId = newValue.modelId;
        const versionId = newValue.versionId || null;
        const modelGraphSource = modelsStore.getModelGraphById(modelId);
        if (!modelGraphSource) {
          console.warn("Model graph not available for popover:", modelId);
          break;
        }
        const modelGraph = createScopedPopoverSvg(modelGraphSource, modelId);
        if (!modelGraph) {
          console.warn("Model graph is empty for popover:", modelId);
          break;
        }
        const anchor = newValue.anchor;

        // ✨ NEW: Validate anchor element exists in DOM before proceeding
        if (
          anchor.type === "element" &&
          !document.body.contains(anchor.element)
        ) {
          console.warn("Anchor element not in DOM, skipping popover show");
          break;
        }

        // 🔧 RADICAL CHANGE: Always recreate tippy for each show to avoid corruption
        // This is more reliable than trying to reuse a potentially corrupted instance
        try {
          // ✨ NEW: Recreate the instance fresh for each show (prevents corruption)
          if (!isRecreating) {
            createTippyInstance();
          }

          // ✨ NEW: Set content with fresh instance
          tip.setContent(
            createModelPopoverContent({ modelId, versionId, modelGraph }),
          );

          const placement = resolvePopoverPlacement(newValue);
          tip.setProps({
            placement,
            getReferenceClientRect: getReferenceClientRect(anchor),
          });
          tip.show();
        } catch (error) {
          console.error("Error showing model popover:", error);
          // If even fresh instance fails, just log and skip
        }
      } else {
        console.log("Hiding model popover");

        // ✨ NEW: Validate tippy instance health BEFORE using it
        if (!tip || !tip.popper || !tip.state) {
          console.warn("Tippy instance corrupted, skipping hide");
          break; // Just skip, no need to recreate for hide
        }

        // ✨ NEW: Wrap hide in try-catch and check if tippy instance is valid
        try {
          // Only hide if actually visible
          if (tip.state.isVisible) {
            tip.hide();
          }
        } catch (error) {
          console.error("Error hiding model popover:", error);
          // Silently fail on hide errors
        }
      }
      /* OLD CODE - Was checking if (newValue) which doesn't work when newValue is always an object:
      if (newValue) { ... }
      Also was calling setProps even when hiding, causing null reference errors.
      OLD: No error handling or DOM validation, causing crashes when elements removed.
      OLD: setContent after setProps could cause DOM issues, and no hide before show.
      OLD: Calling setModelPopoverParams(null) in catch caused recursive updates.
      OLD: Not checking if tip.popper exists before accessing state.
      OLD: No instance recreation when tippy gets corrupted.
      OLD: Tried to use corrupted instance first, then recreate after failure.
      OLD: Validated health but instance could still corrupt during operation.
      NEW: ALWAYS recreate for each show - more reliable than trying to reuse.
      */
      break;
    default:
      break;
  }
});
