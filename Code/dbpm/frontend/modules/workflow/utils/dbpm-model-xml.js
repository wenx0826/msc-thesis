const DBPM_NS = "https://example.com/dbpm";
const CPEE_DESCRIPTION_NS = "http://cpee.org/ns/description/1.0";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

function findDbpmChild(parent, localName) {
  return (
    Array.from(parent?.children || []).find(
      (node) => node.namespaceURI === DBPM_NS && node.localName === localName,
    ) || null
  );
}

function createDbpmElement(doc, localName, value = null) {
  const node = doc.createElementNS(DBPM_NS, `dbpm:${localName}`);
  if (value !== null) {
    node.textContent = value ?? "";
  }
  return node;
}

function upsertDbpmTextNode(doc, parent, localName, value) {
  let node = findDbpmChild(parent, localName);
  if (!node) {
    node = createDbpmElement(doc, localName);
    parent.appendChild(node);
  }
  node.textContent = value ?? "";
  return node;
}

function removeDbpmChild(parent, localName) {
  const node = findDbpmChild(parent, localName);
  if (node) {
    parent.removeChild(node);
  }
}

function setOptionalDbpmTextNode(doc, parent, localName, value) {
  const normalizedValue =
    typeof value === "string" ? value : value === null ? null : String(value);
  if (normalizedValue === null || normalizedValue === "") {
    removeDbpmChild(parent, localName);
    return null;
  }
  return upsertDbpmTextNode(doc, parent, localName, normalizedValue);
}

function getPayloadNodes(sourceRoot) {
  if (!sourceRoot) {
    return [];
  }

  if (
    sourceRoot.localName === "description" &&
    sourceRoot.namespaceURI !== CPEE_DESCRIPTION_NS
  ) {
    return Array.from(sourceRoot.children || []).filter(
      (node) => !(node.namespaceURI === DBPM_NS && node.localName === "info"),
    );
  }

  return [sourceRoot];
}

function appendPayloadNodes(targetDoc, targetRoot, payloadNodes) {
  if (!Array.isArray(payloadNodes) || payloadNodes.length === 0) {
    targetRoot.appendChild(
      targetDoc.createElementNS(CPEE_DESCRIPTION_NS, "description"),
    );
    return;
  }

  payloadNodes.forEach((node) => {
    const importedNode = targetDoc.importNode(node, true);
    if (
      importedNode.localName === "description" &&
      !importedNode.namespaceURI &&
      !importedNode.getAttribute("xmlns")
    ) {
      importedNode.setAttributeNS(XMLNS_NS, "xmlns", CPEE_DESCRIPTION_NS);
    }
    targetRoot.appendChild(importedNode);
  });
}

function ensureDbpmPath(descriptionNode) {
  const doc = descriptionNode.ownerDocument;
  descriptionNode.setAttributeNS(XMLNS_NS, "xmlns:dbpm", DBPM_NS);

  let dbpmInfo = findDbpmChild(descriptionNode, "info");
  if (!dbpmInfo) {
    dbpmInfo = createDbpmElement(doc, "info");
    descriptionNode.insertBefore(dbpmInfo, descriptionNode.firstChild);
  }

  let documentInfo = findDbpmChild(dbpmInfo, "document_info");
  if (!documentInfo) {
    documentInfo = createDbpmElement(doc, "document_info");
    dbpmInfo.appendChild(documentInfo);
  }

  return { dbpmInfo, documentInfo };
}

function upsertDbpmDocumentInfo(documentInfoNode, meta = {}) {
  const doc = documentInfoNode?.ownerDocument;
  if (!doc || !documentInfoNode) {
    return;
  }

  if (typeof meta.documentId === "string") {
    upsertDbpmTextNode(doc, documentInfoNode, "document_id", meta.documentId);
  }
  if (typeof meta.documentVersionId === "string") {
    upsertDbpmTextNode(
      doc,
      documentInfoNode,
      "document_version_id",
      meta.documentVersionId,
    );
  }
  if (typeof meta.documentVersionName === "string") {
    upsertDbpmTextNode(
      doc,
      documentInfoNode,
      "document_version_name",
      meta.documentVersionName,
    );
  }
}

function normalizeToWrappedDescription(parsedData) {
  const sourceRoot = parsedData.documentElement;
  if (!sourceRoot) {
    throw new Error("Model data XML has no root element.");
  }

  const isOuterDescription =
    sourceRoot.localName === "description" &&
    sourceRoot.namespaceURI !== CPEE_DESCRIPTION_NS;

  if (isOuterDescription) {
    sourceRoot.setAttributeNS(XMLNS_NS, "xmlns:dbpm", DBPM_NS);
    return sourceRoot;
  }

  const wrappedDoc = document.implementation.createDocument(
    null,
    "description",
    null,
  );
  const wrapperNode = wrappedDoc.documentElement;
  wrapperNode.setAttributeNS(XMLNS_NS, "xmlns:dbpm", DBPM_NS);
  appendPayloadNodes(wrappedDoc, wrapperNode, [sourceRoot]);
  return wrapperNode;
}

