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

export function initProjectGraphUI() {
  const cy = cytoscape({
    container: document.getElementById("cy"),
    pixelRatio: window.devicePixelRatio || 1,
    elements: projectGraphStore.getElements(),
    layout: cyLayoutOptions,
    zoom: 1,
    minZoom: 1,
    maxZoom: 10,
    style: [
      // ---------- Base node ----------
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": 12,
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
  cy.elements().unselectify();
  // cy.once("layoutstop", () => {
  //   cy.fit();
  //   cy.zoom(1);
  // });
  // ---------- Interaction ----------
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
        // workspaceService.activateDocumentById(entityId);
        break;
      case "model":
        workspaceStore.setModelPopoverParams({
          modelId: entityId,
          anchor: {
            type: "point",
            point: {
              x: evt.originalEvent.clientX,
              y: evt.originalEvent.clientY,
            },
          },
        });
        break;
      default:
        break;
    }
  });

  cy.on("mouseout", "node", (evt) => {
    cy.container().style.cursor = "default";
    const node = evt.target;
    const entityType = getEntityType(node);
    switch (entityType) {
      case "document":
        // workspaceService.activateDocumentById(entityId);
        break;
      case "model":
        workspaceStore.setHoveredModelId(null);
        workspaceStore.requestCloseModelPopover();
        break;
      default:
        break;
    }
  });

  // Subscribe to store changes
  projectGraphStore.subscribe((state, { key, operation, ...payload }) => {
    if (operation) {
      const { value } = payload;
      switch (key) {
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
    } else {
      const { oldValue, newValue } = payload;
      switch (key) {
        case "elements":
          //   console.log(
          //     "Updating cytoscape elements...",
          //     cy,
          //     projectGraphStore.getElements(),
          //   );
          //   cy.elements().remove();
          //   cy.add(projectGraphStore.getElements());
          //   cy.layout({ name: "cose", animate: true }).run();
          //   cy.elements().unselectify();
          break;
        default:
          break;
      }
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
}
