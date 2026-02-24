import { Store } from "../../../shared/utils/store.js";

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

function isNodeElement(element) {
  const data = element?.data;
  return Boolean(data?.id) && !data?.source && !data?.target;
}

function getLatestDocumentVersionId(documentMeta) {
  if (typeof documentMeta?.latestVersionId === "string") {
    return documentMeta.latestVersionId;
  }
  if (!Array.isArray(documentMeta?.versions) || documentMeta.versions.length === 0) {
    return null;
  }
  return documentMeta.versions.at(-1)?.id || null;
}

function getLatestModelVersionId(modelMeta) {
  if (typeof modelMeta?.latestVersionId === "string") {
    return modelMeta.latestVersionId;
  }
  if (!Array.isArray(modelMeta?.versions) || modelMeta.versions.length === 0) {
    return null;
  }
  return modelMeta.versions.at(-1)?.id || null;
}

function getDocumentLabel(documentMeta, versionId) {
  const versions = Array.isArray(documentMeta?.versions)
    ? documentMeta.versions
    : [];
  const matchedVersion =
    versions.find((version) => version?.id === versionId) || versions.at(-1);
  return (
    matchedVersion?.name ||
    documentMeta?.name ||
    documentMeta?.id ||
    versionId ||
    "Document"
  );
}

function getModelLabel(modelMeta, versionId) {
  const versions = Array.isArray(modelMeta?.versions) ? modelMeta.versions : [];
  const matchedVersion =
    versions.find((version) => version?.id === versionId) || versions.at(-1);
  return (
    modelMeta?.name ||
    matchedVersion?.name ||
    modelMeta?.id ||
    versionId ||
    "Model"
  );
}

function getLastDocumentVersionId(modelMeta) {
  if (!Array.isArray(modelMeta?.documentVersionIds)) {
    return null;
  }
  for (let index = modelMeta.documentVersionIds.length - 1; index >= 0; index -= 1) {
    const versionId = modelMeta.documentVersionIds[index];
    if (typeof versionId === "string" && versionId.trim()) {
      return versionId;
    }
  }
  return null;
}

class ProjectGraphStore extends Store {
  constructor() {
    super({
      elements: [],
    });
  }

  init(documents, models) {
    const nodes = [];
    const documentNodeIds = new Set();
    const documentVersionIdByDocumentId = new Map();

    documents.forEach((doc) => {
      const documentId = doc?.id;
      const documentVersionId = getLatestDocumentVersionId(doc);
      const nodeId = toCyNodeId(documentVersionId, DOCUMENT_NODE_NAMESPACE);
      if (!nodeId) {
        console.warn(
          "[projectGraphStore] Skipping document node with invalid versionId:",
          doc,
        );
        return;
      }

      if (typeof documentId === "string" && documentId.trim()) {
        documentVersionIdByDocumentId.set(documentId, documentVersionId);
      }
      documentNodeIds.add(nodeId);
      nodes.push({
        group: "nodes",
        data: {
          id: nodeId,
          type: "document",
          label: getDocumentLabel(doc, documentVersionId),
          degree: 1,
          documentId,
          versionId: documentVersionId,
        },
      });
    });

    const edges = [];
    models.forEach((model) => {
      const modelId = model?.id;
      const modelVersionId = getLatestModelVersionId(model);
      const modelNodeId = toCyNodeId(modelVersionId, MODEL_NODE_NAMESPACE);
      if (!modelNodeId) {
        console.warn(
          "[projectGraphStore] Skipping model node with invalid versionId:",
          model,
        );
        return;
      }

      nodes.push({
        group: "nodes",
        data: {
          id: modelNodeId,
          type: "model",
          label: getModelLabel(model, modelVersionId),
          degree: 1,
          modelId,
          versionId: modelVersionId,
          documentId: model?.documentId || null,
        },
      });

      const sourceDocumentVersionId =
        documentVersionIdByDocumentId.get(model?.documentId) ||
        getLastDocumentVersionId(model);
      const sourceNodeId = toCyNodeId(
        sourceDocumentVersionId,
        DOCUMENT_NODE_NAMESPACE,
      );
      if (!sourceNodeId || !documentNodeIds.has(sourceNodeId)) {
        console.warn(
          `[projectGraphStore] Skipping edge for model "${modelId}" with missing or unknown document version:`,
          {
            documentId: model?.documentId,
            documentVersionId: sourceDocumentVersionId,
          },
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
  }

  getElements() {
    return this.state.elements;
  }

  addDocumentNode(document) {
    const documentId = document?.id;
    const documentVersionId = getLatestDocumentVersionId(document);
    const nodeId = toCyNodeId(documentVersionId, DOCUMENT_NODE_NAMESPACE);
    if (!nodeId) {
      console.warn(
        "[projectGraphStore] Skipping document node with invalid versionId:",
        document,
      );
      return;
    }

    const node = {
      group: "nodes",
      data: {
        id: nodeId,
        type: "document",
        label: getDocumentLabel(document, documentVersionId),
        degree: 1,
        documentId,
        versionId: documentVersionId,
      },
    };
    this.state.elements.push(node);
    this.notify({
      key: "elements.documentNode",
      operation: "add",
      value: node,
    });
  }

  addModelNodeAndEdge(modelMeta, documentId) {
    const modelId = modelMeta?.id;
    const modelVersionId = getLatestModelVersionId(modelMeta);
    const modelNodeId = toCyNodeId(modelVersionId, MODEL_NODE_NAMESPACE);
    if (!modelNodeId) {
      console.warn(
        "[projectGraphStore] Skipping model node with invalid versionId:",
        modelMeta,
      );
      return;
    }

    const modelNode = {
      group: "nodes",
      data: {
        id: modelNodeId,
        type: "model",
        label: getModelLabel(modelMeta, modelVersionId),
        degree: 1,
        modelId,
        versionId: modelVersionId,
        documentId: modelMeta?.documentId || documentId || null,
      },
    };

    const sourceDocumentNodeIdByDocumentId = this.state.elements.find(
      (element) =>
        isNodeElement(element) &&
        element?.data?.type === "document" &&
        element?.data?.documentId === documentId,
    )?.data?.id;
    const sourceDocumentVersionId = sourceDocumentNodeIdByDocumentId
      ? null
      : getLastDocumentVersionId(modelMeta);
    const sourceNodeId =
      sourceDocumentNodeIdByDocumentId ||
      toCyNodeId(sourceDocumentVersionId, DOCUMENT_NODE_NAMESPACE);
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
          documentId,
          documentVersionId: sourceDocumentVersionId,
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
