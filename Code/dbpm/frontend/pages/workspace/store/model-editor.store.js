import { Store } from "../../../shared/utils/store.js";
import { updateDbpmTextSelectionsInXmlNode } from "../../../modules/workflow/utils/dbpm-model-xml.js";

const CPEE_DESCRIPTION_NS = "http://cpee.org/ns/description/1.0";
const DBPM_NS = "https://example.com/dbpm";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

function getDirectElementChildren(node) {
  return Array.from(node?.children || []);
}

function getDescriptionChildren(node) {
  return getDirectElementChildren(node).filter(
    (child) => child?.localName === "description",
  );
}

function isWrapperDescriptionNode(node) {
  if (!node || node.localName !== "description") {
    return false;
  }
  const hasDbpmInfo = getDirectElementChildren(node).some(
    (child) => child?.namespaceURI === DBPM_NS && child?.localName === "info",
  );
  return hasDbpmInfo || getDescriptionChildren(node).length > 0;
}

function ensureCpeeDescriptionNamespace(node) {
  if (!node || node.localName !== "description") {
    return;
  }
  if (!node.namespaceURI && !node.getAttribute("xmlns")) {
    node.setAttributeNS(XMLNS_NS, "xmlns", CPEE_DESCRIPTION_NS);
  }
}

function wrapProcessDescriptionNode(processNode) {
  const wrappedDoc = document.implementation.createDocument(
    null,
    "description",
    null,
  );
  wrappedDoc.documentElement.setAttributeNS(XMLNS_NS, "xmlns:dbpm", DBPM_NS);
  const imported = wrappedDoc.importNode(processNode, true);
  ensureCpeeDescriptionNamespace(imported);
  wrappedDoc.documentElement.appendChild(imported);
  return wrappedDoc.documentElement;
}

function normalizeEditorDataRoot(rootNode) {
  if (!rootNode) {
    return null;
  }

  if (rootNode.localName !== "description") {
    return wrapProcessDescriptionNode(rootNode);
  }

  if (rootNode.namespaceURI === CPEE_DESCRIPTION_NS) {
    return wrapProcessDescriptionNode(rootNode);
  }

  if (isWrapperDescriptionNode(rootNode)) {
    const processDescription = getDescriptionChildren(rootNode).find(
      (node) =>
        node.namespaceURI === CPEE_DESCRIPTION_NS ||
        node.namespaceURI !== DBPM_NS,
    );
    if (processDescription) {
      ensureCpeeDescriptionNamespace(processDescription);
    } else {
      const fallbackProcessDescription = rootNode.ownerDocument.createElementNS(
        CPEE_DESCRIPTION_NS,
        "description",
      );
      rootNode.appendChild(fallbackProcessDescription);
    }
    return rootNode;
  }

  return wrapProcessDescriptionNode(rootNode);
}

function parseDataToRootNode(data) {
  if (!data) {
    return null;
  }
  if (typeof data === "string") {
    return $.parseXML(data).documentElement;
  }
  if (data.nodeType === 9) {
    return data.documentElement || null;
  }
  if (data.nodeType === 1) {
    return data;
  }
  throw new Error("Unsupported model data type for setData");
}

function findProcessDescriptionNode(rootNode) {
  if (!rootNode) {
    return null;
  }
  if (
    rootNode.localName === "description" &&
    rootNode.namespaceURI === CPEE_DESCRIPTION_NS
  ) {
    return rootNode;
  }

  const directDescriptions = getDescriptionChildren(rootNode);
  if (directDescriptions.length > 0) {
    return (
      directDescriptions.find(
        (node) => node.namespaceURI === CPEE_DESCRIPTION_NS,
      ) ||
      directDescriptions.find((node) => node.namespaceURI !== DBPM_NS) ||
      directDescriptions[0]
    );
  }

  const namespaced = rootNode.getElementsByTagNameNS?.(
    CPEE_DESCRIPTION_NS,
    "description",
  )?.[0];
  if (namespaced) {
    return namespaced;
  }

  return $("description", rootNode)[0] || null;
}

class ModelEditorStore extends Store {
  constructor() {
    super({
      status: null, // 'loading', 'ready', 'error', 'generating'
      error: null,
      statusMessage: null,
      data: null,
      latestUpdateType: null, // 'initial_load', 'regeneration_by_prompt', 'regeneration_by_selection', 'update_by_selection'
    });
  }

  getSerializedRpstData() {
    const data = this.state.data;
    if (!data) {
      console.warn("No active model data available.");
      return null;
    }

    const rpstElement = findProcessDescriptionNode(data);
    if (!rpstElement) {
      console.warn("No description element found in model data.");
      return null;
    }

    return new XMLSerializer().serializeToString(rpstElement);
  }

  getSerializedData() {
    if (!this.state.data) {
      return null;
    }
    return new XMLSerializer().serializeToString(this.state.data);
  }

  setStatus(status) {
    this.state.status = status;
    this.notify({ key: "status", newValue: status });
  }

  setError(error) {
    this.state.error = error;
    this.notify({ key: "error", newValue: error });
  }

  getStatusMessage() {
    const message = this.state.statusMessage;
    if (!message) {
      return null;
    }
    return { ...message };
  }

  setStatusMessage(message) {
    const oldValue = this.getStatusMessage();
    this.state.statusMessage = message;
    this.notify({
      key: "statusMessage",
      oldValue,
      newValue: this.getStatusMessage(),
    });
  }

  clearStatusMessage() {
    this.setStatusMessage(null);
  }

  getLatestUpdateType() {
    return this.state.latestUpdateType;
  }

  setLatestUpdateType(updateType) {
    const oldValue = this.state.latestUpdateType;
    if (oldValue === updateType) {
      return;
    }
    this.state.latestUpdateType = updateType;
    this.notify({
      key: "latestUpdateType",
      oldValue,
      newValue: updateType,
    });
  }

  setData(data, options = {}) {
    const hasUpdateType = Object.prototype.hasOwnProperty.call(
      options,
      "updateType",
    );

    let parsedData = null;
    try {
      parsedData = parseDataToRootNode(data);
      parsedData = normalizeEditorDataRoot(parsedData);
    } catch (error) {
      console.error("Failed to parse model data XML:", error);
      this.setError(error?.message || "Failed to parse model data XML");
      return;
    }

    this.setError(null);

    if (hasUpdateType) {
      this.setLatestUpdateType(options.updateType);
    }

    const oldData = this.state.data;

    this.state.data = parsedData;
    this.notify({
      key: "data",
      oldValue: oldData,
      newValue: parsedData,
    });
  }

  updateModelDbpmTextSelections(selectedText, meta = {}) {
    const data = this.state.data;
    if (!data) {
      return;
    }

    updateDbpmTextSelectionsInXmlNode(data, selectedText, meta);
  }
}

export default new ModelEditorStore();
