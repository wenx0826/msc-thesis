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
}

export default new ProjectGraphStore();
