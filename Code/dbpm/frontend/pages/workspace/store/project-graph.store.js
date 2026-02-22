import { createStore } from "../../../shared/utils/store.js";

export default Object.assign(
  createStore({
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
            id: `cy-${model.id}`,
            type: "model",
            label: model.name,
            degree: 1,
          },
        });
        edges.push({
          group: "edges",
          data: {
            source: `cy-${model.documentId}`,
            target: `cy-${model.id}`,
            relation: "generated",
          },
        });
      });
      this.state.elements = [...nodes, ...edges];
      this.notify({
        key: "elements",
        operation: "init",
        value: this.state.elements,
      });
    },
    getElements() {
      return this.state.elements;
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
  },
);
