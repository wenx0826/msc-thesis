// Project Graph Store - Cytoscape graph state
import { createDomainStore } from "./createStore.js";

export const projectGraphStore = Object.assign(
  createDomainStore({
    elements: [],
  }),
  {
    init(documents, models) {
      const nodes = documents.map((doc) => ({
        group: "nodes",
        data: {
          id: `cy-${doc.id}`,
          type: "document",
          label: doc.name,
          degree: 1,
        },
      }));
      let edges = [];
      models.forEach((model) => {
        nodes.push({
          group: "nodes",
          data: {
            id: `cy-${model.meta.id}`,
            type: "model",
            label: model.meta.name,
            degree: 1,
          },
        });
        edges.push({
          group: "edges",
          data: {
            source: `cy-${model.documentId}`,
            target: `cy-${model.meta.id}`,
            relation: "generated",
          },
        });
      });
      this.state.elements = [...nodes, ...edges];
      console.log("Initialized project graph elements:", this.state.elements);
      this.notify({ key: "elements", newValue: this.state.elements });
    },
    addDocumentNode(document) {
      const node = {
        data: {
          id: `cy-${document.id}`,
          type: "document",
          label: document.name,
          degree: 1,
        },
      };
      this.state.elements.push(node);
      this.notify({
        key: "elements.documentNode",
        operation: "add",
        value: node,
      });
    },
    addModelNodeAndEdge(modelMeta, documentId) {
      const modelNode = {
        data: {
          group: "nodes",
          id: `model-${modelMeta.id}`,
          type: "model",
          label: modelMeta.name,
          degree: 1,
        },
      };
      const edge = {
        group: "edges",
        data: {
          source: `cy-${documentId}`,
          target: `cy-${modelMeta.id}`,
          relation: "generated",
        },
      };
      this.state.elements.push(modelNode, edge);
      this.notify({
        key: "elements.modelNodeAndEdge",
        operation: "add",
        value: { modelNode, edge },
      });
    },
    getElements() {
      return this.state.elements;
    },
    setGraph({ nodes, edges }) {
      this.state.nodes = nodes;
      this.state.edges = edges;
      this.notify({ key: "graph", newValue: { nodes, edges } });
    },
    getNodes() {
      return this.state.nodes;
    },
    getEdges() {
      return this.state.edges;
    },
  },
);
