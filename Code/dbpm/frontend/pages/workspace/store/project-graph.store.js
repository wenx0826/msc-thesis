import { Store } from "../../../shared/utils/store.js";

const DOCUMENT_NODE_NAMESPACE = "document";
const MODEL_NODE_NAMESPACE = "model";

function toCyNodeId(rawId, namespace) {
  if (typeof rawId !== "string" && typeof rawId !== "number") {
    return null;
  }
  if (typeof namespace !== "string" || namespace.trim() === "") {
    return null;
  }

  const trimmedId = String(rawId).trim();
  if (!trimmedId) {
    return null;
  }

  return `cy-${namespace.trim()}-${trimmedId}`;
}

function isNodeElement(element) {
  const data = element?.data;
  return Boolean(data?.id) && !data?.source && !data?.target;
}

function getLatestModelVersionId(modelMeta) {
  if (
    typeof modelMeta?.latestVersionId === "string" ||
    typeof modelMeta?.latestVersionId === "number"
  ) {
    const latestVersionId = String(modelMeta.latestVersionId).trim();
    return latestVersionId || null;
  }
  if (!Array.isArray(modelMeta?.versions) || modelMeta.versions.length === 0) {
    return null;
  }
  const latestVersionId = modelMeta.versions.at(-1)?.id;
  if (
    typeof latestVersionId === "string" ||
    typeof latestVersionId === "number"
  ) {
    const normalizedVersionId = String(latestVersionId).trim();
    return normalizedVersionId || null;
  }
  return null;
}

function getDocumentNodeId(documentId) {
  return toCyNodeId(documentId, DOCUMENT_NODE_NAMESPACE);
}

function getModelNodeId(modelId) {
  return toCyNodeId(modelId, MODEL_NODE_NAMESPACE);
}

function getEntityLabel(entity, fallbackLabel) {
  return entity?.name || entity?.id || fallbackLabel;
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

    documentsMeta.forEach(({ id, name }) => {
      nodes.push({
        group: "nodes",
        data: {
          id,
          type: "document",
          label: name,
          degree: 1,
        },
      });
    });

    modelsMeta.forEach(({ id: modelId, name, documentId }) => {
      nodes.push({
        group: "nodes",
        data: {
          id: modelId,
          type: "model",
          label: name,
          degree: 1,
        },
      });
      edges.push({
        group: "edges",
        data: {
          source: documentId,
          target: modelId,
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
  }

  getElements() {
    return this.state.elements;
  }

  addDocumentNode({ id, name }) {
    const documentId = documentMeta?.id;
    const nodeId = getDocumentNodeId(documentId);
    const node = {
      group: "nodes",
      data: {
        id,
        type: "document",
        label: name,
        degree: 1,
      },
    };
    this.state.elements.push(node);
    this.notify({
      key: "elements.documentNode",
      operation: "add",
      value: node,
    });
  }

  addModelNodeAndEdge({ id, name, documentId }) {
    const modelId = modelMeta.id;

    const modelNode = {
      group: "nodes",
      data: {
        id: id,
        type: "model",
        label: name,
        degree: 1,
        documentId: documentId,
      },
    };

    const sourceDocumentId = modelMeta?.documentId || documentId || null;
    const sourceNodeId = getDocumentNodeId(sourceDocumentId);
    const hasSourceNode = this.state.elements.some(
      (element) => isNodeElement(element) && element?.data?.id === sourceNodeId,
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
        `[projectGraphStore] Skipping edge for model "${modelId}" with missing or unknown document reference:`,
        {
          documentId: sourceDocumentId,
        },
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
  }
}

export default new ProjectGraphStore();
