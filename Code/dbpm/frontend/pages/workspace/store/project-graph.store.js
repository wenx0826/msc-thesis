import { createStore } from "../../../shared/utils/store.js";

function toCyNodeId(rawId) {
  if (typeof rawId !== "string") {
    return null;
  }

  const trimmedId = rawId.trim();
  if (!trimmedId) {
    return null;
  }

  return `cy-${trimmedId}`;
}

function isNodeElement(element) {
  const data = element?.data;
  return Boolean(data?.id) && !data?.source && !data?.target;
}

export default Object.assign(
  createStore({
    elements: [],
  }),
  {
    init(documents, models) {
      const nodes = [];
      const documentNodeIds = new Set();

      documents.forEach((doc) => {
        const nodeId = toCyNodeId(doc?.id);
        if (!nodeId) {
          console.warn(
            "[projectGraphStore] Skipping document node with invalid id:",
            doc,
          );
          return;
        }

        documentNodeIds.add(nodeId);
        nodes.push({
          group: "nodes",
          data: {
            id: nodeId,
            type: "document",
            label: doc?.name,
            degree: 1,
          },
        });
      });

      let edges = [];
      models.forEach((model) => {
        const modelNodeId = toCyNodeId(model?.id);
        if (!modelNodeId) {
          console.warn(
            "[projectGraphStore] Skipping model node with invalid id:",
            model,
          );
          return;
        }

        nodes.push({
          group: "nodes",
          data: {
            id: modelNodeId,
            type: "model",
            label: model?.name,
            degree: 1,
          },
        });

        const sourceNodeId = toCyNodeId(model?.documentId);
        if (!sourceNodeId || !documentNodeIds.has(sourceNodeId)) {
          console.warn(
            `[projectGraphStore] Skipping edge for model "${model?.id}" with missing or unknown documentId:`,
            model?.documentId,
          );
          return;
        }

        edges.push({
          group: "edges",
          data: {
            source: sourceNodeId,
            target: modelNodeId,
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
      const nodeId = toCyNodeId(document?.id);
      if (!nodeId) {
        console.warn(
          "[projectGraphStore] Skipping document node with invalid id:",
          document,
        );
        return;
      }

      const node = {
        group: "nodes",
        data: {
          id: nodeId,
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
      const modelNodeId = toCyNodeId(modelMeta?.id);
      if (!modelNodeId) {
        console.warn(
          "[projectGraphStore] Skipping model node with invalid id:",
          modelMeta,
        );
        return;
      }

      const modelNode = {
        group: "nodes",
        data: {
          id: modelNodeId,
          type: "model",
          label: modelMeta.name,
          degree: 1,
        },
      };

      const sourceNodeId = toCyNodeId(documentId);
      const hasSourceNode = this.state.elements.some(
        (element) =>
          isNodeElement(element) && element?.data?.id === sourceNodeId,
      );

      let edge = null;
      if (sourceNodeId && hasSourceNode) {
        edge = {
          group: "edges",
          data: {
            source: sourceNodeId,
            target: modelNodeId,
            relation: "generated",
          },
        };
      } else {
        console.warn(
          `[projectGraphStore] Skipping edge for model "${modelMeta?.id}" with missing or unknown documentId:`,
          documentId,
        );
      }

      this.state.elements.push(modelNode);
      if (edge) {
        this.state.elements.push(edge);
      }

      this.notify({
        key: "elements.modelNodeAndEdge",
        operation: "add",
        value: { modelNode, edge },
      });
    },
  },
);
