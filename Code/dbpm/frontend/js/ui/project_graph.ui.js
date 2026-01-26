let cy;

$(document).ready(() => {
  console.log("Initializing project graph UI...");
  console.log(Store.projectGraph.getElements());
  cy = cytoscape({
    container: document.getElementById("cy"),

    elements: Store.projectGraph.getElements(),

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
          width: "mapData(degree, 1, 5, 30, 60)",
          height: "mapData(degree, 1, 5, 30, 60)",
        },
      },

      // ---------- Node types ----------
      {
        selector: 'node[type="document"]',
        style: { "background-color": "#43a047" },
      },
      {
        selector: 'node[type="model"]',
        style: { "background-color": "#8e24aa" },
      },

      // ---------- Edges ----------
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#bbb",
          "target-arrow-color": "#bbb",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          label: "data(relation)",
          "font-size": 9,
          "text-rotation": "autorotate",
        },
      },

      {
        selector: 'edge[relation="derived"]',
        style: {
          "line-style": "dashed",
          "line-color": "#666",
          "target-arrow-color": "#666",
        },
      },
    ],

    layout: {
      name: "cose",
      animate: true,
    },
  });

  // ---------- Interaction ----------
  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    console.log("Clicked:", node.id(), node.data());
  });
});

Store.projectGraph.subscribe(
  (state, { key, operation, oldValue, newValue }) => {
    if (operation) {
      console.log("Re-initializing cytoscape graph...");
      // cy.elements().remove();
      // cy.add(Store.projectGraph.getElements());
      // cy.layout({ name: "cose", animate: true }).run();
    } else {
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
  },
);

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
    default:
      break;
  }
});
