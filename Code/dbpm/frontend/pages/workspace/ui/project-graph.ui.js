import { createUI } from "../../../shared/utils/ui.js";
import { workspaceStore, projectGraphStore } from "../store/index.js";
import { workspaceService } from "../services/index.js";

const theme = (() => {
  const style = getComputedStyle(document.documentElement);
  const token = (name) => style.getPropertyValue(name).trim();
  return {
    textColor: token("--x-ui-text-color"),
    highlightColor: token("--wfadaptor-highlight"),
    modelTagBackground: token("--x-ui-content-light-background"),
    modelTagBorder: token("--x-ui-border-light-color"),
    modelTagText: token("--x-ui-text-secondary-color"),
    modelTagHoverBackground: token("--x-ui-content-hover-background"),
    modelTagHoverBorder: token("--x-ui-border-color"),
    modelTagHoverText: token("--x-ui-text-color"),
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
      autounselectify: true,
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
            color: theme.textColor,
            "text-events": "yes",
            "text-max-width": 120,
            "min-zoomed-font-size": 6,
          },
        },
        {
          selector: "node.is-current",
          style: {
            "background-color": theme.highlightColor,
          },
        },
        // ---------- Node types ----------
        {
          selector: 'node[type="document"]',
          style: {
            label: "data(label)",
            width: 20,
            height: 20,
            "text-valign": "bottom",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-opacity": 1,
            "font-size": 12,
            "min-zoomed-font-size": 12,
            // "text-background-opacity": 0,
          },
        },
        {
          selector: 'node[type="document"].hovered',
          style: {
            color: theme.modelTagHoverText,
            "text-background-opacity": 1,
            "text-background-color": theme.modelTagHoverBackground,
            "text-border-color": theme.modelTagHoverBorder,
          },
        },
        {
          selector: 'node[type="model"]',
          style: {
            label: "data(label)",
            width: 12,
            height: 12,
            color: theme.modelTagText,
            "font-size": 11,
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 4,
            "text-wrap": "ellipsis",
            "text-background-opacity": 1,
            "text-background-color": theme.modelTagBackground,
            // "text-background-shape": "round-rectangle",
            "text-background-padding": 1,
            "text-border-width": 0.5,
            "corner-radius": 2,
            "text-border-color": theme.modelTagBorder,
            "text-border-opacity": 1,
          },
        },
        {
          selector: 'node[type="model"].hovered',
          style: {
            color: theme.modelTagHoverText,
            "text-background-color": theme.modelTagHoverBackground,
            "text-border-color": theme.modelTagHoverBorder,
          },
        },
        {
          selector: 'node[type="model"].is-current',
          style: {
            color: "#ffffff",
            "text-background-color": theme.highlightColor,
            "text-border-width": 0,
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
          workspaceService.displayDocument(id);
          break;
        }
        case "model": {
          workspaceService.toggleModelDisplay(id);
          break;
        }
        default:
          break;
      }
    });

    cy.on("mouseover", "node", (e) => {
      cy.container().style.cursor = "pointer";
      const node = e.target;
      node.addClass("hovered");
      const nodeType = getNodeType(node);
      const nodeId = getNodeId(node);
      switch (nodeType) {
        case "document":
          node.addClass("hovered");
          break;
        case "model": {
          node.addClass("hovered");
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
      node.removeClass("hovered");
      const nodeType = getNodeType(node);
      switch (nodeType) {
        case "document":
          // node.removeClass("hovered");
          break;
        case "model":
          // node.removeClass("hovered");
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
              }
              break;
            case "add":
              cy.add(value);
              cy.layout({
                ...cyLayoutOptions,
              }).run();
              break;
            case "delete":
              (Array.isArray(value) ? value : [value]).forEach((element) => {
                const elementId = element?.data?.id;
                if (!elementId) {
                  return;
                }
                cy.remove(cy.getElementById(elementId));
              });
              cy.layout({
                ...cyLayoutOptions,
              }).run();
              break;
            default:
              break;
          }
          break;

        case "elements.documentNode":
          switch (operation) {
            case "add":
              // cy.add(value);
              // cy.layout({
              //   ...cyLayoutOptions,
              // }).run();
              break;
            default:
              break;
          }
          break;
        case "elements.modelNodeAndEdge":
          switch (operation) {
            case "add":
              // cy.add(value.modelNode);
              // cy.add(value.edge);
              // cy.layout({
              //   ...cyLayoutOptions,
              // }).run();
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
