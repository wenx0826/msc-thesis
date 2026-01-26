let cy;
const cyLayoutOptions = {
  name: "cose",
  animate: true,
};
$(document).ready(() => {
  console.log("Initializing project graph UI...");
  console.log(Store.projectGraph.getElements());
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
          // width: "mapData(degree, 1, 5, 30, 60)",
          // height: "mapData(degree, 1, 5, 30, 60)",
        },
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
          color: "#000",
          "text-background-color": "lightGrey",
          "text-background-shape": "roundrectangle",
          // "text-border-color": "#000",
          // "text-border-width": 1,
          // "text-border-opacity": 1,
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
  // cy.on("tap", "node", (evt) => {
  //   const node = evt.target;
  //   console.log("Clicked:", node.id(), node.data());
  // });
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
        break;
      default:
        break;
    }
  }
});

workspaceStore.subscribe((state, { key, oldValue, newValue }) => {
  switch (key) {
    case "activeModelId":
      if (newValue) {
        console.log("Active model ID changed in project graph UI:", newValue);
        // highlightActiveModelContainer(newValue);
      }
      if (oldValue) {
        // unhighlightActiveModelContainer(oldValue);
      }
      break;
    case "activeDocumentId":
      if (newValue) {
        console.log(
          "Active document ID changed in project graph UI:",
          newValue,
        );
      }
      // Handle active document change if needed
      break;
    default:
      break;
  }
});
