import { workspaceStore, projectGraphStore } from "../store/index.js";
import { workspaceService } from "../services/index.js";

const cyLayoutOptions = {
  name: "cose",
  animate: false,
};

function getThemeVars() {
  const s = getComputedStyle(document.documentElement);
  return {
    activeColor: s.getPropertyValue("--wfadaptor-highlight").trim(),
  };
}

export function initProjectGraphUI() {
  const theme = getThemeVars();
  const cy = cytoscape({
    container: document.getElementById("cy"),
    elements: projectGraphStore.getElements(),
    layout: cyLayoutOptions,
    zoom: 1,
    minZoom: 0.3,
    maxZoom: 10,
    style: [
      // ---------- Base node ----------
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": 8,
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
          width: 18,
          height: 18,
          "text-valign": "bottom",
          "text-halign": "center",
          "text-wrap": "wrap",
          "text-max-width": 40,
        },
      },
      {
        selector: 'node[type="model"]',
        style: {
          width: 10,
          height: 10,
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
  cy.once("layoutstop", () => {
    cy.fit();
    cy.zoom(1);
  });
  // ---------- Interaction ----------
  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    console.log("Clicked:", node.id(), node.data());
    const nodeId = node.id().replace("cy-", "");
    switch (node.data().type) {
      case "document":
        workspaceService.activateDocumentById(nodeId);
        break;
      case "model":
        workspaceService.toggleModelSelection(nodeId);
        break;
      default:
        break;
    }
  });

  cy.on("mouseover", "node", () => {
    cy.container().style.cursor = "pointer";
  });

  cy.on("mouseout", "node", () => {
    cy.container().style.cursor = "default";
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
