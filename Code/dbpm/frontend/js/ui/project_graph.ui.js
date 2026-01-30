let cy;
const cyLayoutOptions = {
  name: "cose",
  animate: true,
};
$(document).ready(() => {
  cy = cytoscape({
    container: document.getElementById("cy"),
    minZoom: 0.3,
    maxZoom: 3,
    elements: [],
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
          // width: "mapData(degree, 1, 5, 30, 60)",
          // height: "mapData(degree, 1, 5, 30, 60)",
        },
      },
      {
        selector: "node:hover",
        style: {},
      },
      // ---------- Node types ----------
      {
        selector: 'node[type="document"]',
        style: {
          width: 18,
          height: 18,
          // "background-color": "#43a047",
          "text-valign": "bottom",
          "text-halign": "center",
          "text-wrap": "wrap",
          "text-max-width": 40,

          // "border-color": "#000",
          // "border-width": 1,
          // "border-opacity": 1,
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
          // "background-color": "#8e24aa",
          "text-background-opacity": 1,
          "text-background-color": "lightGrey",
          "text-background-shape": "roundrectangle",

          // "text-border-color": "#000",
          // "text-border-width": 1,
          // "text-border-opacity": 1,
        },
      },
      {
        selector: "node.active",
        style: {
          "background-color": "blue",
        },
      },
      // ---------- Edges ----------
      {
        selector: "edge",
        style: {
          width: 1,
          "line-color": "#bbb",
          "target-arrow-color": "#bbb",
          // "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          // label: "data(relation)",
          "font-size": 9,
          "text-rotation": "autorotate",
        },
      },

      // {
      //   selector: 'edge[relation="derived"]',
      //   style: {
      //     "line-style": "dashed",
      //     "line-color": "#666",
      //     "target-arrow-color": "#666",
      //   },
      // },
    ],

    layout: cyLayoutOptions,
  });

  // ---------- Interaction ----------
  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    // node.unselectify();
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
  // cy.on("grab", "node", (e) => console.log("grab", e.target.id()));
  // cy.on("drag", "node", (e) => console.log("drag", e.target.id()));
  // cy.on("free", "node", (e) => console.log("free", e.target.id()));
  // cy.on("mouseover", "node", (e) => console.log("hover", e.target.id()));
});

Store.projectGraph.subscribe((state, { key, operation, ...payload }) => {
  if (operation) {
    const { value } = payload;
    switch (key) {
      case "elements.documentNode":
        switch (operation) {
          case "add":
            const newNode = cy.add(value);
            cy.layout({
              ...cyLayoutOptions,
              // eles: newNode.closedNeighborhood(),
            }).run();
            break;
          default:
            break;
        }
        break;
      case "elements.modelNodeAndEdge":
        switch (operation) {
          case "add":
            // cy.batch(() => {§
            const added = cy.add(value.modelNode);
            cy.add(value.edge);
            // });

            // cy.layout({
            //   ...cyLayoutOptions,
            //   eles: cy.collection().add(newNode).add(newNode.connectedEdges()),
            // }).run();
            // const newNode = added.first();
            // console.log("newNode in cy:", newNode.inside());
            // console.log("connectedEdges:", newNode.connectedEdges().length);
            // console.log("New node added to cytoscape:!!!", newNode);
            cy.layout({
              ...cyLayoutOptions,
              // eles: newNode.closedNeighborhood(),
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
        console.log("Updating cytoscape elements...");
        cy.elements().remove();
        cy.add(Store.projectGraph.getElements());
        cy.layout({ name: "cose", animate: true }).run();
        cy.elements().unselectify();
        break;
      default:
        break;
    }
  }
});

// Store.workspace.subscribe((state, { key, oldValue, newValue }) => {
//   console.log("???Workspace store changed:", key, oldValue, newValue);
//   switch (key) {
//     case "activeModelId":
//       if (newValue) {
//         cy.getElementById(newValue).select();
//       }
//       if (oldValue) {
//         cy.getElementById(oldValue).unselect();
//       }
//       break;
//     case "activeDocumentId":
//       if (newValue) {
//         console.log("±±±±±±±Selecting document node in cy:", newValue);
//         cy.getElementById(newValue).select();
//       }
//       if (oldValue) {
//         cy.getElementById(oldValue).unselect();
//       }
//       // Handle active document change if needed
//       break;
//     default:
//       break;
//   }
// });
workspaceStore.subscribe(async (state, { key, oldValue, newValue }) => {
  switch (key) {
    case "activeDocumentId":
      if (newValue) {
        cy.getElementById(`cy-${newValue}`).addClass("active");
      }
      if (oldValue) {
        cy.getElementById(`cy-${oldValue}`).removeClass("active");
      }
      // Handle active document change if needed
      break;
    case "activeModelId":
      if (newValue) {
        cy.getElementById(`cy-${newValue}`).addClass("active");
      }
      if (oldValue) {
        cy.getElementById(`cy-${oldValue}`).removeClass("active");
      }
      break;
      break;
    default:
      break;
  }
});
