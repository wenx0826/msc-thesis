import { modelsStore, workspaceStore } from "../store/index.js";

const $modelPopover = $("#modelPopover");
const $modelPopoverContainer = $("#modelPopoverContainer");
const hostEl = $modelPopover[0];
const tippy = window.tippy;

export function initModelPopoverUI() {
  const tip = tippy(hostEl, {
    trigger: "manual",
    interactive: true, // ⭐ hover 到 popover 不消失
    appendTo: () => document.body,
    placement: "auto", // ⭐ 不指定方向（自动选择最合适）
    hideOnClick: false,
    interactiveBorder: 12,
    delay: [0, 0],
    content: "",
    popperOptions: {
      modifiers: [
        { name: "offset", options: { offset: [0, 8] } },
        {
          name: "flip",
          options: {
            fallbackPlacements: ["right", "left", "bottom", "top"],
          },
        },
        { name: "preventOverflow", options: { padding: 8 } },
      ],
    },
  });
  let overPop = false;
  let hideTimer = null;
  function cancelHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
  }

  function scheduleHide() {
    cancelHide();
    hideTimer = setTimeout(() => {
      // 注意：是否真正 close 由 store 决定，这里只是请求 close
      if (!overPop) workspaceStore.setHoveredModelId(null);
    }, 120);
  }

  tip.popper.addEventListener("mouseenter", () => {
    overPop = true;
    cancelHide();
  });
  tip.popper.addEventListener("mouseleave", () => {
    overPop = false;
    scheduleHide();
  });

  // Listen for changes to active model and hovered model in workspace store
  workspaceStore.subscribe((state, { key, newValue }) => {
    if (key === "hoveredModelId") {
      if (newValue) {
        const modelName = modelsStore.getModelNameById(newValue);
        const modelGraph = modelsStore.getModelGraphById(newValue);
        console.log(
          "!!!!Updating model popover for hovered model:",
          newValue,
          modelName,
        );
        // const modelGraph = modelsStore.getModelGraphById(newValue);
        // $modelPopoverTitle.text(modelName || "Model Details");
        // $modelPopoverContainer.html(modelGraph || "Model Details");
        // $modelPopover.show();
        tip.setProps({
          getReferenceClientRect: () => ({
            top: 200,
            left: 200,
            right: 200,
            bottom: 200,
            width: 0,
            height: 0,
          }),
        });
        tip.show();
        // tip.setContent(
        //   `<div class="popover-title">${modelName || "Model Details"}</div><div class="popover-content">${
        //     modelGraph || "Model Details"
        //   }</div>`,
        // );
        tip.setContent(modelGraph);
      } else {
        tip.hide();
      }
    }
  });

  // Optional: Add hover listeners to model tags to set hoveredModelId in workspace store
}
