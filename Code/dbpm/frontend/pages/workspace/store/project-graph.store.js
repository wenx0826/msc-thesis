import { Store } from "../../../shared/utils/store.js";

function toCyDocumentNode({ id, name }) {
  return {
    group: "nodes",
    data: {
      id,
      type: "document",
      label: name,
      degree: 1,
    },
  };
}

function toCyModelNode({ id, name }) {
  return {
    group: "nodes",
    data: {
      id,
      type: "model",
      label: name,
      degree: 1,
    },
  };
}

function toCyEdge(source, target, relation) {
  return {
    group: "edges",
    data: {
      id: `${relation}_${source || "unknown"}_${target || "unknown"}`,
      source,
      target,
      relation,
    },
  };
}

class ProjectGraphStore extends Store {
  constructor() {
    super({
      elements: [],
    });
  }

  init(documentsMeta, modelsMeta) {
    const nodes = [];
    const edges = [];

    documentsMeta.forEach((docMeta) => nodes.push(toCyDocumentNode(docMeta)));
    modelsMeta.forEach((modelMeta) => {
      nodes.push(toCyModelNode(modelMeta));
      edges.push(toCyEdge(modelMeta.documentId, modelMeta.id, "generated"));
    });
    this.state.elements = [...nodes, ...edges];
    this.notify({
      key: "elements",
      operation: "init",
      value: this.state.elements,
    });
  }

  getElements() {
    return this.state.elements;
  }

  addDocumentNode(docMeta) {
    const node = toCyDocumentNode(docMeta);
    this.state.elements.push(node);
    this.notify({
      key: "elements",
      operation: "add",
      value: node,
    });
  }

  addModelNodeAndEdge(modelMeta) {
    const { id: modelId, name, documentId } = modelMeta;
    const modelNode = toCyModelNode({ id: modelId, name });
    const edge = toCyEdge(documentId, modelId, "generated");

    this.state.elements.push(modelNode);
    this.state.elements.push(edge);

    this.notify({
      key: "elements",
      operation: "add",
      value: [modelNode, edge],
    });
  }

  removeModelNodeAndEdge(modelId) {
    if (!modelId) {
      return [];
    }

    const removed = this.state.elements.filter((element) => {
      const data = element?.data || {};
      if (element.group === "nodes") {
        return data.type === "model" && data.id === modelId;
      }
      if (element.group === "edges") {
        return data.target === modelId;
      }
      return false;
    });

    if (removed.length === 0) {
      return [];
    }

    this.state.elements = this.state.elements.filter(
      (element) => !removed.includes(element),
    );
    this.notify({
      key: "elements",
      operation: "delete",
      value: removed,
    });
    return removed;
  }

  removeDocumentNodeAndEdges(documentId) {
    if (!documentId) {
      return [];
    }

    const removed = this.state.elements.filter((element) => {
      const data = element?.data || {};
      if (element.group === "nodes") {
        return data.type === "document" && data.id === documentId;
      }
      if (element.group === "edges") {
        return data.source === documentId || data.target === documentId;
      }
      return false;
    });

    if (removed.length === 0) {
      return [];
    }

    this.state.elements = this.state.elements.filter(
      (element) => !removed.includes(element),
    );
    this.notify({
      key: "elements",
      operation: "delete",
      value: removed,
    });
    return removed;
  }
}

export default new ProjectGraphStore();
