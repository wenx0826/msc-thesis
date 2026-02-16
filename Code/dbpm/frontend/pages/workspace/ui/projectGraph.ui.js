import { workspaceStore, projectGraphStore } from "../store/index.js";
import { workspaceService } from "../services/index.js";

const theme = getThemeVars();
function getThemeVars() {
  const s = getComputedStyle(document.documentElement);
  return {
    activeColor: s.getPropertyValue("--wfadaptor-highlight").trim(),
  };
}

const cyLayoutOptions = {
  name: "cose",
  animate: false,
};

function getEntityId(node) {
  return node.id()?.replace("cy-", "") ?? null;
}

function getEntityType(node) {
  return node.data().type ?? null;
}
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
      selector: "node.active",
      style: {
        "background-color": theme.activeColor,
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
cy.on("tap", "node", (evt) => {
  const node = evt.target;
  const entityId = getEntityId(node);
  const entityType = getEntityType(node);
  switch (entityType) {
    case "document":
      workspaceService.activateDocumentById(entityId);
      break;
    case "model":
      workspaceService.toggleModelSelection(entityId);

      break;
    default:
      break;
  }
});

cy.on("mouseover", "node", (evt) => {
  cy.container().style.cursor = "pointer";
  const node = evt.target;
  const entityId = getEntityId(node);
  const entityType = getEntityType(node);
  switch (entityType) {
    case "document":
      node.addClass("hovered");
      break;
    case "model":
      // ✨ ENABLED: Show model popover on hover with source tracking
      workspaceStore.setModelPopoverParams(
        {
          modelId: entityId,
          anchor: {
            type: "point",
            point: {
              x: evt.originalEvent.clientX,
              y: evt.originalEvent.clientY,
            },
          },
        },
        "graph-node",
      ); // ✨ NEW: Pass source identifier to prevent conflicts
      break;
    default:
      break;
  }
});

/* OLD CODE - Popover was disabled:
    case "model":
      // workspaceStore.setModelPopoverParams({
      //   modelId: entityId,
      //   anchor: {
      //     type: "point",
      //     point: {
      //       x: evt.originalEvent.clientX,
      //       y: evt.originalEvent.clientY,
      //     },
      //   },
      // });
      break;
*/

cy.on("mouseout", "node", (evt) => {
  cy.container().style.cursor = "default";
  const node = evt.target;
  const entityType = getEntityType(node);
  switch (entityType) {
    case "document":
      node.removeClass("hovered"); // ✨ ADDED: Properly remove hover state
      break;
    case "model":
      // workspaceStore.setHoveredModelId(null); // OLD: Kept for compatibility
      // ✨ NEW: Request close with source tracking
      workspaceStore.requestCloseModelPopover("graph-node");
      // workspaceStore.requestCloseModelPopover();
      break;
    default:
      break;
  }
});

projectGraphStore.subscribe((state, { key, operation, value }) => {
  // if (operation) {
  //   const { value } = payload;
  switch (key) {
    case "elements":
      switch (operation) {
        case "init":
          cy.add(value);
          cy.layout({
            ...cyLayoutOptions,
          }).run();
          cy.elements().unselectify();
          break;
        default:
          break;
      }
      break;
    case "elements.documentNode":
      switch (operation) {
        case "add":
          const newNode = cy.add(value);
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
          const added = cy.add(value.modelNode);
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
    case "activeDocumentId":
      if (newValue) {
        cy.getElementById(`cy-${newValue}`).addClass("active");
      }
      if (oldValue) {
        cy.getElementById(`cy-${oldValue}`).removeClass("active");
      }
      break;
    case "activeModelId":
      if (newValue) {
        cy.getElementById(`cy-${newValue}`).addClass("active");
      }
      if (oldValue) {
        cy.getElementById(`cy-${oldValue}`).removeClass("active");
      }
      break;
    default:
      break;
  }
});

export default function init() {
  // cy.elements().remove();
  // cy.once("layoutstop", () => {
  //   cy.fit();
  //   cy.zoom(1);
  // });
  // ---------- Interaction ----------
  // Subscribe to store changes
}
