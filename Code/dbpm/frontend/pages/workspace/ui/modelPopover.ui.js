import { modelsStore, workspaceStore } from "../store/index.js";

const $modelPopover = $("#modelPopover");
const $modelPopoverContainer = $("#modelPopoverContainer");
const hostEl = $modelPopover[0];
const tippy = window.tippy;

const tip = tippy(hostEl, {
  trigger: "manual",
  interactive: true, // ⭐ hover 到 popover 不消失
  appendTo: () => document.body,
  arrow: false,
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
        // options: {
        //   fallbackPlacements: ["right", "left", "bottom", "top"],
        // },
      },
      { name: "preventOverflow", options: { padding: 8 } },
    ],
  },
});

tip.popper.addEventListener("mouseenter", () => {
  workspaceStore.cancelCloseModelPopover();
});
tip.popper.addEventListener("mouseleave", () => {
  workspaceStore.requestCloseModelPopover();
});

workspaceStore.subscribe((state, { key, newValue }) => {
  if (key === "modelPopoverState") {
    if (newValue) {
      const modelId = newValue.modelId;
      const modelName = modelsStore.getModelNameById(modelId);
      const modelGraph = $(modelsStore.getModelGraphById(modelId)).clone();
      const anchor = newValue.anchor;
      tip.setProps({
        getReferenceClientRect:
          anchor.type === "element"
            ? () => anchor.element.getBoundingClientRect()
            : () => ({
                width: 0,
                height: 0,
                top: anchor.point.y,
                bottom: anchor.point.y,
                left: anchor.point.x,
                right: anchor.point.x,
              }),
      });
      tip.show();
      tip.setContent(modelGraph[0]);
    } else {
      console.log("Hiding model popover");
      tip.hide();
    }
  }
});