export function injectDbpmData(modelData, meta = {}) {
  if (typeof modelData !== "string" || !modelData.trim()) {
    throw new Error("Model data must be a non-empty XML string.");
  }

  const {
    documentId = "",
    documentVersionId = "",
    documentVersionName = "",
    selectedText = "",
    prompt = "",
  } = meta;

  const parser = new DOMParser();
  const parsedData = parser.parseFromString(modelData, "application/xml");
  const parseError = parsedData.getElementsByTagName("parsererror")[0];
  if (parseError) {
    throw new Error("Invalid XML: " + parseError.textContent);
  }

  const sourceRoot = parsedData.documentElement;
  if (!sourceRoot) {
    throw new Error("Model data XML has no root element.");
  }

  const wrappedDoc = document.implementation.createDocument(
    null,
    "description",
    null,
  );
  const wrapperNode = wrappedDoc.documentElement;
  wrapperNode.setAttributeNS(XMLNS_NS, "xmlns:dbpm", DBPM_NS);

  const dbpmInfoNode = createDbpmElement(wrappedDoc, "info");
  const documentInfoNode = createDbpmElement(wrappedDoc, "document_info");
  documentInfoNode.appendChild(
    createDbpmElement(wrappedDoc, "document_id", documentId),
  );
  documentInfoNode.appendChild(
    createDbpmElement(wrappedDoc, "document_version_id", documentVersionId),
  );
  if (documentVersionName) {
    documentInfoNode.appendChild(
      createDbpmElement(
        wrappedDoc,
        "document_version_name",
        documentVersionName,
      ),
    );
  }
  documentInfoNode.appendChild(
    createDbpmElement(wrappedDoc, "text_selections", selectedText),
  );
  if (typeof prompt === "string" && prompt !== "") {
    documentInfoNode.appendChild(
      createDbpmElement(wrappedDoc, "prompt", prompt),
    );
  }
  dbpmInfoNode.appendChild(documentInfoNode);
  wrapperNode.appendChild(dbpmInfoNode);

  appendPayloadNodes(wrappedDoc, wrapperNode, getPayloadNodes(sourceRoot));

  return $(wrappedDoc.documentElement).serializePrettyXML();
}

export function updateDbpmTextSelections(modelData, selectedText, meta = {}) {
  if (typeof modelData !== "string" || !modelData.trim()) {
    throw new Error("Model data must be a non-empty XML string.");
  }

  const parser = new DOMParser();
  const parsedData = parser.parseFromString(modelData, "application/xml");
  const parseError = parsedData.getElementsByTagName("parsererror")[0];
  if (parseError) {
    throw new Error("Invalid XML: " + parseError.textContent);
  }

  const descriptionNode = normalizeToWrappedDescription(parsedData);
  const { documentInfo } = ensureDbpmPath(descriptionNode);
  upsertDbpmDocumentInfo(documentInfo, meta);
  upsertDbpmTextNode(
    descriptionNode.ownerDocument,
    documentInfo,
    "text_selections",
    selectedText,
  );
  if (Object.prototype.hasOwnProperty.call(meta, "prompt")) {
    setOptionalDbpmTextNode(
      descriptionNode.ownerDocument,
      documentInfo,
      "prompt",
      meta.prompt,
    );
  }

  return $(descriptionNode).serializePrettyXML();
}

export function updateDbpmTextSelectionsInXmlNode(
  rootNode,
  selectedText,
  meta = {},
) {
  if (!rootNode) {
    return;
  }

  const descriptionNode =
    rootNode.nodeType === 9 ? rootNode.documentElement : rootNode;
  if (!descriptionNode || descriptionNode.localName !== "description") {
    return;
  }

  const { documentInfo } = ensureDbpmPath(descriptionNode);
  upsertDbpmDocumentInfo(documentInfo, meta);
  upsertDbpmTextNode(
    descriptionNode.ownerDocument,
    documentInfo,
    "text_selections",
    selectedText,
  );
  if (Object.prototype.hasOwnProperty.call(meta, "prompt")) {
    setOptionalDbpmTextNode(
      descriptionNode.ownerDocument,
      documentInfo,
      "prompt",
      meta.prompt,
    );
  }
}
