import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore, projectGraphStore } from "../store/index.js";
import { workspaceService } from "../services/index.js";

const theme = (() => {
  const style = getComputedStyle(document.documentElement);
  return {
    currentColor: style.getPropertyValue("--wfadaptor-highlight").trim(),
  };
})();
const cyLayoutOptions = {
  name: "cose",
  animate: false,
};

function getNodeType(node) {
  return node.data("type") ?? null;
}
function getNodeId(node) {
  return node.data("id") ?? null;
}
function setNodeCurrent(cy, nodeId, isCurrent) {
  const node = cy.getElementById(nodeId);
  node.toggleClass("is-current", isCurrent);
}

createUI({
  setup: () => {
    const cy = cytoscape({
      container: document.getElementById("cy"),
      pixelRatio: window.devicePixelRatio || 1,
      layout: cyLayoutOptions,
      zoom: 1,
      minZoom: 0.3,
      maxZoom: 10,
      style: [
        // ---------- Base node ----------
        {
          selector: "node",
          style: {
            // label: "data(label)",
            // "text-valign": "center",
            // "text-halign": "center",
            // "font-size": 12,
            color: "#000000",
            "text-events": "yes",
            "min-zoomed-font-size": 6,
          },
        },
        {
          selector: "node.is-current",
          style: {
            "background-color": theme.currentColor,
          },
        },
        // ---------- Node types ----------
        {
          selector: 'node[type="document"]',
          style: {
            width: 20,
            height: 20,
            "text-valign": "bottom",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": 80,
          },
        },
        // hover：显示 tag
        {
          selector: 'node[type="document"].hovered',
          style: {
            label: "data(label)",
            "text-opacity": 1,
            "text-background-opacity": 1,
            "text-background-color": "lightGrey",
            "text-background-shape": "roundrectangle",
            "text-background-padding": 3,
            "font-size": 12,
            "min-zoomed-font-size": 12,
          },
        },
        {
          selector: 'node[type="model"]',
          style: {
            width: 12,
            height: 12,
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 2,
            "text-background-opacity": 1,
            "text-background-color": "lightGrey",
            "text-background-shape": "roundrectangle",
          },
        },
        // ---------- Edges ----------
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#bbb",
            "target-arrow-color": "#bbb",
            "curve-style": "bezier",
            "font-size": 9,
            "text-rotation": "autorotate",
          },
        },
      ],
    });
    return { cy };
  },
  bindListeners: ({ cy }) => {
    cy.on("tap", "node", (e) => {
      const node = e.target;
      const nodeType = getNodeType(node);
      const id = getNodeId(node);
      switch (nodeType) {
        case "document": {
          workspaceService.displayDocument({ id });
          break;
        }
        case "model": {
          workspaceService.toggleModelDisplay({ id });
          break;
        }
        default:
          break;
      }
    });

    cy.on("mouseover", "node", (e) => {
      cy.container().style.cursor = "pointer";
      const node = e.target;
      const nodeType = getNodeType(node);
      switch (nodeType) {
        case "document":
          node.addClass("hovered");
          break;
        case "model": {
          const modelId = node.data("modelId");
          if (!modelId) {
            return;
          }
          // workspaceService.showModelPopover({
          //   modelId,

          //   anchor: {
          //     type: "point",
          //     point: {
          //       x: evt.originalEvent.clientX,
          //       y: evt.originalEvent.clientY,
          //     },
          //   },

          //   source: "graph-node",
          // });
          // break;
        }
        default:
          break;
      }
    });

    cy.on("mouseout", "node", (evt) => {
      cy.container().style.cursor = "default";
      const node = evt.target;
      const nodeType = getNodeType(node);
      switch (nodeType) {
        case "document":
          node.removeClass("hovered"); // ✨ ADDED: Properly remove hover state
          break;
        case "model":
          // workspaceStore.setHoveredModelId(null);
          workspaceStore.requestCloseModelPopover("graph-node");
          // workspaceStore.requestCloseModelPopover();
          break;
        default:
          break;
      }
    });
  },
  subscribeStores: ({ cy }) => {
    projectGraphStore.subscribe((state, { key, operation, value }) => {
      switch (key) {
        case "elements":
          switch (operation) {
            case "init":
              if (value.length) {
                cy.add(value);
                cy.layout({
                  ...cyLayoutOptions,
                }).run();
                cy.elements().unselectify();
              }
              break;
            default:
              break;
          }
          break;
        case "elements.documentNode":
          switch (operation) {
            case "add":
              cy.add(value);
              cy.layout({
                ...cyLayoutOptions,
              }).run();
              break;
            default:
              break;
          }
          break;
        case "elements.modelNodeAndEdge":
          switch (operation) {
            case "add":
              cy.add(value.modelNode);
              cy.add(value.edge);
              cy.layout({
                ...cyLayoutOptions,
              }).run();
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    });

    workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
      switch (key) {
        case "viewedDocument":
        case "editingModel":
          const oldId = oldValue?.id;
          const newId = newValue?.id;
          if (oldId) {
            setNodeCurrent(cy, oldId, false);
          }
          if (newId) {
            setNodeCurrent(cy, newId, true);
          }
          break;
        default:
          break;
      }
    });
  },
});
