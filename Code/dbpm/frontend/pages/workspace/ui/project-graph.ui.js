import { createUI } from "../../../shared/utils/ui.js";
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

const DOCUMENT_NODE_NAMESPACE = "document";
const MODEL_NODE_NAMESPACE = "model";

function toCyNodeId(rawId, namespace) {
  if (typeof rawId !== "string") {
    return null;
  }
  if (typeof namespace !== "string" || namespace.trim() === "") {
    return null;
  }

  const trimmedId = rawId.trim();
  if (!trimmedId) {
    return null;
  }

  return `cy-${namespace.trim()}-${trimmedId}`;
}

function getEntityType(node) {
  return node.data("type") ?? null;
}

function getDocumentRef(node) {
  return {
    id: node.data("documentId") ?? null,
    versionId: node.data("versionId") ?? null,
  };
}

function getModelRef(node) {
  return {
    id: node.data("modelId") ?? null,
    versionId: node.data("versionId") ?? null,
  };
}

function toggleActiveNodeByVersionId(cy, versionId, namespace, isActive) {
  const nodeId = toCyNodeId(versionId, namespace);
  if (!nodeId) {
    return;
  }
  const node = cy.getElementById(nodeId);
  if (!node || node.length === 0) {
    return;
  }

  if (isActive) {
    node.addClass("active");
    return;
  }
  node.removeClass("active");
}

function safeCyAdd(cy, value, context) {
  if (!value) {
    return null;
  }

  try {
    return cy.add(value);
  } catch (error) {
    console.error(`[project-graph.ui] Failed to add ${context}:`, error, value);
    return null;
  }
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
    return { cy };
  },
  bindListeners: ({ cy }) => {
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const entityType = getEntityType(node);
      switch (entityType) {
        case "document": {
          const documentRef = getDocumentRef(node);
          if (!documentRef.id) {
            return;
          }
          workspaceService.displayDocument(documentRef);
          break;
        }
        case "model": {
          const modelRef = getModelRef(node);
          if (!modelRef.id) {
            return;
          }
          workspaceService.toggleModelDisplay(modelRef);

          break;
        }
        default:
          break;
      }
    });

    cy.on("mouseover", "node", (evt) => {
      cy.container().style.cursor = "pointer";
      const node = evt.target;
      const entityType = getEntityType(node);
      switch (entityType) {
        case "document":
          node.addClass("hovered");
          break;
        case "model": {
          const modelId = node.data("modelId");
          if (!modelId) {
            return;
          }
          // ✨ ENABLED: Show model popover on hover with source tracking
          workspaceStore.setModelPopoverParams(
            {
              modelId,
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
        }
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
  },
  subscribeStores: ({ cy }) => {
    projectGraphStore.subscribe((state, { key, operation, value }) => {
      // if (operation) {
      //   const { value } = payload;
      switch (key) {
        case "elements":
          switch (operation) {
            case "init":
              if (Array.isArray(value)) {
                const nodes = value.filter(
                  (element) => !element?.data?.source && !element?.data?.target,
                );
                const edges = value.filter(
                  (element) => element?.data?.source && element?.data?.target,
                );

                safeCyAdd(cy, nodes, "initial nodes");
                edges.forEach((edge) => {
                  safeCyAdd(
                    cy,
                    edge,
                    `edge "${edge?.data?.source}" -> "${edge?.data?.target}"`,
                  );
                });
              } else {
                safeCyAdd(cy, value, "initial elements");
              }

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
              safeCyAdd(cy, value, "document node");
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
              safeCyAdd(cy, value.modelNode, "model node");
              safeCyAdd(cy, value.edge, "model edge");
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
        case "displayedDocument":
          toggleActiveNodeByVersionId(
            cy,
            newValue?.versionId,
            DOCUMENT_NODE_NAMESPACE,
            true,
          );
          toggleActiveNodeByVersionId(
            cy,
            oldValue?.versionId,
            DOCUMENT_NODE_NAMESPACE,
            false,
          );
          break;
        case "displayedModel":
          toggleActiveNodeByVersionId(
            cy,
            newValue?.versionId,
            MODEL_NODE_NAMESPACE,
            true,
          );
          toggleActiveNodeByVersionId(
            cy,
            oldValue?.versionId,
            MODEL_NODE_NAMESPACE,
            false,
          );
          break;
        default:
          break;
      }
    });
  },
});
